const { randomUUID } = require("crypto");
const { columns, sqliteSchema } = require("./schema");
const fields = columns.filter((c) => c !== "id");
const quoted = (names) => names.map((c) => `"${c}"`).join(", ");
const placeholders = (names) => names.map((_, i) => "$" + (i + 1)).join(", ");
const integerFields = new Set([
  "diaNacimiento",
  "anoNacimiento",
  "anoArchivo",
  "diaBautismo",
  "anoBautismo",
  "diaEmision",
  "anoEmision",
]);
const clean = (row) =>
  Object.fromEntries(
    fields.map((c) => [
      c,
      integerFields.has(c)
        ? row[c] === "" || row[c] == null
          ? null
          : Number.isInteger(Number(row[c]))
            ? Number(row[c])
            : String(row[c])
        : row[c] instanceof Date
          ? row[c].toISOString()
          : (row[c] ?? null),
    ]),
  );
const same = (a, b) =>
  fields
    .filter((c) => c !== "created_at")
    .every((c) => JSON.stringify(clean(a)[c]) === JSON.stringify(clean(b)[c]));

// Todas las operaciones locales y la sincronización comparten la misma cola.
// Cada escritura y su registro pendiente se confirman en una sola transacción.
function createSyncDatabase(local, remote, { autoSync = true } = {}) {
  let queue = Promise.resolve();
  let timer,
    syncPromise,
    ready = false,
    stopped = false;
  const state = {
    mode: remote ? "offline" : "unconfigured",
    lastSync: null,
    error: null,
  };
  const exclusive = (fn) => {
    const next = queue.then(fn);
    queue = next.catch(() => {});
    return next;
  };
  const run = (sql, params = []) =>
    new Promise((resolve, reject) =>
      local.run(sql, params, function (err) {
        err
          ? reject(err)
          : resolve({ lastID: this.lastID, changes: this.changes });
      }),
    );
  const all = (sql, params = []) =>
    new Promise((resolve, reject) =>
      local.all(sql, params, (err, rows) =>
        err ? reject(err) : resolve(rows),
      ),
    );
  const get = async (sql, params) => (await all(sql, params))[0];
  const transaction = async (fn) => {
    await run("BEGIN IMMEDIATE");
    try {
      const result = await fn();
      await run("COMMIT");
      return result;
    } catch (err) {
      await run("ROLLBACK");
      throw err;
    }
  };
  async function pending(uuid, localId, revision, data, deleted) {
    await run(
      `INSERT INTO sync_pending (sync_id, local_id, base_version, operation_id, data, deleted)
      VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(sync_id) DO UPDATE SET
      operation_id=excluded.operation_id, data=excluded.data, deleted=excluded.deleted, conflict=NULL`,
      [
        uuid,
        localId,
        revision,
        randomUUID(),
        JSON.stringify(clean(data)),
        deleted ? 1 : 0,
      ],
    );
  }
  async function initialize() {
    await run(sqliteSchema);
    await run("PRAGMA busy_timeout = 5000");
    await run(
      "CREATE TABLE IF NOT EXISTS sync_map (sync_id TEXT PRIMARY KEY, local_id INTEGER UNIQUE NOT NULL, version INTEGER NOT NULL)",
    );
    await run(`CREATE TABLE IF NOT EXISTS sync_pending (sync_id TEXT PRIMARY KEY, local_id INTEGER NOT NULL,
      base_version INTEGER NOT NULL, operation_id TEXT NOT NULL, data TEXT NOT NULL, deleted INTEGER NOT NULL, conflict TEXT)`);
    await run(
      "CREATE TABLE IF NOT EXISTS sync_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
    );
    // Los registros antiguos se incorporan sin cambiar sus IDs locales.
    await transaction(async () => {
      const rows = await all(
        "SELECT c.* FROM certificados_bautismo c LEFT JOIN sync_map m ON m.local_id=c.id WHERE m.sync_id IS NULL",
      );
      for (const row of rows) {
        const uuid = randomUUID();
        await run("INSERT INTO sync_map VALUES (?, ?, 0)", [uuid, row.id]);
        await pending(uuid, row.id, 0, row, false);
      }
    });
    state.lastSync =
      (await get("SELECT value FROM sync_settings WHERE key='lastSync'"))
        ?.value || null;
    ready = true;

    // El inicio sin Internet nunca depende de Neon.
    if (autoSync) setImmediate(() => synchronize());
  }
  async function bindDatabase() {
    const { databaseId, protocol } = await remote.identity();
    if (protocol !== 1 || typeof databaseId !== "string")
      throw new Error("API incompatible.");
    const bound = await get(
      "SELECT value FROM sync_settings WHERE key='databaseId'",
    );
    if (bound && bound.value !== databaseId)
      throw Object.assign(
        new Error("Esta copia SQLite pertenece a otra base compartida."),
        { configuration: true },
      );
    await run("INSERT OR IGNORE INTO sync_settings VALUES ('databaseId', ?)", [
      databaseId,
    ]);
    return databaseId;
  }
  async function download(rows, cursor) {
    await transaction(async () => {
      for (const row of rows) {
        if (
          await get("SELECT 1 FROM sync_pending WHERE sync_id=?", [
            row.sync_uuid,
          ])
        )
          continue;
        let mapping = await get("SELECT * FROM sync_map WHERE sync_id=?", [
          row.sync_uuid,
        ]);
        if (mapping && mapping.version >= row.sync_version) continue;
        if (row.sync_deleted) {
          if (mapping) {
            await run("DELETE FROM certificados_bautismo WHERE id=?", [
              mapping.local_id,
            ]);
            await run("UPDATE sync_map SET version=? WHERE sync_id=?", [
              row.sync_version,
              row.sync_uuid,
            ]);
          }
          continue;
        }
        const data = clean(row);
        // Una creación local pendiente con la misma referencia se conserva para revisión.
        const duplicate = await get(
          "SELECT id FROM certificados_bautismo WHERE numeroArchivo=? AND libroBautizo=? AND folioBautizo=?",
          [row.numeroArchivo, row.libroBautizo, row.folioBautizo],
        );
        if (duplicate && duplicate.id !== mapping?.local_id) {
          await run("UPDATE sync_pending SET conflict=? WHERE local_id=?", [
            "Ya existe otro certificado con la misma referencia en Neon.",
            duplicate.id,
          ]);
          continue;
        }
        if (mapping) {
          await run(
            `INSERT INTO certificados_bautismo (id, ${quoted(fields)}) VALUES (?, ${fields.map(() => "?").join(",")}) ON CONFLICT(id) DO UPDATE SET ${fields.map((c) => `"${c}"=excluded."${c}"`).join(",")}`,
            [mapping.local_id, ...fields.map((c) => data[c])],
          );
          await run("UPDATE sync_map SET version=? WHERE sync_id=?", [
            row.sync_version,
            row.sync_uuid,
          ]);
        } else {
          const result = await run(
            `INSERT INTO certificados_bautismo (${quoted(fields)}) VALUES (${fields.map(() => "?").join(",")})`,
            fields.map((c) => data[c]),
          );
          await run("INSERT INTO sync_map VALUES (?, ?, ?)", [
            row.sync_uuid,
            result.lastID,
            row.sync_version,
          ]);
        }
      }
      await run(
        "INSERT OR REPLACE INTO sync_settings VALUES ('apiCursor', ?)",
        [cursor],
      );
    });
  }
  function synchronize() {
    if (!remote || !ready || stopped) return Promise.resolve();
    if (syncPromise) return syncPromise;
    syncPromise = exclusive(async () => {
      state.mode = "syncing";
      try {
        const databaseId = await bindDatabase();
        // Vaciar TODOS los lotes pendientes en este evento, sin esperar otro temporizador.
        while (true) {
          const items = await all(
            "SELECT * FROM sync_pending WHERE conflict IS NULL ORDER BY rowid LIMIT 50",
          );
          if (!items.length) break;
          const { results } = await remote.push(items, databaseId);
          if (
            !Array.isArray(results) ||
            results.length !== items.length ||
            items.some(
              (item) =>
                !results.find((r) => r.operation_id === item.operation_id),
            )
          )
            throw new Error("Confirmación incompleta de la API.");
          await transaction(async () => {
            for (const item of items) {
              const result = results.find(
                (r) => r.operation_id === item.operation_id,
              );
              if (result.conflict)
                await run(
                  "UPDATE sync_pending SET conflict=? WHERE operation_id=?",
                  [result.conflict, item.operation_id],
                );
              else {
                if (
                  typeof result.sync_id !== "string" ||
                  !Number.isInteger(result.version)
                )
                  throw new Error("Confirmación no válida.");
                await run(
                  "UPDATE sync_map SET sync_id=?,version=? WHERE sync_id=?",
                  [result.sync_id, result.version, item.sync_id],
                );
                await run("DELETE FROM sync_pending WHERE operation_id=?", [
                  item.operation_id,
                ]);
              }
            }
          });
        }
        let cursor =
          (await get("SELECT value FROM sync_settings WHERE key='apiCursor'"))
            ?.value || "0";
        while (true) {
          const page = await remote.pull(cursor, databaseId);
          if (
            !Array.isArray(page.rows) ||
            typeof page.cursor !== "string" ||
            !/^\d+$/.test(page.cursor) ||
            (page.more && BigInt(page.cursor) <= BigInt(cursor))
          )
            throw new Error("Página no válida.");
          await download(page.rows, page.cursor);
          cursor = page.cursor;
          if (!page.more) break;
        }
        state.mode = "online";
        state.error = null;
        state.lastSync = new Date().toISOString();
        await run(
          "INSERT OR REPLACE INTO sync_settings VALUES ('lastSync', ?)",
          [state.lastSync],
        );
      } catch (err) {
        state.mode = err.configuration ? "configuration-error" : "offline";
        state.error = err.configuration
          ? err.message
          : "No se pudo contactar con la API. Los cambios siguen guardados en este equipo.";
      }
    }).finally(() => {
      syncPromise = null;
    });
    return syncPromise;
  }
  function scheduleSync() {
    if (!autoSync || stopped) return;
    clearTimeout(timer);
    timer = setTimeout(() => synchronize(), 200);
  }
  const db = {};
  for (const method of ["run", "runWithVersion", "get", "all"]) {
    db[method] = (sql, params, callbackOrVersion, versionCallback) => {
      const expectedVersion =
        method === "runWithVersion" ? callbackOrVersion : undefined;
      let callback =
        method === "runWithVersion" ? versionCallback : callbackOrVersion;
      if (typeof params === "function") {
        callback = params;
        params = [];
      }
      params ||= [];
      const task = exclusive(async () => {
        if (method === "get" || method === "all") {
          const rows = await all(sql, params);
          for (const row of rows)
            if (row.id !== undefined)
              row._syncVersion =
                (
                  await get("SELECT version FROM sync_map WHERE local_id=?", [
                    row.id,
                  ])
                )?.version || 0;
          return method === "get" ? rows[0] : rows;
        }
        const write =
          /^\s*(INSERT INTO|UPDATE|DELETE FROM)\s+certificados_bautismo\b/i.test(
            sql,
          );
        if (!write) return run(sql, params);
        return transaction(async () => {
          const insert = /^\s*INSERT/i.test(sql);
          const deleted = /^\s*DELETE/i.test(sql);
          const old = insert
            ? null
            : await get("SELECT * FROM certificados_bautismo WHERE id=?", [
                params.at(-1),
              ]);
          if (method === "runWithVersion" && old) {
            const version =
              (
                await get("SELECT version FROM sync_map WHERE local_id=?", [
                  old.id,
                ])
              )?.version || 0;
            if (expectedVersion !== version)
              throw Object.assign(
                new Error(
                  "La ficha cambió desde que la abriste. Vuelve a cargarla antes de editar.",
                ),
                { code: "SYNC_STALE" },
              );
          }
          const result = await run(sql, params);
          if (!result.changes) return result;
          const id = insert ? result.lastID : old.id;
          let mapping = await get("SELECT * FROM sync_map WHERE local_id=?", [
            id,
          ]);
          if (!mapping) {
            mapping = { sync_id: randomUUID(), version: 0 };
            await run("INSERT INTO sync_map VALUES (?, ?, 0)", [
              mapping.sync_id,
              id,
            ]);
          }
          const row = deleted
            ? old
            : await get("SELECT * FROM certificados_bautismo WHERE id=?", [id]);
          await pending(mapping.sync_id, id, mapping.version, row, deleted);
          return { ...result, syncWrite: true };
        });
      });
      task.then(
        (result) => {
          if (method === "run" || method === "runWithVersion") {
            callback?.call(result, null);
            if (result.syncWrite) scheduleSync();
          } else callback?.(null, result);
        },
        (err) => callback?.call({}, err),
      );
      return db;
    };
  }
  async function status() {
    return exclusive(async () => ({
      ...state,
      pending: (await get("SELECT COUNT(*) AS total FROM sync_pending")).total,
      conflicts: (
        await all(
          "SELECT local_id, data, deleted, conflict FROM sync_pending WHERE conflict IS NOT NULL",
        )
      ).map((r) => ({
        id: r.local_id,
        name: JSON.parse(r.data).nombreBautizado,
        deleted: Boolean(r.deleted),
        message: r.conflict,
      })),
    }));
  }
  // El usuario puede corregir la ficha y reintentar, o descartar explícitamente su cambio.
  async function resolveConflict(id, choice) {
    if (!["local", "cloud"].includes(choice))
      throw new Error("Opción no válida.");
    if (!remote) throw new Error("Configura la API primero.");
    await exclusive(async () => {
      const item = await get(
        "SELECT * FROM sync_pending WHERE local_id=? AND conflict IS NOT NULL",
        [id],
      );
      if (!item) throw new Error("El conflicto ya no está pendiente.");
      {
        const data = JSON.parse(item.data);
        const databaseId = await bindDatabase();
        const { row: cloudRow } = await remote.lookup({
          databaseId,
          syncId: item.sync_id,
          numeroArchivo: data.numeroArchivo,
          libroBautizo: data.libroBautizo,
          folioBautizo: data.folioBautizo,
        });
        if (!cloudRow) {
          if (choice === "local")
            throw new Error(
              "No se encontró una versión compartida. Corrige los datos del certificado y vuelve a intentar.",
            );
          // Conservar la nube también puede significar aceptar que no existe allí.
          await transaction(async () => {
            await run("DELETE FROM sync_pending WHERE sync_id=?", [
              item.sync_id,
            ]);
            await run("DELETE FROM certificados_bautismo WHERE id=?", [id]);
            await run("DELETE FROM sync_map WHERE local_id=?", [id]);
          });
          return;
        }
        await transaction(async () => {
          if (choice === "cloud") {
            await run("DELETE FROM sync_pending WHERE sync_id=?", [
              item.sync_id,
            ]);
            await run("DELETE FROM certificados_bautismo WHERE id=?", [id]);
            await run(
              "UPDATE sync_map SET sync_id=?, version=0 WHERE local_id=?",
              [cloudRow.sync_uuid, id],
            );
            if (!cloudRow.sync_deleted)
              await run(
                `INSERT INTO certificados_bautismo (id,${quoted(fields)}) VALUES (?,${fields.map(() => "?").join(",")})`,
                [id, ...fields.map((c) => clean(cloudRow)[c])],
              );
            await run("UPDATE sync_map SET version=? WHERE local_id=?", [
              cloudRow.sync_version,
              id,
            ]);
          } else {
            await run(
              "UPDATE sync_map SET sync_id=?, version=? WHERE local_id=?",
              [cloudRow.sync_uuid, cloudRow.sync_version, id],
            );
            await run(
              "UPDATE sync_pending SET sync_id=?, base_version=?, operation_id=?, conflict=NULL WHERE local_id=?",
              [cloudRow.sync_uuid, cloudRow.sync_version, randomUUID(), id],
            );
          }
        });
      }
    });
    await synchronize();
  }
  db.close = (callback) => {
    stopped = true;
    clearTimeout(timer);
    exclusive(async () => {
      await new Promise((resolve, reject) =>
        local.close((err) => (err ? reject(err) : resolve())),
      );
    }).then(
      () => callback?.(),
      (err) => callback?.(err),
    );
  };
  return {
    db,
    initialize: () => exclusive(initialize),
    synchronize,
    status,
    resolveConflict,
    connectionChanged: (online) =>
      online
        ? synchronize()
        : exclusive(async () => {
            state.mode = remote ? "offline" : "unconfigured";
          }),
  };
}
module.exports = { createSyncDatabase };
