const crypto = require('crypto')
const Model = require('../models/AttendanceModel')

const fail = (message, status = 400) => { const e = new Error(message); e.status = status; throw e }

class AttendanceService {
  static list(companyId, user) { return Model.list(companyId, user) }

  static generalReport(companyId, filters, user) {
    if (!['admin', 'rrhh', 'operaciones', 'gerencia'].includes(user.role)) fail('No tienes permisos para consultar el reporte general', 403)
    return Model.generalReport(companyId, filters)
  }

  static async assertSupervisorScope(sheet, companyId, user) {
    if (user.role !== 'supervisor') return
    const ok = await Model.supervisorCanAccessScope(companyId, user.id, {
      siteId: sheet.siteId,
      shiftId: sheet.shiftId,
      attendanceDate: sheet.attendanceDate,
    })
    if (!ok) fail('No tienes acceso a este tareo', 403)
  }

  static async detail(id, companyId, user = null) {
    const sheet = await Model.getSheet(id, companyId)
    if (!sheet) fail('Tareo no encontrado', 404)
    if (user) await this.assertSupervisorScope(sheet, companyId, user)
    return { sheet, people: await Model.expected(id, companyId) }
  }

  static async start(data, companyId, user, ip) {
    if (!data.clientId || !data.siteId || !data.areaId || !data.shiftId || !data.attendanceDate) fail('Selecciona cliente, sede, area, turno y fecha')
    if (user.role === 'supervisor') {
      const ok = await Model.supervisorCanAccessScope(companyId, user.id, data)
      if (!ok) fail('Solo puedes iniciar tareos de tu sede y turno asignado', 403)
    }
    try {
      const sheet = await Model.createSheet(data, companyId, user.id)
      await Model.audit(companyId, sheet.id, 'sheet_started', user.id, null, JSON.stringify(data), null, ip)
      return this.detail(sheet.id, companyId, user)
    } catch (e) {
      if (e.number === 2627 || e.number === 2601) fail('Ya existe un tareo para esta sede, area, turno y fecha', 409)
      throw e
    }
  }

  static async generateQr(id, type, companyId, user, ip) {
    if (!['entry', 'exit', 'presence'].includes(type)) fail('Tipo de marcacion no valido')
    const sheet = await Model.getSheet(id, companyId)
    if (!sheet) fail('Tareo no encontrado', 404)
    await this.assertSupervisorScope(sheet, companyId, user)
    if (!['in_progress', 'reopened'].includes(sheet.status)) fail('El tareo no permite generar marcaciones', 409)
    const settings = await Model.settings(companyId)
    const token = crypto.randomBytes(32).toString('base64url')
    const hash = crypto.createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + (settings?.qrValidityMinutes || 3) * 60000)
    await Model.createQr(id, type, hash, expiresAt, user.id)
    await Model.audit(companyId, id, 'qr_generated', user.id, null, JSON.stringify({ type, expiresAt }), null, ip)
    return { token, expiresAt, markingType: type }
  }

  static async registerMark({ sheet, collaborator, markingType, source, qrEventId = null, statusCompanyId, registeredBy, deviceInfo, latitude, longitude, ip }) {
    if (!['entry', 'exit', 'presence'].includes(markingType)) fail('Tipo de marcacion no valido')
    const expected = await Model.expectedRecord(sheet.id, collaborator.id)
    if (!expected) fail('No esta asignado a este turno', 403)
    const previous = await Model.hasMark(sheet.id, collaborator.id, markingType)
    if (previous) fail('Marcacion duplicada. Se conserva la primera lectura.', 409)

    const settings = await Model.settings(statusCompanyId)
    let minutesLate = 0
    let statusCode = 'PRESENT'
    if (markingType === 'entry') {
      const start = new Date(`${String(sheet.attendanceDate).slice(0, 10)}T${String(sheet.startTime).slice(0, 8)}-05:00`)
      minutesLate = Math.max(0, Math.floor((Date.now() - start.getTime()) / 60000))
      if (minutesLate > (settings?.entryToleranceMinutes || 0)) statusCode = 'LATE'
    }
    const statusId = await Model.statusId(statusCompanyId, statusCode)
    const mark = await Model.createMark({
      sheetId: sheet.id,
      qrEventId,
      collaboratorId: collaborator.id,
      workTableId: expected.workTableId,
      markingType,
      source,
      statusId,
      minutesLate,
      deviceInfo,
      latitude,
      longitude,
      registeredBy,
    })
    await Model.audit(statusCompanyId, sheet.id, `${source}_mark_success`, registeredBy, collaborator.id, JSON.stringify({ type: markingType, minutesLate, workTableId: expected.workTableId }), deviceInfo, ip)
    return mark
  }

  static async scan(data, companyId, user, ip) {
    if (!data.token) fail('El token QR es obligatorio')
    const hash = crypto.createHash('sha256').update(data.token).digest('hex')
    const event = await Model.qrByHash(hash)
    if (!event || event.companyId !== companyId) fail('QR no valido', 404)
    if (!event.active || new Date(event.expiresAt) <= new Date()) fail('El QR expiro. Solicita uno nuevo', 410)
    if (!['in_progress', 'reopened'].includes(event.sheetStatus)) fail('El tareo esta cerrado', 409)
    const collaborator = await Model.collaboratorByUser(user.id, companyId)
    if (!collaborator || !collaborator.estado || collaborator.laborStatus !== 'active') fail('Tu colaborador no esta activo', 403)
    const sheet = await Model.getSheet(event.sheetId, companyId)
    try {
      return await this.registerMark({ sheet, collaborator, markingType: event.markingType, source: 'qr', qrEventId: event.id, statusCompanyId: companyId, registeredBy: user.id, deviceInfo: data.deviceInfo, latitude: data.latitude, longitude: data.longitude, ip })
    } catch (e) {
      if (e.number === 2601 || e.number === 2627) fail('Marcacion duplicada. Se conserva la primera lectura.', 409)
      throw e
    }
  }

  static async scanCode(id, data, companyId, user, ip) {
    const sheet = await Model.getSheet(id, companyId)
    if (!sheet) fail('Tareo no encontrado', 404)
    await this.assertSupervisorScope(sheet, companyId, user)
    if (!['in_progress', 'reopened'].includes(sheet.status)) fail('El tareo esta cerrado', 409)
    const code = String(data.code || '').trim()
    if (!code) fail('Escanea un DNI o fotocheck')
    const collaborator = await Model.collaboratorByCode(code, companyId)
    if (!collaborator) fail('No se encontro un colaborador activo con ese documento', 404)
    try {
      return await this.registerMark({ sheet, collaborator, markingType: data.markingType, source: 'scanner', statusCompanyId: companyId, registeredBy: user.id, deviceInfo: data.deviceInfo, ip })
    } catch (e) {
      if (e.number === 2601 || e.number === 2627) fail('Marcacion duplicada. Se conserva la primera lectura.', 409)
      throw e
    }
  }

  static async manual(id, data, companyId, user, ip) {
    const sheet = await Model.getSheet(id, companyId)
    if (!sheet) fail('Tareo no encontrado', 404)
    await this.assertSupervisorScope(sheet, companyId, user)
    if (!['in_progress', 'reopened'].includes(sheet.status)) fail('El tareo esta cerrado', 409)
    if (!data.collaboratorId || !data.markingType || !data.reason) fail('Selecciona colaborador, tipo y motivo')
    const expected = await Model.expectedRecord(id, Number(data.collaboratorId))
    if (!expected) fail('El colaborador no pertenece a este tareo')
    const previous = await Model.hasMark(id, Number(data.collaboratorId), data.markingType)
    if (previous) fail('Marcacion duplicada. Se conserva la primera lectura.', 409)
    const statusId = await Model.statusId(companyId, 'MANUAL_ENTRY')
    const mark = await Model.createMark({ sheetId: id, collaboratorId: Number(data.collaboratorId), workTableId: expected.workTableId, markingType: data.markingType, source: 'manual', statusId, reason: data.reason, observation: data.observation, registeredBy: user.id })
    await Model.audit(companyId, id, 'manual_mark', user.id, Number(data.collaboratorId), JSON.stringify(data), null, ip)
    return mark
  }

  static async validate(id, collaboratorId, data, companyId, user, ip) {
    const sheet = await Model.getSheet(id, companyId)
    if (!sheet) fail('Tareo no encontrado', 404)
    await this.assertSupervisorScope(sheet, companyId, user)
    if (!['confirmed', 'observed', 'annulled', 'impersonation'].includes(data.validation)) fail('Validacion no valida')
    await Model.validateExpected(id, collaboratorId, data.validation, data.observation)
    await Model.audit(companyId, id, `visual_${data.validation}`, user.id, collaboratorId, data.observation, null, ip)
    return this.detail(id, companyId, user)
  }

  static async close(id, companyId, user, ip) {
    const detail = await this.detail(id, companyId, user)
    if (!['in_progress', 'reopened'].includes(detail.sheet.status)) fail('El tareo ya esta cerrado', 409)
    const pending = detail.people.filter(x => !x.entryAt).length
    const exits = detail.people.filter(x => x.entryAt && !x.exitAt).length
    const observed = detail.people.filter(x => x.supervisorValidation === 'observed').length
    const absentId = await Model.statusId(companyId, 'ABSENT')
    if (absentId) await Model.markAbsences(id, absentId)
    const sheet = await Model.setSheetStatus(id, companyId, 'supervisor_closed', user.id, `Alertas al cierre: ${pending} faltas, ${exits} sin salida, ${observed} observados`)
    await Model.audit(companyId, id, 'supervisor_closed', user.id, null, sheet.notes, null, ip)
    return { sheet, warnings: { pending, missingExits: exits, observed } }
  }

  static async review(id, data, companyId, user, ip) {
    if (user.role !== 'rrhh' && user.role !== 'admin') fail('Solo RRHH o Admin puede revisar tareos', 403)
    const allowed = ['rrhh_observed', 'rrhh_approved', 'reopened', 'cancelled']
    if (!allowed.includes(data.status)) fail('Estado de revision no valido')
    const sheet = await Model.setSheetStatus(id, companyId, data.status, user.id, data.notes)
    await Model.audit(companyId, id, data.status, user.id, null, data.notes, null, ip)
    return sheet
  }
}

module.exports = AttendanceService
