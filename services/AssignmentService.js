const AssignmentModel = require('../models/AssignmentModel')
const CollaboratorModel = require('../models/CollaboratorModel')
const ClientModel = require('../models/ClientModel')
const SiteModel = require('../models/SiteModel')
const ShiftModel = require('../models/ShiftModel')
const CatalogModel = require('../models/CatalogModel')
const peruDate = require('../utils/peruDate')

class AssignmentService {
  static getOperators(companyId) { return AssignmentModel.getPersonnel(companyId) }
  static getHistory(id, companyId) { return AssignmentModel.getHistory(id, companyId) }
  static getWorkTables(companyId) { return AssignmentModel.listWorkTables(companyId) }
  static getWorkTableBoard(companyId, user) { return AssignmentModel.getWorkTableBoard(companyId, user) }
  static getWorkTableMovements(collaboratorId, companyId) { return AssignmentModel.getWorkTableMovements(companyId, collaboratorId) }

  static async createWorkTable(data, companyId) {
    if (!data.clientId || !data.siteId || !data.name) {
      const e = new Error('Selecciona cliente, sede y nombre de mesa')
      e.status = 400
      throw e
    }
    const [client, site, area] = await Promise.all([
      ClientModel.getById(Number(data.clientId), companyId),
      SiteModel.getById(Number(data.siteId), companyId),
      data.areaId ? CatalogModel.getById('areas', companyId, Number(data.areaId)) : Promise.resolve(null),
    ])
    if (!client?.estado || !site?.estado || site.clientId !== Number(data.clientId) || (data.areaId && !area?.estado)) {
      const e = new Error('Cliente, sede o area no son validos')
      e.status = 400
      throw e
    }
    const name = String(data.name).trim()
    const code = String(data.code || name).trim().toUpperCase().replace(/\s+/g, '-').slice(0, 30)
    try {
      return await AssignmentModel.createWorkTable({ ...data, clientId: Number(data.clientId), siteId: Number(data.siteId), areaId: data.areaId ? Number(data.areaId) : null, name, code }, companyId)
    } catch (err) {
      if (err.number === 2601 || err.number === 2627) {
        const e = new Error('Ya existe una mesa con ese codigo en la sede/area')
        e.status = 409
        throw e
      }
      throw err
    }
  }

  static async assignWorkTable(data, companyId, user) {
    const assignmentIds = [...new Set((data.assignmentIds || []).map(Number).filter(Boolean))]
    if (!assignmentIds.length || !data.workTableId) {
      const e = new Error('Selecciona personal y mesa de trabajo')
      e.status = 400
      throw e
    }
    if (assignmentIds.length > 200) {
      const e = new Error('Solo se permiten 200 colaboradores por movimiento')
      e.status = 400
      throw e
    }
    const table = await AssignmentModel.getWorkTable(Number(data.workTableId), companyId)
    if (!table) {
      const e = new Error('Mesa de trabajo no encontrada')
      e.status = 404
      throw e
    }
    const board = await AssignmentModel.getWorkTableBoard(companyId, user)
    const allowed = new Set(board.map((x) => x.assignmentId))
    if (assignmentIds.some((id) => !allowed.has(id))) {
      const e = new Error('Solo puedes mover personal de tu sede y turno asignado')
      e.status = 403
      throw e
    }
    const selected = board.filter((x) => assignmentIds.includes(x.assignmentId))
    if (selected.some((x) => x.siteId !== table.siteId || (table.areaId && x.areaId !== table.areaId))) {
      const e = new Error('La mesa no pertenece a la sede/area del personal seleccionado')
      e.status = 400
      throw e
    }
    return AssignmentModel.assignWorkTable({ assignmentIds, workTableId: Number(data.workTableId), reason: data.reason }, companyId, user.id)
  }

  static async assignMany(data, companyId, userId) {
    const collaboratorIds = [...new Set((data.collaboratorIds || []).map(Number).filter(Boolean))]
    if (!collaboratorIds.length || !data.clientId || !data.siteId || !data.shiftId || !data.startDate) {
      const e = new Error('Selecciona personal, cliente, sede, turno y fecha')
      e.status = 400
      throw e
    }
    if (collaboratorIds.length > 200) {
      const e = new Error('Solo se permiten 200 colaboradores por asignacion')
      e.status = 400
      throw e
    }

    const workers = await Promise.all(collaboratorIds.map((id) => CollaboratorModel.getById(id, companyId)))
    if (workers.some((worker) => !worker || !['operario', 'supervisor'].includes(worker.positionCode))) {
      const e = new Error('La seleccion solo puede contener operarios y supervisores')
      e.status = 400
      throw e
    }

    const hasOperator = workers.some((worker) => worker.positionCode === 'operario')
    if (hasOperator && !data.areaId) {
      const e = new Error('Selecciona area para asignar operarios')
      e.status = 400
      throw e
    }

    const [client, site, area, shift] = await Promise.all([
      ClientModel.getById(Number(data.clientId), companyId),
      SiteModel.getById(Number(data.siteId), companyId),
      data.areaId ? CatalogModel.getById('areas', companyId, Number(data.areaId)) : Promise.resolve(null),
      ShiftModel.getById(Number(data.shiftId), companyId),
    ])
    if (!client?.estado || !site?.estado || site.clientId !== Number(data.clientId) || (data.areaId && !area?.estado) || !shift?.estado) {
      const e = new Error('Cliente, sede, area o turno no son validos para la empresa')
      e.status = 400
      throw e
    }

    const replaceExistingIds = workers.filter((worker) => worker.positionCode === 'operario').map((worker) => worker.id)
    return AssignmentModel.assignMany({
      ...data,
      collaboratorIds,
      replaceExistingIds,
      clientId: Number(data.clientId),
      siteId: Number(data.siteId),
      areaId: data.areaId ? Number(data.areaId) : null,
      shiftId: Number(data.shiftId),
    }, companyId, userId)
  }

  static assign(data, companyId, userId) {
    return this.assignMany({ ...data, collaboratorIds: [data.collaboratorId] }, companyId, userId)
  }

  static async endAssignment(id, data, companyId) {
    const result = await AssignmentModel.endAssignment(id, companyId, data.endDate || peruDate())
    if (!result) {
      const e = new Error('Asignacion vigente no encontrada')
      e.status = 404
      throw e
    }
    return result
  }
}

module.exports = AssignmentService
