const S = require('../services/PersonnelProcessService')
const Documents = require('../services/ContractDocumentService')

module.exports = {
  getAll: async (req, res, next) => { try { res.json(await S.getAll(req.user.companyId, req.params.type)) } catch (error) { next(error) } },
  create: async (req, res, next) => { try { res.status(201).json(await S.save(null, req.params.type, req.body, req.user.companyId, req.user)) } catch (error) { next(error) } },
  update: async (req, res, next) => { try { res.json(await S.save(Number(req.params.id), req.params.type, req.body, req.user.companyId, req.user)) } catch (error) { next(error) } },
  decide: async (req, res, next) => { try { res.json(await S.decide(Number(req.params.id), req.params.type, req.body.decision, req.body.decisionNotes, req.user.companyId, req.user)) } catch (error) { next(error) } },
  generateContract: async (req,res,next) => { try { const file=await Documents.generate(Number(req.params.id),req.user.companyId); res.sendFile(file) } catch(error) { next(error) } },
  myContracts: async (req,res,next) => { try { res.json(await require('../models/PersonnelProcessModel').getContractsByUser(req.user.id,req.user.companyId)) } catch(error) { next(error) } },
  downloadContract: async (req,res,next) => { try { res.sendFile(await Documents.generated(Number(req.params.id),req.user.companyId,req.user)) } catch(error) { next(error) } },
  uploadSignedContract: async (req,res,next) => { try { res.json(await Documents.signed(Number(req.params.id),req.user.companyId,req.file,req.user)) } catch(error) { if(req.file?.path)require('fs').promises.unlink(req.file.path).catch(()=>{});next(error) } },
  downloadSignedContract: async (req,res,next) => { try { res.sendFile(await Documents.signedFile(Number(req.params.id),req.user.companyId,req.user)) } catch(error) { next(error) } },
  confirmSignedContract: async (req,res,next) => { try { res.json(await Documents.confirmSigned(Number(req.params.id),req.user.companyId)) } catch(error) { next(error) } },
}
