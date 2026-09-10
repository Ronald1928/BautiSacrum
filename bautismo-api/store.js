const { randomUUID } = require('crypto');
const { columns, sqliteSchema, postgresSchema } = require('./schema');
const fields = columns.filter(c => c !== 'id');
const quoted = names => names.map(c => `"${c}"`).join(', ');
const placeholders = names => names.map((_, i) => '$' + (i + 1)).join(', ');
const integerFields = new Set(['diaNacimiento','anoNacimiento','anoArchivo','diaBautismo','anoBautismo','diaEmision','anoEmision']);
const clean = row => Object.fromEntries(fields.map(c => [c, integerFields.has(c) ? (row[c] === '' || row[c] == null ? null : Number.isInteger(Number(row[c])) ? Number(row[c]) : String(row[c])) : row[c] instanceof Date ? row[c].toISOString() : row[c] ?? null]));
const same = (a, b) => fields.filter(c => c !== 'created_at').every(c => JSON.stringify(clean(a)[c]) === JSON.stringify(clean(b)[c]));


function createStore(pool) {
  let databaseId;
  async function initialize() {
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(748201)');
      databaseId=await remoteSchema(client);
      await client.query('COMMIT');
    } catch(err) { await client.query('ROLLBACK').catch(()=>{}); throw err; }
    finally { client.release(); }
  }
  function checkIdentity(id) { if(id!==databaseId) throw Object.assign(new Error('La copia local pertenece a otra base compartida.'),{status:409}); }
  async function push(items, id) {
    checkIdentity(id);
    const client=await pool.connect();
    try {
      const results=[];
      for(const item of items) {
        try { results.push(await upload(client,item)); }
        catch(err) {
          if(err.conflict || ['23505','23502','22P02','22003','22007','22008'].includes(err.code)) results.push({operation_id:item.operation_id,conflict:err.conflict?err.message:'Revisa los datos: referencia duplicada o valor no válido.'});
          else throw err;
        }
      }
      return {results};
    } finally { client.release(); }
  }
  async function pull(after, id) {
    checkIdentity(id);
    const result=await pool.query('SELECT * FROM certificados_bautismo WHERE sync_cursor > $1 ORDER BY sync_cursor LIMIT 201',[after]);
    const rows=result.rows.slice(0,200);
    return {rows, more:result.rows.length>200, cursor:rows.length?String(rows.at(-1).sync_cursor):after};
  }
  async function lookup(body) {
    checkIdentity(body.databaseId);
    return {row:(await pool.query('SELECT * FROM certificados_bautismo WHERE sync_uuid=$1 OR ("numeroArchivo"=$2 AND "libroBautizo"=$3 AND "folioBautizo"=$4) ORDER BY (sync_uuid=$1) DESC LIMIT 1',[body.syncId,body.numeroArchivo,body.libroBautizo,body.folioBautizo])).rows[0] || null};
  }
  async function remoteSchema(client) {
    await client.query(postgresSchema);
    await client.query('ALTER TABLE certificados_bautismo ADD COLUMN IF NOT EXISTS sync_uuid TEXT NOT NULL DEFAULT gen_random_uuid()::text');
    await client.query('ALTER TABLE certificados_bautismo ADD COLUMN IF NOT EXISTS sync_version INTEGER NOT NULL DEFAULT 1');
    await client.query('ALTER TABLE certificados_bautismo ADD COLUMN IF NOT EXISTS sync_deleted BOOLEAN NOT NULL DEFAULT false');
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS certificados_sync_uuid ON certificados_bautismo(sync_uuid)');
    await client.query('CREATE TABLE IF NOT EXISTS bautismo_sync_operations (operation_id TEXT PRIMARY KEY, sync_id TEXT NOT NULL, version INTEGER NOT NULL)');
    await client.query('CREATE TABLE IF NOT EXISTS bautismo_sync_identity (singleton INTEGER PRIMARY KEY CHECK(singleton=1), database_id TEXT NOT NULL)');
    await client.query('INSERT INTO bautismo_sync_identity VALUES (1, gen_random_uuid()::text) ON CONFLICT DO NOTHING');
    const identity = (await client.query('SELECT database_id FROM bautismo_sync_identity WHERE singleton=1')).rows[0].database_id;
    await client.query('CREATE TABLE IF NOT EXISTS bautismo_sync_clock (singleton INTEGER PRIMARY KEY CHECK(singleton=1), value BIGINT NOT NULL)');
    await client.query('ALTER TABLE certificados_bautismo ADD COLUMN IF NOT EXISTS sync_cursor BIGINT NOT NULL DEFAULT 0');
    await client.query('UPDATE certificados_bautismo SET sync_cursor=id WHERE sync_cursor=0');
    await client.query('INSERT INTO bautismo_sync_clock SELECT 1, COALESCE(MAX(sync_cursor),0) FROM certificados_bautismo ON CONFLICT(singleton) DO UPDATE SET value=GREATEST(bautismo_sync_clock.value,excluded.value)');
    await client.query('CREATE INDEX IF NOT EXISTS certificados_sync_cursor ON certificados_bautismo(sync_cursor)');
    return identity;
  }

  async function upload(client, item) {
    const data = JSON.parse(item.data);
    await client.query('BEGIN');
    try {
      // Permite reintentar una operación aunque su confirmación se haya perdido.
      await client.query('SELECT value FROM bautismo_sync_clock WHERE singleton=1 FOR UPDATE');
      const previous = (await client.query('SELECT * FROM bautismo_sync_operations WHERE operation_id=$1', [item.operation_id])).rows[0];
      let uuid = item.sync_id, version;
      if (previous) { uuid = previous.sync_id; version = previous.version; }
      else {
        let remote = (await client.query('SELECT * FROM certificados_bautismo WHERE sync_uuid=$1 FOR UPDATE', [uuid])).rows[0];
        if (!remote && item.base_version === 0 && !item.deleted) {
          const existing = (await client.query('SELECT * FROM certificados_bautismo WHERE "numeroArchivo"=$1 AND "libroBautizo"=$2 AND "folioBautizo"=$3 FOR UPDATE', [data.numeroArchivo, data.libroBautizo, data.folioBautizo])).rows[0];
          // Dos instalaciones pueden partir de la misma copia antigua.
          if (existing && !existing.sync_deleted && same(data, existing)) {
            remote = existing; uuid = existing.sync_uuid; version = existing.sync_version;
          } else if (existing) throw Object.assign(new Error('Ya existe otro certificado con el mismo libro, folio y número.'), { conflict: true });
        }
        if (version === undefined) {
          if (remote && remote.sync_version !== item.base_version) throw Object.assign(new Error('Otro computador modificó este certificado.'), { conflict: true });
          if (!remote && item.base_version !== 0) throw Object.assign(new Error('El certificado de origen ya no está disponible.'), { conflict: true });
          if (!remote) {
            version = 1;
            await client.query(`INSERT INTO certificados_bautismo (${quoted(fields)}, sync_uuid, sync_version, sync_deleted) VALUES (${placeholders(fields)}, $${fields.length+1}, 1, $${fields.length+2})`, [...fields.map(c => data[c]), uuid, Boolean(item.deleted)]);
          } else {
            version = remote.sync_version + 1;
            await client.query(`UPDATE certificados_bautismo SET ${fields.map((c, i) => `"${c}"=$${i+1}`).join(', ')}, sync_version=$${fields.length+1}, sync_deleted=$${fields.length+2} WHERE sync_uuid=$${fields.length+3}`, [...fields.map(c => data[c]), version, Boolean(item.deleted), uuid]);
          }
        }
        const counter=(await client.query('UPDATE bautismo_sync_clock SET value=value+1 WHERE singleton=1 RETURNING value')).rows[0].value;
        await client.query('UPDATE certificados_bautismo SET sync_cursor=$1 WHERE sync_uuid=$2',[counter,uuid]);
        await client.query('INSERT INTO bautismo_sync_operations VALUES ($1, $2, $3)', [item.operation_id, uuid, version]);
      }
      await client.query('COMMIT');
      return { operation_id:item.operation_id, sync_id:uuid, version };
    } catch (err) { await client.query('ROLLBACK').catch(() => {}); throw err; }
  }

  return {initialize,push,pull,lookup,identity:()=>({databaseId,protocol:1})};
}
module.exports={createStore};
