const { columns } = require("./schema");

// Compatibilidad con las consultas simples run/get/all de este backend.
// Los valores continúan separados del SQL; no es un traductor SQL general.
function translate(sql) {
  let index = 0;
  return sql.replace(
    /'(?:''|[^'])*'|"(?:""|[^"])*"|\?|\b[A-Za-z_][A-Za-z_0-9]*\b/g,
    (token) => {
      if (token === "?") return "$" + ++index;
      if (columns.includes(token)) return '"' + token + '"';
      if (token.toUpperCase() === "LIKE") return "ILIKE";
      return token;
    },
  );
}

function createAdapter(pool) {
  const db = {};
  for (const method of ["run", "get", "all"]) {
    db[method] = (sql, params, callback) => {
      if (typeof params === "function") {
        callback = params;
        params = [];
      }
      let query = translate(sql);
      if (method === "run" && /^\s*INSERT\b/i.test(query))
        query = query.trim().replace(/;$/, "") + " RETURNING id";
      // Los formularios envían cadenas vacías para fechas opcionales.
      const values = (params || []).map((value) =>
        value === "" ? null : value,
      );
      pool.query(query, values).then(
        (result) => {
          const context = {
            lastID: result.rows[0]?.id,
            changes: result.rowCount,
          };
          if (callback)
            callback.call(
              context,
              null,
              method === "get" ? result.rows[0] : result.rows,
            );
        },
        (err) => {
          if (callback) callback.call({ changes: 0 }, err);
          else console.error("Error PostgreSQL:", err.code || "conexión");
        },
      );
      return db;
    };
  }
  db.close = (callback) =>
    pool.end().then(
      () => callback?.(null),
      (err) => callback?.(err),
    );
  return db;
}
module.exports = { createAdapter, translate };
