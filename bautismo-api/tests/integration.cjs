const assert=require('node:assert/strict');
const path=require('path');
const {randomBytes,createHash,randomUUID}=require('crypto');
const {PGlite}=require('@electric-sql/pglite');
const sqlite3=require(require.resolve('sqlite3',{paths:[path.join(__dirname,'../../bautismo-backend')]}));
const {createStore}=require('../store');
const {createApp}=require('../app');
const {createSyncDatabase}=require('../../bautismo-backend/syncDatabase');
const {createSyncApiClient}=require('../../bautismo-backend/syncApiClient');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const token=randomBytes(32).toString('base64url'),tokenHash=createHash('sha256').update(token).digest('hex');
let server,pg;const apps=[];
async function main(){
  pg=new PGlite();let queries=[];
  let tail=Promise.resolve();
  const connect=async()=>{
    const previous=tail;let release;tail=new Promise(r=>release=r);await previous;
    return {query:async(sql,params)=>{queries.push(sql);return pg.query(sql,params);},release};
  };
  const pool={connect,query:async(sql,p)=>{const c=await connect();try{return await c.query(sql,p);}finally{c.release();}}};
  const store=createStore(pool);await store.initialize();const identity=store.identity().databaseId;
  await store.initialize();assert.equal(store.identity().databaseId,identity);
  server=createApp(store,[tokenHash]).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const url='http://127.0.0.1:'+server.address().port;
  const before=queries.length;
  assert.equal((await fetch(url+'/v1/identity')).status,401);
  assert.equal((await fetch(url+'/healthz')).status,200);assert.equal(queries.length,before);
  const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
  assert.equal((await fetch(url+'/v1/push',{method:'POST',headers,body:JSON.stringify({databaseId:identity,operations:[{sql:'DROP TABLE certificados_bautismo'}]})})).status,400);
  assert.equal((await fetch(url+'/v1/pull?after=0&databaseId='+randomUUID(),{headers})).status,409);assert.equal(queries.length,before);
  let offline=false,loseAck=false;
  const network=async(endpoint,options)=>{
    if(offline)throw new Error('Sin red');
    const response=await fetch(endpoint,options);
    if(loseAck && endpoint.endsWith('/v1/push')){loseAck=false;await response.text();throw new Error('Confirmación perdida');}
    return response;
  };
  const make=(automatic=false,providedToken=token)=>{
    const remote=createSyncApiClient(url,providedToken,{allowLocalHttp:true,fetchImpl:network});
    const app=createSyncDatabase(new sqlite3.Database(':memory:'),remote,{autoSync:automatic});apps.push(app);return app;
  };
  const run=(app,sql,params=[])=>new Promise((resolve,reject)=>app.db.run(sql,params,function(err){err?reject(err):resolve(this);}));
  const rows=app=>new Promise((resolve,reject)=>app.db.all('SELECT * FROM certificados_bautismo',[],(e,r)=>e?reject(e):resolve(r)));
  const insert=(app,n,name='Ana')=>run(app,'INSERT INTO certificados_bautismo (nombreSuscribe,libroBautizo,folioBautizo,numeroArchivo,nombreBautizado) VALUES (?,?,?,?,?)',['Parroquia','1','1',String(n),name]);
  const a=make(),b=make();await a.initialize();await b.initialize();
  offline=true;const saved=await insert(a,1);await a.synchronize();assert.equal((await a.status()).pending,1);
  offline=false;await a.connectionChanged(true);await b.synchronize();assert.equal((await rows(b))[0].nombreBautizado,'Ana');
  assert.equal((await a.status()).pending,0);
  const initialCursor=(await store.pull('0',identity)).cursor;
  assert.equal((await store.pull(initialCursor,identity)).rows.length,0);
  const bid=(await rows(b))[0].id;
  await run(a,'UPDATE certificados_bautismo SET nombreBautizado=? WHERE id=?',['Ana A',saved.lastID]);
  await run(b,'UPDATE certificados_bautismo SET nombreBautizado=? WHERE id=?',['Ana B',bid]);
  await a.synchronize();await b.synchronize();assert.equal((await b.status()).conflicts.length,1);
  await b.resolveConflict(bid,'cloud');assert.equal((await rows(b))[0].nombreBautizado,'Ana A');
  const delta=await store.pull(initialCursor,identity);assert.equal(delta.rows.length,1);assert.equal(delta.rows[0].nombreBautizado,'Ana A');
  await insert(a,2,'Eva');loseAck=true;await a.synchronize();assert.equal((await a.status()).pending,1);
  await a.synchronize();assert.equal((await a.status()).pending,0);
  assert.equal(Number((await pool.query('SELECT count(*) AS n FROM certificados_bautismo')).rows[0].n),2);
  await run(a,'DELETE FROM certificados_bautismo WHERE id=?',[saved.lastID]);await a.synchronize();await b.synchronize();assert.equal((await rows(b)).some(r=>r.numeroArchivo==='1'),false);
  // Más de 50 envíos y más de 200 descargas deben completarse en el mismo evento.
  for(let i=3;i<=207;i++)await insert(a,i,'Lote '+i);
  await a.synchronize();await b.synchronize();assert.equal((await a.status()).pending,0);assert.equal((await rows(b)).length,206);
  const countAfter=queries.length;await b.synchronize();
  const additional=queries.slice(countAfter);assert.equal(additional.length,1);assert.match(additional[0],/sync_cursor > \$1/);assert.equal(additional.some(q=>/CREATE|ALTER/.test(q)),false);
  const unauthorized=make(false,randomBytes(32).toString('base64url'));await unauthorized.initialize();const queryCount=queries.length;await unauthorized.synchronize();assert.equal((await unauthorized.status()).mode,'configuration-error');assert.equal(queries.length,queryCount);
  const automatic=make(true);await automatic.initialize();
  const settled=async()=>{for(let i=0;i<100;i++){const s=await automatic.status();if(s.mode==='online' && s.pending===0)return;await sleep(100);}throw new Error('No terminó la sincronización automática.');};
  await settled();await insert(automatic,300,'Automático');await settled();assert.equal((await store.lookup({databaseId:identity,syncId:randomUUID(),numeroArchivo:'300',libroBautizo:'1',folioBautizo:'1'})).row.nombreBautizado,'Automático');
  // Consultar el estado local, hacer backups y health checks no consulta PostgreSQL.
  await sleep(300);const idle=queries.length;
  await automatic.status();await run(automatic,'PRAGMA user_version');await fetch(url+'/healthz');
  await sleep(16000);assert.equal(queries.length,idle,'Se detectó actividad periódica inesperada en PostgreSQL.');
  console.log('OK: API HTTP autenticada + PostgreSQL local + SQLite; conflictos, reconexión, reintentos sin duplicados, paginación, >50 pendientes y cero consultas en reposo durante más de 15 segundos.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
  for(const app of apps)await new Promise(r=>app.db.close(r));
  if(server)await new Promise(r=>server.close(r));
  await pg?.close();
});
