const express = require("express");
const cors = require("cors");
require("dotenv").config({
  path: require("path").join(__dirname, ".env"),
  quiet: true,
});
const bautismoRoutes = require("./routes/bautismoRoutes");
const { db, inicializarTabla, sync, provider } = require("./dbConnection");
const {
  verificarSiDebeHacerBackup,
  iniciarBackupAutomatico,
} = require("./services/backupService");
const { logger } = require("./dbConnection");

const app = express();
let httpServer;
process.on("message", (message) => {
  if (message === "network-resume") {
    sync?.synchronize();
    return;
  }
  if (message !== "shutdown") return;
  httpServer?.close();
  db.close((err) => process.exit(err ? 1 : 0));
});

process.on("uncaughtException", (error) => {
  console.error("❌ Error no controlado del backend:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("❌ Promesa rechazada sin controlar:", error);
});

// Configuración de CORS
app.use(
  cors({
    origin: process.env.BAUTISMO_DESKTOP
      ? ["http://localhost:5173", "null"]
      : ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

app.get("/api/sync/status", async (req, res) => {
  try {
    res.json(
      sync
        ? await sync.status()
        : { mode: provider, pending: 0, conflicts: [], lastSync: null },
    );
  } catch {
    res
      .status(503)
      .json({ message: "La base de datos todavía no está lista." });
  }
});
app.post("/api/sync/network", async (req, res) => {
  await sync?.connectionChanged(req.body.online === true);
  res.json({ ok: true });
});
app.post("/api/sync/retry", async (req, res) => {
  try {
    await sync?.synchronize();
    res.json({ ok: true });
  } catch {
    res.status(503).json({ message: "No se pudo sincronizar." });
  }
});
app.post("/api/sync/resolve", async (req, res) => {
  try {
    if (!sync) throw new Error("Sincronización no activa.");
    await sync.resolveConflict(req.body.id, req.body.choice);
    res.json({ ok: true });
  } catch {
    res
      .status(409)
      .json({
        message:
          "No se pudo resolver. Revisa la conexión, corrige los datos o vuelve a intentarlo.",
      });
  }
});

// Inicializamos tabla y luego arrancamos servidor
inicializarTabla((err) => {
  if (err) {
    db.close(() => {
      process.exitCode = 1;
    });
    return;
  }
  verificarSiDebeHacerBackup();
  iniciarBackupAutomatico();
  app.use("/api/certificados_bautismo", bautismoRoutes);

  const PORT = process.env.PORT || 4000;
  httpServer = app.listen(
    PORT,
    process.env.BAUTISMO_DESKTOP ? "127.0.0.1" : undefined,
    () => {
      logger.info(`Servidor corriendo en puerto ${PORT}`);
    },
  );
});
