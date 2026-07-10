const Model = require('../models/PersonnelProcessModel')
const CollaboratorModel = require('../models/CollaboratorModel')
const CatalogModel = require('../models/CatalogModel')
const ContractTemplateModel = require('../models/ContractTemplateModel')

const TYPES = ['hire', 'termination', 'contract', 'vacation', 'leave', 'incident', 'justification']
const STATUSES = ['draft', 'pending', 'approved', 'rejected', 'cancelled', 'issued']
const APPROVAL_TYPES = ['hire', 'termination']
const PROCESS_REASONS = {
  hire: 'Alta de colaborador', termination: 'Baja de colaborador', contract: 'Emisión de contrato',
  vacation: 'Goce vacacional', leave: 'Licencia laboral', justification: 'Justificación de incidencia',
}

const fail = (message, status = 400) => { const error = new Error(message); error.status = status; throw error }

class PersonnelProcessService {
  static assertType(type) {
    if (!TYPES.includes(type)) fail('Tipo de proceso no válido')
  }

  static canManage(type, role) {
    return ['admin', 'rrhh'].includes(role) || (role === 'supervisor' && ['incident', 'justification'].includes(type))
  }

  static getAll(companyId, type) {
    this.assertType(type)
    return Model.getAll(companyId, type)
  }

  static async save(id, type, data, companyId, user) {
    this.assertType(type)
    if (!this.canManage(type, user.role)) fail('No tienes permisos para gestionar este proceso', 403)
    if (!data.collaboratorId) fail('Selecciona un colaborador')

    const collaborator = await CollaboratorModel.getById(Number(data.collaboratorId), companyId)
    if (!collaborator) fail('Colaborador no encontrado')
    if (type === 'hire' && collaborator.estado) fail('El colaborador ya se encuentra activo')
    if (type === 'termination' && !collaborator.estado) fail('Solo se puede solicitar la baja de un colaborador activo')
    if (!STATUSES.includes(data.status)) fail('Estado no válido')
    if (['hire', 'termination', 'incident'].includes(type) && !data.eventDate) fail('La fecha del evento es obligatoria')
    if (type === 'incident' && !data.incidentTypeId) fail('Selecciona el tipo de incidencia')
    if (['vacation', 'leave', 'contract'].includes(type) && (!data.startDate || !data.endDate)) fail('El período de inicio y fin es obligatorio')
    if (type === 'contract' && (!data.contractNumber || !data.employmentTypeId || !data.contractTemplateId)) fail('Número, tipo de vínculo y plantilla de contrato son obligatorios')
    if (data.startDate && data.endDate && data.endDate < data.startDate) fail('La fecha final no puede ser anterior al inicio')
    if (type === 'termination' && data.eventDate < String(collaborator.startDate).slice(0, 10)) fail('La baja no puede ser anterior al ingreso')
    if (type === 'contract' && !await CatalogModel.getById('employmentTypes', companyId, Number(data.employmentTypeId))) fail('Tipo de vínculo no válido')
    if (type === 'contract' && !await ContractTemplateModel.getById(Number(data.contractTemplateId), companyId)) fail('Plantilla de contrato no válida')
    if (type === 'contract' && !await Model.hasApprovedHire(companyId,Number(data.collaboratorId))) fail('El contrato solo puede emitirse después de aprobar el Alta del colaborador',409)
    const incidentType = type === 'incident' ? await CatalogModel.getById('incidentTypes', companyId, Number(data.incidentTypeId)) : null
    if (type === 'incident' && !incidentType) fail('Tipo de incidencia no válido')

    if (type === 'justification') {
      const related = await Model.getById(Number(data.relatedProcessId), companyId)
      if (!related || related.processType !== 'incident' || related.collaboratorId !== Number(data.collaboratorId)) fail('Selecciona una incidencia del colaborador')
    }

    const existing = id ? await Model.getById(id, companyId) : null
    if (id && (!existing || existing.processType !== type)) fail('Registro no encontrado', 404)
    if (type === 'contract' && existing?.documentStatus === 'signed') fail('El contrato firmado está cerrado y ya no puede editarse',409)
    if (APPROVAL_TYPES.includes(type)) {
      if (existing && existing.status !== 'pending') fail('Una solicitud procesada ya no puede modificarse', 409)
      if (await Model.hasPending(companyId, Number(data.collaboratorId), type, id)) fail(`El colaborador ya tiene una solicitud de ${type === 'hire' ? 'alta' : 'baja'} pendiente`, 409)
    }

    const status = APPROVAL_TYPES.includes(type) ? 'pending' : type === 'contract' ? 'issued' : data.status
    const approved = status === 'approved'
    const normalized = {
      ...data, processType: type, status, reason: type === 'incident' ? incidentType.name : PROCESS_REASONS[type],
      approvedBy: approved ? user.id : null,
      approvedAt: approved ? new Date() : null,
      decisionNotes: existing?.decisionNotes || null,
    }
    return id ? Model.update(id, companyId, normalized) : Model.create(companyId, user.id, normalized)
  }

  static async decide(id, type, decision, decisionNotes, companyId, user) {
    this.assertType(type)
    if (user.role !== 'admin') fail('Solo el rol Admin puede aprobar o rechazar solicitudes', 403)
    if (!APPROVAL_TYPES.includes(type)) fail('Este proceso no utiliza el flujo de aprobación de altas y bajas')
    if (!['approved', 'rejected'].includes(decision)) fail('Decisión no válida')
    if (decision === 'rejected' && !String(decisionNotes || '').trim()) fail('Indica el motivo del rechazo')

    const process = await Model.getById(id, companyId)
    if (!process || process.processType !== type) fail('Solicitud no encontrada', 404)
    if (process.status !== 'pending') fail('La solicitud ya fue procesada', 409)
    const collaborator = await CollaboratorModel.getById(process.collaboratorId, companyId)
    if (decision === 'approved' && type === 'hire' && collaborator.estado) fail('El colaborador ya se encuentra activo', 409)
    if (decision === 'approved' && type === 'termination' && !collaborator.estado) fail('El colaborador ya se encuentra inactivo', 409)
    return Model.decide(id, companyId, user.id, decision, String(decisionNotes || '').trim())
  }
}

module.exports = PersonnelProcessService
