const fs = require("fs");
const path = require("path");
const os = require("os");

const { logger, provider, localDb } = require("../dbConnection");

const backupDir =
  process.env.BAUTISMO_BACKUP_DIR ||
  path.join(os.homedir(), "BackupsBautiSacrum");

const lastBackupFile = path.join(backupDir, "lastBackup.json");

const INTERVALO_HORAS = 6;
const MAX_BACKUPS = 10;

async function hacerBackup() {
  if (!["sqlite", "sync"].includes(provider)) return;

  if (!localDb) {
    logger.error("No existe una base SQLite local para realizar el backup.");
    return;
  }

  try {
    // Crear carpeta si no existe
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Nombre del archivo con fecha y hora
    const fecha = new Date().toISOString().replace(/[:.]/g, "-");

    const backupPath = path.join(backupDir, `backup-${fecha}.sqlite`);

    // Crear una copia consistente de SQLite
    await new Promise((resolve, reject) => {
      localDb.run("VACUUM INTO ?", [backupPath], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    guardarUltimaEjecucion();
    limpiarBackups();

    logger.info(`Backup creado correctamente: ${backupPath}`);
  } catch (error) {
    logger.error("No se pudo crear el backup:", error.message);
    logger.error(error);
  }
}

// Guardar última ejecución
function guardarUltimaEjecucion() {
  try {
    fs.writeFileSync(
      lastBackupFile,
      JSON.stringify(
        {
          ultimaEjecucion: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    logger.error("Error guardando fecha de backup:", error.message);
  }
}

// Verificar si han pasado 6 horas
function verificarSiDebeHacerBackup() {
  if (!["sqlite", "sync"].includes(provider)) return;

  try {
    if (!fs.existsSync(lastBackupFile)) {
      hacerBackup();
      return;
    }

    const data = JSON.parse(fs.readFileSync(lastBackupFile, "utf8"));

    const last = new Date(data.ultimaEjecucion);
    const now = new Date();

    const MS_POR_HORA = 1000 * 60 * 60;

    const diffHoras = (now.getTime() - last.getTime()) / MS_POR_HORA;

    if (diffHoras >= INTERVALO_HORAS) {
      hacerBackup();
    }
  } catch (error) {
    logger.error("Error verificando backup:", error.message);
  }
}

function limpiarBackups() {
  try {
    const files = fs
      .readdirSync(backupDir)

      // Solo contar archivos de backup SQLite
      .filter((file) => file.startsWith("backup-") && file.endsWith(".sqlite"))

      .map((file) => ({
        name: file,
        time: fs.statSync(path.join(backupDir, file)).mtime.getTime(),
      }))

      // Más recientes primero
      .sort((a, b) => b.time - a.time);

    if (files.length > MAX_BACKUPS) {
      const filesToDelete = files.slice(MAX_BACKUPS);

      filesToDelete.forEach((file) => {
        fs.unlinkSync(path.join(backupDir, file.name));
      });
    }
  } catch (error) {
    logger.error("Error limpiando backups:", error.message);
  }
}

// Ejecutar mientras la app está abierta
function iniciarBackupAutomatico() {
  if (!["sqlite", "sync"].includes(provider)) return;

  setInterval(
    () => {
      hacerBackup();
    },
    INTERVALO_HORAS * 60 * 60 * 1000,
  );
}

module.exports = {
  hacerBackup,
  verificarSiDebeHacerBackup,
  iniciarBackupAutomatico,
};
