const Model=require('../models/ToleranceRuleModel')
const slug=value=>String(value||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_|_$/g,'').toUpperCase()
class ToleranceRuleService {
  static getAll(companyId){return Model.getAll(companyId)}
  static normalize(data){if(!String(data.name||'').trim())throw Object.assign(new Error('Ingresa el nombre de la regla'),{status:400});const item={...data,code:slug(data.code||data.name),name:data.name.trim()};const fields=['entryToleranceMinutes','lateAfterMinutes','absenceAfterMinutes','exitToleranceMinutes'];if(fields.some(field=>!Number.isInteger(Number(item[field]))||Number(item[field])<0))throw Object.assign(new Error('Los minutos deben ser números enteros mayores o iguales a cero'),{status:400});if(Number(item.absenceAfterMinutes)<Number(item.lateAfterMinutes))throw Object.assign(new Error('El umbral de ausencia debe ser mayor o igual al de tardanza'),{status:400});return item}
  static create(companyId,data){return Model.create(companyId,this.normalize(data))}
  static update(companyId,code,data){return Model.update(companyId,code,this.normalize({...data,code}))}
}
module.exports=ToleranceRuleService
