const S=require('../services/BonusService')
const{poolPromise,sql}=require('../config/db')
const RuleService=require('../services/BonusRuleService')
module.exports={
 types:async(r,s,n)=>{try{s.json(await S.types(r.user.companyId))}catch(e){n(e)}},
 periods:async(r,s,n)=>{try{s.json(await S.periods(r.user.companyId))}catch(e){n(e)}},
 settings:async(r,s,n)=>{try{s.json(await S.settings(r.user.companyId))}catch(e){n(e)}},
 updateSettings:async(r,s,n)=>{try{s.json(await S.updateSettings(r.user.companyId,r.user.id,r.body))}catch(e){n(e)}},
 createPeriod:async(r,s,n)=>{try{s.status(201).json(await S.createPeriod(r.user.companyId,r.user.id,r.body))}catch(e){n(e)}},
 closePeriod:async(r,s,n)=>{try{s.json(await S.closePeriod(+r.params.id,r.user.companyId,r.user.id))}catch(e){n(e)}},
 rules:async(r,s,n)=>{try{s.json(await S.rules(r.user.companyId))}catch(e){n(e)}},
 createRule:async(r,s,n)=>{try{s.status(201).json(await S.createRule(r.user.companyId,r.user.id,r.body))}catch(e){n(e)}},
 updateRule:async(r,s,n)=>{try{s.json(await RuleService.update(+r.params.id,r.user.companyId,r.body))}catch(e){n(e)}},
 campaigns:async(r,s,n)=>{try{s.json((await S.campaigns(r.user.companyId)).filter(x=>x.status!=='cancelled'))}catch(e){n(e)}},
 createCampaign:async(r,s,n)=>{try{s.status(201).json(await S.createCampaign(r.user.companyId,r.user.id,r.body))}catch(e){n(e)}},
 detail:async(r,s,n)=>{try{s.json(await S.detail(+r.params.id,r.user.companyId))}catch(e){n(e)}},
 calculate:async(r,s,n)=>{try{s.json(await S.calculate(+r.params.id,r.user.companyId,r.body.productivity||{}))}catch(e){n(e)}},
 approve:async(r,s,n)=>{try{s.json(await S.approve(+r.params.id,r.user.companyId,r.user))}catch(e){n(e)}},
 remove:async(r,s,n)=>{try{const detail=await S.detail(+r.params.id,r.user.companyId);if(!detail.campaign){const e=new Error('Campaña no encontrada');e.status=404;throw e}if(['approved','closed'].includes(detail.campaign.status)||detail.results.some(x=>x.status==='paid')){const e=new Error('Una campaña aprobada, cerrada o pagada no puede eliminarse');e.status=409;throw e}const pool=await poolPromise;await pool.request().input('id',sql.Int,+r.params.id).input('c',sql.Int,r.user.companyId).input('u',sql.Int,r.user.id).query(`UPDATE dbo.BonusCampaigns SET status=N'cancelled',updatedAt=SYSUTCDATETIME() WHERE id=@id AND companyId=@c;UPDATE dbo.BonusResults SET status=N'rejected',updatedAt=SYSUTCDATETIME() WHERE campaignId=@id AND status<>N'paid';INSERT dbo.BonusAudit(companyId,campaignId,userId,action,reason)VALUES(@c,@id,@u,N'campaign_deleted',N'Eliminada desde el listado')`);s.json({ok:true})}catch(e){n(e)}}
}
