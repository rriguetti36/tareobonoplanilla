const ShiftModel=require('../models/ShiftModel');
class ShiftService{
 static getAll(companyId){return ShiftModel.getAll(companyId)}
 static async save(id,data,companyId){if(!data.code?.trim()||!data.name?.trim()||!data.startTime||!data.endTime){const e=new Error('Codigo, nombre y horario son obligatorios');e.status=400;throw e}if(data.startTime===data.endTime){const e=new Error('La hora de inicio y fin deben ser diferentes');e.status=400;throw e}if(id&&!await ShiftModel.getById(id,companyId)){const e=new Error('Turno no encontrado');e.status=404;throw e}return id?ShiftModel.update(id,companyId,data):ShiftModel.create(companyId,data)}
}
module.exports=ShiftService;
