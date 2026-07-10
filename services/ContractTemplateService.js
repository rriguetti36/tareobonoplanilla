const Model=require('../models/ContractTemplateModel')
const slug=value=>String(value||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_|_$/g,'').toUpperCase()
class ContractTemplateService{
 static getAll(companyId,all){return Model.getAll(companyId,all)}
 static normalize(data){if(!String(data.name||'').trim()||!String(data.title||'').trim()||!String(data.bodyText||'').trim())throw Object.assign(new Error('Nombre, título y texto del contrato son obligatorios'),{status:400});return{...data,code:slug(data.code||data.name),name:data.name.trim(),title:data.title.trim(),bodyText:data.bodyText.trim()}}
 static create(companyId,data){return Model.create(companyId,this.normalize(data))}
 static async update(id,companyId,data){if(!await Model.getById(id,companyId))throw Object.assign(new Error('Plantilla no encontrada'),{status:404});return Model.update(id,companyId,this.normalize(data))}
}
module.exports=ContractTemplateService
