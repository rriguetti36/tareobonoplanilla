const Model = require('../models/BonusProductivityModel')

const fail = (message, status = 400) => { const e = new Error(message); e.status = status; throw e }
const toDateTime = (date, time) => {
  if (!date || !time) return null
  return new Date(`${date}T${String(time).slice(0, 5)}:00-05:00`)
}
const validScore = (value) => value !== '' && value !== null && value !== undefined && Number(value) >= 0 && Number(value) <= 100

class BonusProductivityService {
  static list(companyId, filters) {
    return Model.list(companyId, filters)
  }

  static async create(companyId, userId, data) {
    if (!data.clientId || !data.siteId || !data.shiftId || !data.workTableId || !data.workDate) fail('Completa cliente, sede, turno, mesa y fecha')
    const startedAt = toDateTime(data.workDate, data.startTime)
    const endedAt = toDateTime(data.workDate, data.endTime)
    if (!startedAt || !endedAt) fail('Completa hora de inicio y fin')
    if (endedAt <= startedAt) fail('La hora fin debe ser mayor a la hora inicio')
    if (Number(data.boxesProcessed || 0) > Number(data.boxesReceived || 0)) fail('Las cajas procesadas no pueden superar las cajas recibidas')
    if (Number(data.unitsRejected || 0) > Number(data.unitsTagged || 0)) fail('Las unidades observadas no pueden superar las unidades etiquetadas')
    return Model.create(companyId, userId, { ...data, startedAt, endedAt })
  }

  static async detail(id, companyId) {
    const detail = await Model.detail(id, companyId)
    if (!detail.batch) fail('Registro de productividad no encontrado', 404)
    return detail
  }

  static async saveEvaluation(companyId, batchId, collaboratorId, userId, data) {
    for (const field of ['productivityScore', 'qualityScore', 'teamworkScore', 'disciplineScore']) {
      if (!validScore(data[field])) fail('Los puntajes deben estar entre 0 y 100')
    }
    return Model.saveEvaluation(companyId, batchId, collaboratorId, userId, {
      productivityScore: Number(data.productivityScore),
      qualityScore: Number(data.qualityScore),
      teamworkScore: Number(data.teamworkScore),
      disciplineScore: Number(data.disciplineScore),
      observation: data.observation,
    })
  }
}

module.exports = BonusProductivityService
