const express=require('express');
const {createHash,timingSafeEqual}=require('crypto');
const {columns}=require('./schema');
const hash=token=>createHash('sha256').update(token).digest();
const uuid=value=>typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const text=value=>typeof value==='string' && value.length<=20000;
function createApp(store,tokenHashes) {
  if (!Array.isArray(tokenHashes) || !tokenHashes.length || tokenHashes.some(h=>!/^[a-f0-9]{64}$/i.test(h))) throw new Error('Configura SYNC_API_TOKEN_HASHES con una lista JSON de hashes SHA-256.');
  const trusted=tokenHashes.map(h=>Buffer.from(h,'hex'));
  const app=express();app.disable('x-powered-by');
  app.get('/healthz',(_,res)=>res.json({ok:true})); // No consulta ni despierta Neon.
  app.use('/v1', (req,res,next)=>{
    res.set('Cache-Control','no-store');
    const bearer=req.headers.authorization || '';
    if(!/^Bearer [A-Za-z0-9_-]{32,256}$/.test(bearer)) return res.status(401).json({message:'Equipo no autorizado.'});
    const candidate=hash(bearer.slice(7));
    if(!trusted.some(h=>timingSafeEqual(candidate,h))) return res.status(401).json({message:'Equipo no autorizado.'});
    next();
  });
  app.use(express.json({limit:'2mb'}));
  const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
  app.get('/v1/identity',(_,res)=>res.json(store.identity()));
  app.post('/v1/push',wrap(async(req,res)=>{
    const {operations,databaseId}=req.body || {};
    if(!uuid(databaseId) || !Array.isArray(operations) || !operations.length || operations.length>50) return res.status(400).json({message:'Lote no válido.'});
    for(const op of operations) {
      if(!op || !uuid(op.sync_id) || !uuid(op.operation_id) || !Number.isSafeInteger(op.base_version) || op.base_version<0 || ![0,1].includes(op.deleted) || !text(op.data)) return res.status(400).json({message:'Operación no válida.'});
      let data;try { data=JSON.parse(op.data); } catch { return res.status(400).json({message:'Datos no válidos.'}); }
      if(!data || Array.isArray(data) || typeof data!=='object' || Object.keys(data).some(c=>!columns.includes(c) || c==='id') || Object.values(data).some(v=>v!==null && typeof v!=='string' && typeof v!=='number')) return res.status(400).json({message:'Campos no válidos.'});
    }
    res.json(await store.push(operations,databaseId));
  }));
  app.get('/v1/pull',wrap(async(req,res)=>{
    const after=req.query.after || '0';
    if(typeof after!=='string' || !/^\d{1,18}$/.test(after) || !uuid(req.query.databaseId)) return res.status(400).json({message:'Cursor no válido.'});
    res.json(await store.pull(after,req.query.databaseId));
  }));
  app.post('/v1/lookup',wrap(async(req,res)=>{
    const body=req.body || {};
    if(!uuid(body.databaseId) || !uuid(body.syncId) || !['numeroArchivo','libroBautizo','folioBautizo'].every(c=>text(body[c]))) return res.status(400).json({message:'Referencia no válida.'});
    res.json(await store.lookup(body));
  }));
  app.use((err,req,res,next)=>{
    if(res.headersSent)return next(err);
    const status=err.status===409?409:err.status===400?400:err.status===413?413:503;
    res.status(status).json({message:status===409?'La copia local pertenece a otra base compartida.':status===503?'Servicio temporalmente no disponible. Los cambios siguen en el equipo.':'Solicitud no válida.'});
  });
  return app;
}
module.exports={createApp};
