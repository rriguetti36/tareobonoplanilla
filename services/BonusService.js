const M=require('../models/BonusModel'),{poolPromise,sql}=require('../config/db'),peruDate=require('../utils/peruDate');
const fail=(m,s=400)=>{const e=new Error(m);e.status=s;throw e};

class BonusService{
 static types(c){return M.types(c)}
 static rules(c){return M.rules(c)}
 static periods(c){return M.periods(c)}
 static settings(c){return M.settings(c)}
 static updateSettings(c,u,d){if(!['monthly','biweekly'].includes(d.paymentFrequency))fail('Selecciona una frecuencia válida');return M.updateSettings(c,u,d)}
 static async createPeriod(c,u,d){const settings=await M.settings(c);if(!/^\d{4}-\d{2}$/.test(d.referenceMonth||''))fail('Selecciona el mes del periodo');const[y,m]=d.referenceMonth.split('-').map(Number),last=new Date(Date.UTC(y,m,0)).getUTCDate(),frequency=settings?.paymentFrequency||'monthly',cutoff=settings?.cutoffDay||15;let startDay=1,endDay=last;if(frequency==='biweekly'){if(![1,2,'1','2'].includes(d.half))fail('Selecciona la quincena');startDay=Number(d.half)===1?1:cutoff+1;endDay=Number(d.half)===1?cutoff:last}const pad=n=>String(n).padStart(2,'0'),periodStart=`${y}-${pad(m)}-${pad(startDay)}`,periodEnd=`${y}-${pad(m)}-${pad(endDay)}`,months=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],name=d.name||`${frequency==='biweekly'?(Number(d.half)===1?'Primera':'Segunda')+' quincena':'Periodo'} ${months[m-1]} ${y}`;try{return await M.createPeriod(c,u,{name,periodStart,periodEnd,frequency})}catch(e){if(e.number===2601||e.number===2627)fail('Ya existe un periodo con estas fechas',409);throw e}}
 static async closePeriod(id,c,u){const p=await poolPromise;const pending=(await p.request().input('id',sql.Int,id).input('c',sql.Int,c).query(`SELECT COUNT(*) total FROM dbo.BonusCampaigns WHERE periodId=@id AND companyId=@c AND status NOT IN(N'approved',N'closed',N'cancelled')`)).recordset[0].total;if(pending)fail('No puedes cerrar el periodo mientras existan campañas sin aprobar',409);const period=await M.setPeriodStatus(id,c,u,'closed');if(!period)fail('Periodo no encontrado',404);await p.request().input('id',sql.Int,id).query(`UPDATE dbo.BonusCampaigns SET status=N'closed',updatedAt=SYSUTCDATETIME() WHERE periodId=@id AND status=N'approved'`);return period}
 static campaigns(c){return M.campaigns(c)}
 static createRule(c,u,d){if(!d.areaId||!d.bonusTypeId||!d.name||!d.validFrom)fail('Completa área, tipo, nombre y vigencia');return M.createRule(c,u,d)}
 static async createCampaign(c,u,d){if(!d.periodId||!d.ruleId||!d.clientId||!d.siteId||!d.areaId||!d.bonusTypeId)fail('Completa el periodo, alcance y regla');const p=await poolPromise,duplicate=(await p.request().input('p',sql.Int,d.periodId).input('cl',sql.Int,d.clientId).input('s',sql.Int,d.siteId).input('a',sql.Int,d.areaId).input('t',sql.Int,d.bonusTypeId).query(`SELECT id FROM dbo.BonusCampaigns WHERE periodId=@p AND clientId=@cl AND siteId=@s AND areaId=@a AND bonusTypeId=@t AND status<>N'cancelled'`)).recordset[0];if(duplicate)fail('Ya existe una campaña del mismo tipo para este periodo, cliente, sede y área',409);const created=await M.createCampaign(c,u,d);if(!created)fail('El periodo debe estar abierto',409);return created}
 static detail(id,c){return M.detail(id,c)}

 static async calculate(id,c,productivity={}){
  const detail=await M.detail(id,c),x=detail.campaign;
  if(!x)fail('Campaña no encontrada',404);
  if(x.periodStatus!=='open')fail('El periodo de remuneraciones está cerrado',409);
  if(!['active','in_review'].includes(x.status))fail('La campaña debe estar activa o en revisión para calcular',409);
  const p=await poolPromise;
  const people=(await p.request().input('c',sql.Int,c).input('id',sql.Int,id).query(`
   SELECT DISTINCT co.id,co.startDate,co.baseSalary
   FROM dbo.BonusCampaigns bc
   JOIN dbo.BonusTypes bt ON bt.id=bc.bonusTypeId
   JOIN dbo.CollaboratorAssignments ca ON ca.companyId=bc.companyId AND ca.siteId=bc.siteId AND(bt.code=N'ENTRY' OR ca.areaId=bc.areaId)
   JOIN dbo.Collaborators co ON co.id=ca.collaboratorId AND co.estado=1 AND co.laborStatus=N'active'
   WHERE bc.id=@id AND bc.companyId=@c
    AND ca.startDate<=bc.periodEnd AND(ca.endDate IS NULL OR ca.endDate>=bc.periodStart)
    AND(bt.code<>N'ENTRY' OR co.startDate BETWEEN bc.periodStart AND bc.periodEnd)
  `)).recordset;
  if(x.bonusTypeCode==='ENTRY')await p.request().input('id',sql.Int,id).query(`DELETE FROM dbo.BonusResults WHERE campaignId=@id`);
  for(const person of people){
   const stats=(await p.request().input('id',sql.Int,id).input('co',sql.Int,person.id).query(`SELECT COUNT(DISTINCT s.attendanceDate) attendanceDays,SUM(CASE WHEN st.code='ABSENT' THEN 1 ELSE 0 END) absences,SUM(CASE WHEN st.code='LATE' THEN 1 ELSE 0 END) lateArrivals FROM dbo.BonusCampaigns bc JOIN dbo.AttendanceSheets s ON s.clientId=bc.clientId AND s.siteId=bc.siteId AND s.areaId=bc.areaId AND s.attendanceDate BETWEEN bc.periodStart AND bc.periodEnd AND s.status='rrhh_approved' JOIN dbo.AttendanceExpected ae ON ae.sheetId=s.id AND ae.collaboratorId=@co LEFT JOIN dbo.AttendanceStatuses st ON st.id=ae.attendanceStatusId WHERE bc.id=@id`)).recordset[0];
   const prod=productivity[person.id]==null?null:Number(productivity[person.id]);
   if(prod!=null&&(prod<0||prod>100))fail('La productividad debe estar entre 0 y 100');
   const toUtcDay=value=>{const date=new Date(value);return Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())};
   const today=Date.parse(peruDate()+'T00:00:00Z');
   const evaluationDate=Math.min(today,toUtcDay(x.periodEnd));
   const senior=Math.max(0,Math.floor((evaluationDate-toUtcDay(person.startDate))/86400000));
   const entryBonus=x.bonusTypeCode==='ENTRY';
   const eligible=entryBonus
    ? senior>=x.minSeniorityDays
    : stats.attendanceDays>=x.minAttendanceDays&&(stats.absences||0)<=x.maxAbsences&&(stats.lateArrivals||0)<=x.maxLateArrivals&&senior>=x.minSeniorityDays&&(x.productivityMin==null||prod>=x.productivityMin)&&(x.productivityMax==null||prod<=x.productivityMax);
   const base=x.baseSource==='salary'?Number(person.baseSalary||0):Number(x.monthlyBonusBase||0);
   const amount=eligible?(x.calculationMode==='fixed'?Number(x.fixedAmount||0):base*Number(x.percentage||0)/100):0;
   const calculationDetail=entryBonus?{type:'entry',entryDate:person.startDate,evaluationDate:new Date(evaluationDate).toISOString().slice(0,10),minimumDays:x.minSeniorityDays,elapsedDays:senior,eligible}:{rule:x.ruleId,eligible};
   await p.request().input('id',sql.Int,id).input('co',sql.Int,person.id).input('pr',sql.Decimal(5,2),entryBonus?null:prod).input('ad',sql.Int,entryBonus?0:(stats.attendanceDays||0)).input('ab',sql.Int,entryBonus?0:(stats.absences||0)).input('lt',sql.Int,entryBonus?0:(stats.lateArrivals||0)).input('sn',sql.Int,senior).input('ba',sql.Decimal(12,2),base).input('am',sql.Decimal(12,2),amount).input('el',sql.Bit,eligible).input('dt',sql.NVarChar(1500),JSON.stringify(calculationDetail)).query(`MERGE dbo.BonusResults t USING(SELECT @id campaignId,@co collaboratorId)s ON t.campaignId=s.campaignId AND t.collaboratorId=s.collaboratorId WHEN MATCHED THEN UPDATE SET productivityFactor=@pr,attendanceDays=@ad,absences=@ab,lateArrivals=@lt,seniorityDays=@sn,baseAmount=@ba,calculatedAmount=@am,eligible=@el,calculationDetail=@dt,status='calculated',updatedAt=SYSUTCDATETIME() WHEN NOT MATCHED THEN INSERT(campaignId,collaboratorId,productivityFactor,attendanceDays,absences,lateArrivals,seniorityDays,baseAmount,calculatedAmount,eligible,calculationDetail,status)VALUES(@id,@co,@pr,@ad,@ab,@lt,@sn,@ba,@am,@el,@dt,'calculated');`);
  }
  await p.request().input('id',sql.Int,id).query(`UPDATE dbo.BonusCampaigns SET status='in_review',updatedAt=SYSUTCDATETIME() WHERE id=@id`);
  return M.detail(id,c);
 }

 static async approve(id,c,user){if(user.role!=='gerencia')fail('Solo Gerencia puede aprobar la campaña',403);const p=await poolPromise;await p.request().input('id',sql.Int,id).input('c',sql.Int,c).input('u',sql.Int,user.id).query(`UPDATE dbo.BonusCampaigns SET status='approved',approvedBy=@u,approvedAt=SYSUTCDATETIME() WHERE id=@id AND companyId=@c AND status='in_review';UPDATE dbo.BonusResults SET status=CASE WHEN eligible=1 THEN 'approved' ELSE 'rejected' END WHERE campaignId=@id`);return M.detail(id,c)}
}
module.exports=BonusService;
