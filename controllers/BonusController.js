const S = require('../services/BonusService')
const { poolPromise, sql } = require('../config/db')
const RuleService = require('../services/BonusRuleService')
const ProductivityService = require('../services/BonusProductivityService')

module.exports = {
  types: async (req, res, next) => { try { res.json(await S.types(req.user.companyId)) } catch (e) { next(e) } },
  periods: async (req, res, next) => { try { res.json(await S.periods(req.user.companyId)) } catch (e) { next(e) } },
  settings: async (req, res, next) => { try { res.json(await S.settings(req.user.companyId)) } catch (e) { next(e) } },
  updateSettings: async (req, res, next) => { try { res.json(await S.updateSettings(req.user.companyId, req.user.id, req.body)) } catch (e) { next(e) } },
  createPeriod: async (req, res, next) => { try { res.status(201).json(await S.createPeriod(req.user.companyId, req.user.id, req.body)) } catch (e) { next(e) } },
  closePeriod: async (req, res, next) => { try { res.json(await S.closePeriod(+req.params.id, req.user.companyId, req.user.id)) } catch (e) { next(e) } },
  rules: async (req, res, next) => { try { res.json(await S.rules(req.user.companyId)) } catch (e) { next(e) } },
  createRule: async (req, res, next) => { try { res.status(201).json(await S.createRule(req.user.companyId, req.user.id, req.body)) } catch (e) { next(e) } },
  updateRule: async (req, res, next) => { try { res.json(await RuleService.update(+req.params.id, req.user.companyId, req.body)) } catch (e) { next(e) } },
  campaigns: async (req, res, next) => { try { res.json((await S.campaigns(req.user.companyId)).filter((x) => x.status !== 'cancelled')) } catch (e) { next(e) } },
  createCampaign: async (req, res, next) => { try { res.status(201).json(await S.createCampaign(req.user.companyId, req.user.id, req.body)) } catch (e) { next(e) } },
  detail: async (req, res, next) => { try { res.json(await S.detail(+req.params.id, req.user.companyId)) } catch (e) { next(e) } },
  calculate: async (req, res, next) => { try { res.json(await S.calculate(+req.params.id, req.user.companyId, req.body.productivity || {})) } catch (e) { next(e) } },
  approve: async (req, res, next) => { try { res.json(await S.approve(+req.params.id, req.user.companyId, req.user)) } catch (e) { next(e) } },

  productivityList: async (req, res, next) => { try { res.json(await ProductivityService.list(req.user.companyId, req.query)) } catch (e) { next(e) } },
  productivityCreate: async (req, res, next) => { try { res.status(201).json(await ProductivityService.create(req.user.companyId, req.user.id, req.body)) } catch (e) { next(e) } },
  productivityDetail: async (req, res, next) => { try { res.json(await ProductivityService.detail(+req.params.id, req.user.companyId)) } catch (e) { next(e) } },
  productivityEvaluate: async (req, res, next) => {
    try {
      res.json(await ProductivityService.saveEvaluation(req.user.companyId, +req.params.id, +req.params.collaboratorId, req.user.id, req.body))
    } catch (e) { next(e) }
  },

  remove: async (req, res, next) => {
    try {
      const detail = await S.detail(+req.params.id, req.user.companyId)
      if (!detail.campaign) {
        const e = new Error('Campaña no encontrada')
        e.status = 404
        throw e
      }
      if (['approved', 'closed'].includes(detail.campaign.status) || detail.results.some((x) => x.status === 'paid')) {
        const e = new Error('Una campaña aprobada, cerrada o pagada no puede eliminarse')
        e.status = 409
        throw e
      }
      const pool = await poolPromise
      await pool.request()
        .input('id', sql.Int, +req.params.id)
        .input('c', sql.Int, req.user.companyId)
        .input('u', sql.Int, req.user.id)
        .query(`
          UPDATE dbo.BonusCampaigns SET status=N'cancelled',updatedAt=SYSUTCDATETIME() WHERE id=@id AND companyId=@c;
          UPDATE dbo.BonusResults SET status=N'rejected',updatedAt=SYSUTCDATETIME() WHERE campaignId=@id AND status<>N'paid';
          INSERT dbo.BonusAudit(companyId,campaignId,userId,action,reason) VALUES(@c,@id,@u,N'campaign_deleted',N'Eliminada desde el listado')
        `)
      res.json({ ok: true })
    } catch (e) { next(e) }
  },
}
