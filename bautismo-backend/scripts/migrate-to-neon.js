// Copia explícita a un destino vacío, conservando IDs y sin modificar SQLite.
const fs = require("fs");
const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
  quiet: true,
});
const { Pool } = require("pg");
const sqlite3 = require("sqlite3");
const { columns, postgresSchema } = require("../schema");

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Configura DATABASE_URL.");
  const input = process.argv[2];
  if (!input)
    throw new Error(
      'Indica la ruta completa del SQLite: npm run migrate:neon -- "C:/ruta/databaseBautismo.sqlite"',
    );
  const sourcePath = path.resolve(input);
  if (!fs.existsSync(sourcePath))
    throw new Error("El archivo SQLite no existe.");
  const source = await new Promise((resolve, reject) => {
    const db = new sqlite3.Database(sourcePath, sqlite3.OPEN_READONLY, (err) =>
      err ? reject(err) : resolve(db),
    );
  });
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 15000,
  });
  let client;
  try {
    const rows = await new Promise((resolve, reject) =>
      source.all(
        "SELECT * FROM certificados_bautismo ORDER BY id",
        (err, rows) => (err ? reject(err) : resolve(rows)),
      ),
    );
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query(postgresSchema);
    await client.query(
      "LOCK TABLE certificados_bautismo IN ACCESS EXCLUSIVE MODE",
    );
    const result = await client.query(
      "SELECT COUNT(*) AS total FROM certificados_bautismo",
    );
    if (Number(result.rows[0].total) !== 0)
      throw new Error(
        "El destino tiene certificados. Se canceló la copia para evitar duplicados o sobrescrituras.",
      );
    const sql = `INSERT INTO certificados_bautismo (${columns.map((c) => '"' + c + '"').join(", ")}) VALUES (${columns.map((_, i) => "$" + (i + 1)).join(", ")})`;
    for (const row of rows)
      await client.query(
        sql,
        columns.map((c) => (row[c] === "" ? null : (row[c] ?? null))),
      );
    await client.query(
      `SELECT setval(pg_get_serial_sequence('certificados_bautismo', 'id'), COALESCE(MAX(id), 1), COUNT(*) > 0) FROM certificados_bautismo`,
    );
    await client.query("COMMIT");
    console.log(
      `Migración completada: ${rows.length} certificados. SQLite no fue modificado.`,
    );
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    throw err;
  } finally {
    client?.release();
    await pool.end();
    await new Promise((resolve, reject) =>
      source.close((err) => (err ? reject(err) : resolve())),
    );
  }
}
main().catch((err) => {
  console.error("Migración cancelada:", err.code || err.message);
  process.exitCode = 1;
});
