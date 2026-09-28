const path = require("path");
const fs = require("fs");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
  quiet: true,
});

const { sqliteSchema, postgresSchema } = require("./schema");

const isProd = process.env.NODE_ENV === "production";

const logger = {
  info: (...args) => {
    if (!isProd) console.log(...args);
  },

  error: (...args) => {
    console.error(...args);
  },
};

const provider = (process.env.DB_PROVIDER || "sqlite").toLowerCase();

if (!["sqlite", "postgres", "sync"].includes(provider)) {
  throw new Error("DB_PROVIDER debe ser sqlite, postgres o sync");
}

let db;
let localDb = null;
let sync = null;
let dbPath = null;

// ======================================================
// PostgreSQL / Neon
// ======================================================

if (provider === "postgres") {
  if (!process.env.DATABASE_URL) {
    throw new Error("Falta DATABASE_URL para PostgreSQL");
  }

  const { Pool } = require("pg");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
  });

  pool.on("error", (err) => {
    logger.error(
      "Se perdió una conexión inactiva con PostgreSQL:",
      err.message,
    );
  });

  db = require("./postgresAdapter").createAdapter(pool);
}

// ======================================================
// SQLite / Sync
// ======================================================
else {
  const sqlite3 = require("sqlite3").verbose();

  if (process.env.BAUTISMO_DATA_DIR) {
    const dataDirectory = process.env.BAUTISMO_DATA_DIR;

    const initialDatabase = path.join(
      __dirname,
      "database",
      "databaseBautismo.sqlite",
    );

    fs.mkdirSync(dataDirectory, {
      recursive: true,
    });

    dbPath = path.join(dataDirectory, "databaseBautismo.sqlite");

    // Primera ejecución:
    // copiar la base inicial.
    if (!fs.existsSync(dbPath) && fs.existsSync(initialDatabase)) {
      fs.copyFileSync(initialDatabase, dbPath);
    }
  } else if (isProd && process.resourcesPath) {
    dbPath = path.join(
      process.resourcesPath,
      "database",
      "databaseBautismo.sqlite",
    );
  } else {
    dbPath = path.resolve(__dirname, "./database/databaseBautismo.sqlite");
  }

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  // Conexión SQLite REAL
  localDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      logger.error("❌ Error al conectar con SQLite:", err.message);
    } else {
      logger.info("✅ Conectado a la base de datos SQLite.");

      logger.info("📂 Ruta usada:", dbPath);
    }
  });

  // busy_timeout siempre sobre SQLite real
  localDb.run("PRAGMA busy_timeout = 5000");

  // SQLite normal
  db = localDb;

  // Modo sincronizado
  if (provider === "sync") {
    if (!process.env.SYNC_API_URL) {
      throw new Error("Falta SYNC_API_URL para modo sync");
    }

    const remote = require("./syncApiClient").createSyncApiClient(
      process.env.SYNC_API_URL,
      process.env.SYNC_API_TOKEN,
    );

    sync = require("./syncDatabase").createSyncDatabase(localDb, remote);

    // La aplicación utiliza la capa sincronizada
    db = sync.db;
  }
}

// ======================================================
// Inicialización
// ======================================================

function inicializarTabla(callback) {
  if (sync) {
    sync.initialize().then(
      () => {
        callback?.(null);
      },

      (err) => {
        logger.error("Error inicializando sincronización:", err.message);

        callback?.(err);
      },
    );

    return;
  }

  const schema = provider === "postgres" ? postgresSchema : sqliteSchema;

  db.run(schema, (err) => {
    if (err) {
      logger.error(
        "No se pudo inicializar la base de datos:",
        err.code || err.message || "error de conexión",
      );
    } else {
      logger.info(`Base de datos lista (${provider}).`);
    }

    callback?.(err || null);
  });
}

module.exports = {
  db,
  localDb,
  inicializarTabla,
  dbPath,
  logger,
  provider,
  sync,
};
