// main.js
const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  safeStorage,
  powerMonitor,
} = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { spawn } = require("child_process"); //Para Opcion con NSSM no es necesario
const http = require("http");

let mainWindow;
let backendProcess;

function cloudPath() {
  return path.join(app.getPath("userData"), "sync-api-connection.enc");
}
function cloudConfig() {
  const defaults = require("./cloud-public.json");
  if (!fs.existsSync(cloudPath()))
    return {
      url: process.env.SYNC_API_URL || defaults.apiUrl || "",
      token: process.env.SYNC_API_TOKEN || "",
    };
  return JSON.parse(safeStorage.decryptString(fs.readFileSync(cloudPath())));
}
ipcMain.handle("cloud-configured", () => {
  const c = cloudConfig();
  return Boolean(c.url && c.token);
});
ipcMain.handle("cloud-public-url", () => cloudConfig().url);
ipcMain.handle("cloud-configure", async (_, url, token, password) => {
  requireBackupPassword(password);
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("La dirección de la API no es válida.");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  )
    throw new Error("Usa la dirección HTTPS de tu API privada.");
  if (
    typeof token !== "string" ||
    !/^[A-Za-z0-9_-]{32,256}$/.test(token.trim())
  )
    throw new Error("Introduce una clave de activación válida.");
  if (!safeStorage.isEncryptionAvailable())
    throw new Error("Windows no pudo proteger la clave.");
  const { verifyCloudConnection } = require("./verify-cloud");
  await verifyCloudConnection(parsed.href.replace(/\/$/, ""), token.trim());
  const encrypted = safeStorage.encryptString(
    JSON.stringify({
      url: parsed.href.replace(/\/$/, ""),
      token: token.trim(),
    }),
  );
  await waitForBackendExit();
  fs.writeFileSync(cloudPath() + ".tmp", encrypted);
  fs.renameSync(cloudPath() + ".tmp", cloudPath());
  app.relaunch();
  app.quit();
  return { ok: true };
});

function getDatabasePath() {
  return path.join(app.getPath("userData"), "databaseBautismo.sqlite");
}

function getBackupSecurityPath() {
  return path.join(app.getPath("userData"), "respaldo-seguridad.json");
}

function getBackupSecurity() {
  const securityPath = getBackupSecurityPath();
  return fs.existsSync(securityPath)
    ? JSON.parse(fs.readFileSync(securityPath, "utf8"))
    : null;
}

function isValidBackupPassword(password) {
  const security = getBackupSecurity();
  if (!security || typeof password !== "string") return false;

  const derivedKey = crypto.scryptSync(password, security.salt, 64);
  const storedKey = Buffer.from(security.hash, "hex");
  return (
    storedKey.length === derivedKey.length &&
    crypto.timingSafeEqual(storedKey, derivedKey)
  );
}

function requireBackupPassword(password) {
  if (!isValidBackupPassword(password)) {
    throw new Error("La contraseña de respaldo no es correcta.");
  }
}

function waitForBackendExit() {
  return new Promise((resolve, reject) => {
    if (!backendProcess || backendProcess.exitCode !== null) return resolve();
    const timer = setTimeout(
      () =>
        reject(new Error("La base sigue ocupada. Espera y vuelve a intentar.")),
      30000,
    );
    backendProcess.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    if (!backendProcess.connected) {
      clearTimeout(timer);
      return reject(new Error("No se pudo cerrar la base de forma segura."));
    }
    backendProcess.send("shutdown");
  });
}

ipcMain.handle("tiene-contrasena-respaldo", () => Boolean(getBackupSecurity()));

ipcMain.handle("configurar-contrasena-respaldo", (_, password) => {
  if (getBackupSecurity()) {
    throw new Error("La contraseña de respaldo ya fue configurada.");
  }
  if (typeof password !== "string" || password.length < 6) {
    throw new Error("Usa una contraseña de al menos 6 caracteres.");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  fs.writeFileSync(getBackupSecurityPath(), JSON.stringify({ salt, hash }));
  return { configured: true };
});

ipcMain.handle("verificar-contrasena-respaldo", (_, password) =>
  isValidBackupPassword(password),
);

ipcMain.handle("exportar-base-datos", async (_, password) => {
  requireBackupPassword(password);
  const databasePath = getDatabasePath();
  if (!fs.existsSync(databasePath)) {
    throw new Error("No se encontró la base de datos para exportar.");
  }

  const result = await dialog.showSaveDialog({
    title: "Exportar base de datos",
    defaultPath: `bautismos-${new Date().toISOString().slice(0, 10)}.sqlite`,
    filters: [{ name: "Base de datos SQLite", extensions: ["sqlite"] }],
  });

  if (result.canceled || !result.filePath) return { canceled: true };

  await waitForBackendExit();
  fs.copyFileSync(databasePath, result.filePath);
  app.relaunch();
  app.quit();
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle("importar-base-datos", async (_, password) => {
  requireBackupPassword(password);
  const result = await dialog.showOpenDialog({
    title: "Importar base de datos",
    properties: ["openFile"],
    filters: [{ name: "Base de datos SQLite", extensions: ["sqlite", "db"] }],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const sourcePath = result.filePaths[0];
  const header = Buffer.alloc(16);
  const fileDescriptor = fs.openSync(sourcePath, "r");
  fs.readSync(fileDescriptor, header, 0, header.length, 0);
  fs.closeSync(fileDescriptor);

  if (header.toString("utf8") !== "SQLite format 3\u0000") {
    throw new Error(
      "El archivo seleccionado no es una base de datos SQLite válida.",
    );
  }

  await waitForBackendExit();
  const automaticBackupDir = path.join(
    app.getPath("userData"),
    "respaldos-automaticos",
  );
  fs.mkdirSync(automaticBackupDir, { recursive: true });
  const automaticBackupPath = path.join(
    automaticBackupDir,
    `antes-de-importar-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`,
  );

  if (fs.existsSync(getDatabasePath())) {
    fs.copyFileSync(getDatabasePath(), automaticBackupPath);
  }
  fs.copyFileSync(sourcePath, getDatabasePath());

  // Se reinicia para abrir la base importada sin conservar conexiones antiguas.
  app.relaunch();
  app.quit();
  return { canceled: false };
});

function getBundledChromiumPath() {
  if (!app.isPackaged) return undefined;

  const chromeCache = path.join(
    process.resourcesPath,
    "puppeteer-cache",
    "chrome",
  );
  try {
    const versions = fs.readdirSync(chromeCache).sort().reverse();
    return versions
      .map((version) =>
        path.join(chromeCache, version, "chrome-win64", "chrome.exe"),
      )
      .find((executablePath) => fs.existsSync(executablePath));
  } catch (error) {
    console.error("❌ No se pudo localizar Chromium incluido:", error);
    return undefined;
  }
}

/**
 * Espera a que el backend responda antes de cargar la ventana
 */
function waitForBackend(port = 4000, retries = 10, delay = 1000) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      if (n === 0) return reject(new Error("Backend no respondió"));
      http
        .get(`http://localhost:${port}`, () => resolve())
        .on("error", () => setTimeout(() => attempt(n - 1), delay));
    };
    attempt(retries);
  });
}

/**
 * Crear ventana principal
 */
function createWindow(API_URL = "http://localhost:4000") {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: true,
    },
    icon: path.join(__dirname, "build/icon.ico"), // <-- aquí tu ícono
  });

  // Configurar menú de la aplicación
  mainWindow.webContents.on("context-menu", (event, params) => {
    const { dictionarySuggestions = [], misspelledWord } = params;

    const menuTemplate = [];

    // Si hay sugerencias ortográficas
    if (dictionarySuggestions.length > 0) {
      dictionarySuggestions.forEach((suggestion) => {
        menuTemplate.push({
          label: suggestion,
          click: () => mainWindow.webContents.replaceMisspelling(suggestion),
        });
      });
    }

    // Si hay una palabra mal escrita
    if (misspelledWord) {
      menuTemplate.push({
        type: "separator",
      });
      menuTemplate.push({
        label: "Aprender palabra", // 👈 traducido aquí
        click: () =>
          mainWindow.webContents.session.addWordToSpellCheckerDictionary(
            misspelledWord,
          ),
      });
    }

    // Agregar menú por defecto (copiar, pegar, etc.)
    menuTemplate.push(
      { type: "separator" },
      {
        label: "Deshacer",
        accelerator: "CmdOrCtrl+Z",
        click: () => mainWindow.webContents.undo(),
      },
      {
        label: "Rehacer",
        accelerator: "CmdOrCtrl+Y",
        click: () => mainWindow.webContents.redo(),
      },
      { type: "separator" },
      {
        label: "Cortar",
        accelerator: "CmdOrCtrl+X",
        click: () => mainWindow.webContents.cut(),
      },
      {
        label: "Copiar",
        accelerator: "CmdOrCtrl+C",
        click: () => mainWindow.webContents.copy(),
      },
      {
        label: "Pegar",
        accelerator: "CmdOrCtrl+V",
        click: () => mainWindow.webContents.paste(),
      },
      {
        label: "Seleccionar todo",
        accelerator: "CmdOrCtrl+A",
        click: () => mainWindow.webContents.selectAll(),
      },
    );

    const menu = Menu.buildFromTemplate(menuTemplate);
    menu.popup();
  });

  // Inyectar config al frontend
  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.send("config", { API_URL });
  });

  const startUrl =
    process.env.ELECTRON_START_URL ||
    path.join(__dirname, "../iglesia-bautismo-frontend/dist/index.html");

  if (process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    mainWindow.loadFile(startUrl).catch((err) => {
      console.error("Error cargando archivo:", err);
    });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * Cuando la app está lista
 */
app.whenReady().then(async () => {
  try {
    // En desarrollo el backend está junto al proyecto; empaquetado queda en resources.
    const backendPath = app.isPackaged
      ? path.join(process.resourcesPath, "bautismo-backend", "server.js")
      : path.join(__dirname, "..", "bautismo-backend", "server.js");
    const backendLogPath = path.join(app.getPath("userData"), "backend.log");
    // El descriptor se abre antes de spawn para que Electron pueda redirigir los logs.
    const backendLogFd = fs.openSync(backendLogPath, "a");
    const chromiumPath = getBundledChromiumPath();

    // Usamos el runtime incluido en Electron, no una instalación externa de Node.js.
    backendProcess = spawn(process.execPath, [backendPath], {
      cwd: path.dirname(backendPath),
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
        BAUTISMO_DESKTOP: "1",
        DB_PROVIDER: "sync",
        DATABASE_URL: "",
        SYNC_API_URL: cloudConfig().url,
        SYNC_API_TOKEN: cloudConfig().token,
        // Los datos deben guardarse en una carpeta con permiso de escritura.
        BAUTISMO_DATA_DIR: app.getPath("userData"),
        // Chromium se distribuye junto con la aplicación para generar PDFs sin instalar Chrome.
        PUPPETEER_CACHE_DIR: app.isPackaged
          ? path.join(process.resourcesPath, "puppeteer-cache")
          : process.env.PUPPETEER_CACHE_DIR,
        PUPPETEER_EXECUTABLE_PATH:
          chromiumPath || process.env.PUPPETEER_EXECUTABLE_PATH,
        // El backend es un recurso externo; sus dependencias están en app.asar.
        NODE_PATH: app.isPackaged
          ? [
              path.join(process.resourcesPath, "app.asar", "node_modules"),
              process.env.NODE_PATH,
            ]
              .filter(Boolean)
              .join(path.delimiter)
          : process.env.NODE_PATH,
      },
      stdio: ["ignore", backendLogFd, backendLogFd, "ipc"],
      windowsHide: true,
    });

    backendProcess.once("error", (error) => {
      console.error("❌ No se pudo iniciar el backend:", error);
    });

    await waitForBackend(4000);

    createWindow("http://localhost:4000");
    powerMonitor.on("resume", () => {
      if (backendProcess?.connected) backendProcess.send("network-resume");
    });
  } catch (err) {
    console.error("❌ Error iniciando backend:", err);
    app.quit();
  }
});

/**
 * Cerrar backend al salir
 */
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (backendProcess) backendProcess.kill();
    app.quit();
  }
});
