require('dotenv').config({quiet:true});
const {Pool}=require('pg');
const {createStore}=require('./store');
const {createApp}=require('./app');
async function main(){
  if(!process.env.DATABASE_URL)throw new Error('Configura DATABASE_URL únicamente en el servidor.');
  const tokenHashes=JSON.parse(process.env.SYNC_API_TOKEN_HASHES || '[]');
  const pool=new Pool({connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:15000,statement_timeout:15000,idleTimeoutMillis:10000});
  pool.on('error',()=>console.error('Conexión inactiva con PostgreSQL interrumpida.'));
  const store=createStore(pool);
  const app=createApp(store,tokenHashes);
  try { await store.initialize(); } catch(err) {await pool.end();throw err;}
  const server=app.listen(process.env.PORT || 8080,'0.0.0.0',()=>console.log('API privada lista.'));
  const shutdown=()=>server.close(()=>pool.end().then(()=>process.exit(0)));
  process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
}
main().catch(err=>{console.error('No se pudo iniciar la API:',err.code || 'revisa su configuración');process.exitCode=1;});
