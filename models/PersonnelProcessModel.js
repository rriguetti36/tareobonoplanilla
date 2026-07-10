const { poolPromise, sql } = require('../config/db');

const fields = `p.id,p.companyId,p.collaboratorId,p.processType,p.incidentTypeId,p.contractTemplateId,p.relatedProcessId,
 p.employmentTypeId,p.contractNumber,p.eventDate,p.startDate,p.endDate,p.days,p.isPaid,
 p.reason,p.description,p.decisionNotes,p.generatedPdfPath,p.signedPdfPath,p.documentStatus,p.status,p.createdBy,p.approvedBy,p.approvedAt,p.estado,
 p.createdAt,p.updatedAt,c.employeeCode,c.firstName,c.lastName,pos.name positionName,et.name employmentTypeName,it.name incidentTypeName,
 creator.name createdByName,approver.name approvedByName,ct.name contractTemplateName`;

class PersonnelProcessModel {
  static async getAll(companyId, processType) {
    const pool = await poolPromise;
    const result = await pool.request().input('companyId', sql.Int, companyId)
      .input('processType', sql.NVarChar(30), processType).query(`
        SELECT ${fields} FROM dbo.PersonnelProcesses p
        INNER JOIN dbo.Collaborators c ON c.id=p.collaboratorId
        LEFT JOIN dbo.Positions pos ON pos.id=c.positionId
        LEFT JOIN dbo.EmploymentTypes et ON et.id=p.employmentTypeId
        LEFT JOIN dbo.IncidentTypes it ON it.id=p.incidentTypeId
        LEFT JOIN dbo.ContractTemplates ct ON ct.id=p.contractTemplateId
        INNER JOIN dbo.Users creator ON creator.id=p.createdBy
        LEFT JOIN dbo.Users approver ON approver.id=p.approvedBy
        WHERE p.companyId=@companyId AND p.processType=@processType
        ORDER BY COALESCE(p.eventDate,p.startDate,p.createdAt) DESC,p.id DESC`);
    return result.recordset;
  }
  static async getById(id, companyId) {
    const pool = await poolPromise;
    const result = await pool.request().input('id', sql.Int, id).input('companyId', sql.Int, companyId).query(`
      SELECT ${fields} FROM dbo.PersonnelProcesses p
      INNER JOIN dbo.Collaborators c ON c.id=p.collaboratorId
      LEFT JOIN dbo.Positions pos ON pos.id=c.positionId
      LEFT JOIN dbo.EmploymentTypes et ON et.id=p.employmentTypeId
      LEFT JOIN dbo.IncidentTypes it ON it.id=p.incidentTypeId
      LEFT JOIN dbo.ContractTemplates ct ON ct.id=p.contractTemplateId
      INNER JOIN dbo.Users creator ON creator.id=p.createdBy
      LEFT JOIN dbo.Users approver ON approver.id=p.approvedBy
      WHERE p.id=@id AND p.companyId=@companyId`);
    return result.recordset[0];
  }
  static bind(request, data) {
    return request.input('collaboratorId',sql.Int,data.collaboratorId).input('processType',sql.NVarChar(30),data.processType)
      .input('incidentTypeId',sql.Int,data.incidentTypeId||null)
      .input('contractTemplateId',sql.Int,data.contractTemplateId||null)
      .input('relatedProcessId',sql.Int,data.relatedProcessId||null).input('employmentTypeId',sql.Int,data.employmentTypeId||null)
      .input('contractNumber',sql.NVarChar(50),data.contractNumber||null).input('eventDate',sql.Date,data.eventDate||null)
      .input('startDate',sql.Date,data.startDate||null).input('endDate',sql.Date,data.endDate||null)
      .input('days',sql.Decimal(6,2),data.days===''||data.days==null?null:Number(data.days)).input('isPaid',sql.Bit,data.isPaid==null?null:data.isPaid)
      .input('reason',sql.NVarChar(200),data.reason||null).input('description',sql.NVarChar(1000),data.description||null)
      .input('decisionNotes',sql.NVarChar(500),data.decisionNotes||null)
      .input('status',sql.NVarChar(20),data.status).input('approvedBy',sql.Int,data.approvedBy||null)
      .input('approvedAt',sql.DateTime2,data.approvedAt||null).input('estado',sql.Bit,data.estado??1);
  }
  static async create(companyId, userId, data) {
    const pool=await poolPromise; const request=this.bind(pool.request().input('companyId',sql.Int,companyId).input('createdBy',sql.Int,userId),data);
    const result=await request.query(`INSERT dbo.PersonnelProcesses(companyId,collaboratorId,processType,incidentTypeId,contractTemplateId,relatedProcessId,employmentTypeId,contractNumber,eventDate,startDate,endDate,days,isPaid,reason,description,decisionNotes,documentStatus,status,createdBy,approvedBy,approvedAt,estado) OUTPUT INSERTED.id VALUES(@companyId,@collaboratorId,@processType,@incidentTypeId,@contractTemplateId,@relatedProcessId,@employmentTypeId,@contractNumber,@eventDate,@startDate,@endDate,@days,@isPaid,@reason,@description,@decisionNotes,CASE WHEN @processType=N'contract' THEN N'pending_signature' ELSE NULL END,@status,@createdBy,@approvedBy,@approvedAt,@estado)`);
    return this.getById(result.recordset[0].id,companyId);
  }
  static async update(id,companyId,data){const pool=await poolPromise;const request=this.bind(pool.request().input('id',sql.Int,id).input('companyId',sql.Int,companyId),data);await request.query(`UPDATE dbo.PersonnelProcesses SET collaboratorId=@collaboratorId,incidentTypeId=@incidentTypeId,contractTemplateId=@contractTemplateId,relatedProcessId=@relatedProcessId,employmentTypeId=@employmentTypeId,contractNumber=@contractNumber,eventDate=@eventDate,startDate=@startDate,endDate=@endDate,days=@days,isPaid=@isPaid,reason=@reason,description=@description,decisionNotes=@decisionNotes,status=@status,approvedBy=@approvedBy,approvedAt=@approvedAt,estado=@estado,updatedAt=SYSUTCDATETIME() WHERE id=@id AND companyId=@companyId`);return this.getById(id,companyId)}

  static async getContractData(id,companyId){const pool=await poolPromise;const r=await pool.request().input('id',sql.Int,id).input('companyId',sql.Int,companyId).query(`SELECT p.*,c.userId collaboratorUserId,c.firstName,c.lastName,c.documentType,c.documentNumber,c.employeeCode,pos.name positionName,et.name employmentTypeName,co.businessName companyBusinessName,co.tradeName companyTradeName,co.taxId companyTaxId,t.name templateName,t.title templateTitle,t.bodyText,t.footerText FROM dbo.PersonnelProcesses p JOIN dbo.Collaborators c ON c.id=p.collaboratorId JOIN dbo.Positions pos ON pos.id=c.positionId JOIN dbo.EmploymentTypes et ON et.id=p.employmentTypeId JOIN dbo.Companies co ON co.id=p.companyId LEFT JOIN dbo.ContractTemplates t ON t.id=p.contractTemplateId WHERE p.id=@id AND p.companyId=@companyId AND p.processType=N'contract'`);return r.recordset[0]}
  static async setGeneratedPdf(id,companyId,path){const pool=await poolPromise;await pool.request().input('id',sql.Int,id).input('companyId',sql.Int,companyId).input('path',sql.NVarChar(500),path).query(`UPDATE dbo.PersonnelProcesses SET generatedPdfPath=@path,documentStatus=N'pending_signature',updatedAt=SYSUTCDATETIME() WHERE id=@id AND companyId=@companyId AND documentStatus<>N'signed'`)}
  static async setSignedPdf(id,companyId,path){const pool=await poolPromise;await pool.request().input('id',sql.Int,id).input('companyId',sql.Int,companyId).input('path',sql.NVarChar(500),path).query(`UPDATE dbo.PersonnelProcesses SET signedPdfPath=@path,documentStatus=N'pending_signature',updatedAt=SYSUTCDATETIME() WHERE id=@id AND companyId=@companyId AND documentStatus<>N'signed'`)}
  static async confirmContractSigned(id,companyId){const pool=await poolPromise;await pool.request().input('id',sql.Int,id).input('companyId',sql.Int,companyId).query(`UPDATE dbo.PersonnelProcesses SET documentStatus=N'signed',updatedAt=SYSUTCDATETIME() WHERE id=@id AND companyId=@companyId AND processType=N'contract' AND signedPdfPath IS NOT NULL AND documentStatus=N'pending_signature'`);return this.getById(id,companyId)}
  static async getContractsByUser(userId,companyId){const pool=await poolPromise;const r=await pool.request().input('userId',sql.Int,userId).input('companyId',sql.Int,companyId).query(`SELECT p.id,p.contractNumber,p.startDate,p.endDate,p.documentStatus,p.generatedPdfPath,p.signedPdfPath,t.name contractTemplateName,et.name employmentTypeName FROM dbo.PersonnelProcesses p JOIN dbo.Collaborators c ON c.id=p.collaboratorId LEFT JOIN dbo.ContractTemplates t ON t.id=p.contractTemplateId LEFT JOIN dbo.EmploymentTypes et ON et.id=p.employmentTypeId WHERE p.companyId=@companyId AND p.processType=N'contract' AND c.userId=@userId ORDER BY p.startDate DESC,p.id DESC`);return r.recordset}

  static async hasPending(companyId, collaboratorId, processType, excludeId = null) {
    const pool = await poolPromise;
    const result = await pool.request().input('companyId', sql.Int, companyId)
      .input('collaboratorId', sql.Int, collaboratorId).input('processType', sql.NVarChar(30), processType)
      .input('excludeId', sql.Int, excludeId).query(`SELECT TOP 1 id FROM dbo.PersonnelProcesses
        WHERE companyId=@companyId AND collaboratorId=@collaboratorId AND processType=@processType
          AND status=N'pending' AND (@excludeId IS NULL OR id<>@excludeId)`);
    return Boolean(result.recordset[0]);
  }

  static async hasApprovedHire(companyId,collaboratorId){const pool=await poolPromise;const r=await pool.request().input('companyId',sql.Int,companyId).input('collaboratorId',sql.Int,collaboratorId).query(`SELECT TOP 1 id FROM dbo.PersonnelProcesses WHERE companyId=@companyId AND collaboratorId=@collaboratorId AND processType=N'hire' AND status=N'approved'`);return Boolean(r.recordset[0])}

  static async decide(id, companyId, adminId, decision, decisionNotes) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const request = new sql.Request(transaction)
        .input('id', sql.Int, id).input('companyId', sql.Int, companyId)
        .input('adminId', sql.Int, adminId).input('decision', sql.NVarChar(20), decision)
        .input('decisionNotes', sql.NVarChar(500), decisionNotes || null);
      const updated = await request.query(`UPDATE dbo.PersonnelProcesses
        SET status=@decision,approvedBy=@adminId,approvedAt=SYSUTCDATETIME(),decisionNotes=@decisionNotes,updatedAt=SYSUTCDATETIME()
        OUTPUT INSERTED.collaboratorId,INSERTED.processType,INSERTED.eventDate
        WHERE id=@id AND companyId=@companyId AND status=N'pending'`);
      if (!updated.recordset[0]) throw Object.assign(new Error('La solicitud ya fue procesada o no existe'), { status: 409 });
      const process = updated.recordset[0];
      if (decision === 'approved') {
        const effect = new sql.Request(transaction)
          .input('companyId', sql.Int, companyId).input('collaboratorId', sql.Int, process.collaboratorId)
          .input('eventDate', sql.Date, process.eventDate);
        if (process.processType === 'hire') {
          await effect.query(`UPDATE dbo.Collaborators SET estado=1,laborStatus=N'active',startDate=@eventDate,endDate=NULL,updatedAt=SYSUTCDATETIME()
            WHERE id=@collaboratorId AND companyId=@companyId;
            UPDATE u SET u.estado=1 FROM dbo.Users u INNER JOIN dbo.Collaborators c ON c.userId=u.id
            WHERE c.id=@collaboratorId AND c.companyId=@companyId;`);
        } else if (process.processType === 'termination') {
          await effect.query(`UPDATE dbo.Collaborators SET estado=0,laborStatus=N'terminated',endDate=@eventDate,updatedAt=SYSUTCDATETIME()
            WHERE id=@collaboratorId AND companyId=@companyId;
            UPDATE dbo.CollaboratorAssignments SET endDate=CASE WHEN startDate>@eventDate THEN startDate ELSE @eventDate END,estado=0
            WHERE collaboratorId=@collaboratorId AND companyId=@companyId AND estado=1 AND endDate IS NULL;
            UPDATE u SET u.estado=0 FROM dbo.Users u INNER JOIN dbo.Collaborators c ON c.userId=u.id
            WHERE c.id=@collaboratorId AND c.companyId=@companyId;`);
        }
      }
      await transaction.commit();
      return this.getById(id, companyId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
module.exports=PersonnelProcessModel;
