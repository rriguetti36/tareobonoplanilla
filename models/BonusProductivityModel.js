const { poolPromise, sql } = require('../config/db')

class BonusProductivityModel {
  static async list(companyId, filters = {}) {
    const pool = await poolPromise
    const r = await pool.request()
      .input('companyId', sql.Int, companyId)
      .input('from', sql.Date, filters.from || null)
      .input('to', sql.Date, filters.to || null)
      .input('siteId', sql.Int, filters.siteId ? Number(filters.siteId) : null)
      .input('workTableId', sql.Int, filters.workTableId ? Number(filters.workTableId) : null)
      .query(`
        SELECT b.*, COALESCE(cl.tradeName,cl.businessName) clientName, s.name siteName, ar.name areaName,
          sh.name shiftName, wt.name workTableName, u.name createdByName,
          DATEDIFF(MINUTE,b.startedAt,b.endedAt) workedMinutes,
          people.peopleCount,
          CAST(CASE WHEN DATEDIFF(MINUTE,b.startedAt,b.endedAt) > 0 THEN b.unitsTagged * 60.0 / DATEDIFF(MINUTE,b.startedAt,b.endedAt) ELSE 0 END AS DECIMAL(12,2)) unitsPerHour,
          CAST(CASE WHEN DATEDIFF(MINUTE,b.startedAt,b.endedAt) > 0 AND ISNULL(people.peopleCount,0) > 0 THEN b.unitsTagged * 60.0 / DATEDIFF(MINUTE,b.startedAt,b.endedAt) / people.peopleCount ELSE 0 END AS DECIMAL(12,2)) unitsPerLaborHour,
          CAST(CASE WHEN b.unitsTagged > 0 THEN (b.unitsTagged - b.unitsRejected) * 100.0 / b.unitsTagged ELSE 0 END AS DECIMAL(6,2)) qualityPercent
        FROM dbo.BonusProductivityBatches b
        INNER JOIN dbo.Clients cl ON cl.id=b.clientId
        INNER JOIN dbo.Sites s ON s.id=b.siteId
        LEFT JOIN dbo.Areas ar ON ar.id=b.areaId
        INNER JOIN dbo.Shifts sh ON sh.id=b.shiftId
        INNER JOIN dbo.WorkTables wt ON wt.id=b.workTableId
        INNER JOIN dbo.Users u ON u.id=b.createdBy
        OUTER APPLY (
          SELECT COUNT(DISTINCT ca.collaboratorId) peopleCount
          FROM dbo.CollaboratorAssignments ca
          INNER JOIN dbo.Collaborators co ON co.id=ca.collaboratorId AND co.estado=1 AND co.laborStatus=N'active'
          WHERE ca.companyId=b.companyId AND ca.workTableId=b.workTableId AND ca.estado=1
            AND ca.startDate<=b.workDate AND (ca.endDate IS NULL OR ca.endDate>=b.workDate)
        ) people
        WHERE b.companyId=@companyId
          AND (@from IS NULL OR b.workDate>=@from)
          AND (@to IS NULL OR b.workDate<=@to)
          AND (@siteId IS NULL OR b.siteId=@siteId)
          AND (@workTableId IS NULL OR b.workTableId=@workTableId)
        ORDER BY b.workDate DESC,b.id DESC
      `)
    return r.recordset
  }

  static async create(companyId, userId, data) {
    const pool = await poolPromise
    const r = await pool.request()
      .input('companyId', sql.Int, companyId)
      .input('clientId', sql.Int, data.clientId)
      .input('siteId', sql.Int, data.siteId)
      .input('areaId', sql.Int, data.areaId || null)
      .input('shiftId', sql.Int, data.shiftId)
      .input('workTableId', sql.Int, data.workTableId)
      .input('workDate', sql.Date, data.workDate)
      .input('palletCode', sql.NVarChar(80), data.palletCode || null)
      .input('lotCode', sql.NVarChar(80), data.lotCode || null)
      .input('boxesReceived', sql.Int, data.boxesReceived || 0)
      .input('boxesProcessed', sql.Int, data.boxesProcessed || 0)
      .input('unitsTagged', sql.Int, data.unitsTagged || 0)
      .input('unitsRejected', sql.Int, data.unitsRejected || 0)
      .input('startedAt', sql.DateTime2, data.startedAt)
      .input('endedAt', sql.DateTime2, data.endedAt)
      .input('notes', sql.NVarChar(500), data.notes || null)
      .input('userId', sql.Int, userId)
      .query(`
        INSERT dbo.BonusProductivityBatches(companyId,clientId,siteId,areaId,shiftId,workTableId,workDate,palletCode,lotCode,boxesReceived,boxesProcessed,unitsTagged,unitsRejected,startedAt,endedAt,notes,createdBy)
        OUTPUT INSERTED.*
        VALUES(@companyId,@clientId,@siteId,@areaId,@shiftId,@workTableId,@workDate,@palletCode,@lotCode,@boxesReceived,@boxesProcessed,@unitsTagged,@unitsRejected,@startedAt,@endedAt,@notes,@userId)
      `)
    return r.recordset[0]
  }

  static async detail(id, companyId) {
    const pool = await poolPromise
    const r = await pool.request().input('id', sql.Int, id).input('companyId', sql.Int, companyId).query(`
      SELECT b.*, COALESCE(cl.tradeName,cl.businessName) clientName, s.name siteName, ar.name areaName, sh.name shiftName, wt.name workTableName
      FROM dbo.BonusProductivityBatches b
      INNER JOIN dbo.Clients cl ON cl.id=b.clientId
      INNER JOIN dbo.Sites s ON s.id=b.siteId
      LEFT JOIN dbo.Areas ar ON ar.id=b.areaId
      INNER JOIN dbo.Shifts sh ON sh.id=b.shiftId
      INNER JOIN dbo.WorkTables wt ON wt.id=b.workTableId
      WHERE b.id=@id AND b.companyId=@companyId;

      SELECT co.id collaboratorId,co.employeeCode,co.documentNumber,co.firstName,co.lastName,p.name positionName,
        ev.productivityScore,ev.qualityScore,ev.teamworkScore,ev.disciplineScore,ev.observation,ev.updatedAt
      FROM dbo.BonusProductivityBatches b
      INNER JOIN dbo.CollaboratorAssignments ca ON ca.companyId=b.companyId AND ca.workTableId=b.workTableId
        AND ca.estado=1 AND ca.startDate<=b.workDate AND (ca.endDate IS NULL OR ca.endDate>=b.workDate)
      INNER JOIN dbo.Collaborators co ON co.id=ca.collaboratorId AND co.estado=1 AND co.laborStatus=N'active'
      INNER JOIN dbo.Positions p ON p.id=co.positionId AND p.code=N'operario'
      LEFT JOIN dbo.BonusProductivityEvaluations ev ON ev.batchId=b.id AND ev.collaboratorId=co.id
      WHERE b.id=@id AND b.companyId=@companyId
      ORDER BY co.lastName,co.firstName;
    `)
    return { batch: r.recordsets[0][0], people: r.recordsets[1] }
  }

  static async saveEvaluation(companyId, batchId, collaboratorId, userId, data) {
    const pool = await poolPromise
    await pool.request()
      .input('companyId', sql.Int, companyId)
      .input('batchId', sql.Int, batchId)
      .input('collaboratorId', sql.Int, collaboratorId)
      .input('productivityScore', sql.Decimal(5, 2), data.productivityScore)
      .input('qualityScore', sql.Decimal(5, 2), data.qualityScore)
      .input('teamworkScore', sql.Decimal(5, 2), data.teamworkScore)
      .input('disciplineScore', sql.Decimal(5, 2), data.disciplineScore)
      .input('observation', sql.NVarChar(500), data.observation || null)
      .input('userId', sql.Int, userId)
      .query(`
        IF EXISTS(SELECT 1 FROM dbo.BonusProductivityBatches WHERE id=@batchId AND companyId=@companyId)
        BEGIN
          MERGE dbo.BonusProductivityEvaluations t
          USING(SELECT @batchId batchId,@collaboratorId collaboratorId) s
          ON t.batchId=s.batchId AND t.collaboratorId=s.collaboratorId
          WHEN MATCHED THEN UPDATE SET
            productivityScore=@productivityScore,qualityScore=@qualityScore,teamworkScore=@teamworkScore,
            disciplineScore=@disciplineScore,observation=@observation,evaluatedBy=@userId,updatedAt=SYSUTCDATETIME()
          WHEN NOT MATCHED THEN INSERT(batchId,collaboratorId,productivityScore,qualityScore,teamworkScore,disciplineScore,observation,evaluatedBy)
            VALUES(@batchId,@collaboratorId,@productivityScore,@qualityScore,@teamworkScore,@disciplineScore,@observation,@userId);
        END
      `)
    return this.detail(batchId, companyId)
  }
}

module.exports = BonusProductivityModel
