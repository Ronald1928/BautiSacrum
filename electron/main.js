// main.js
const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");
const { spawn } = require("child_process"); //Para Opcion con NSSM no es necesario
const http = require("http");
//const contextMenu = require("electron-context-menu").default;

let mainWindow;
let backendProcess;

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
            misspelledWord
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
      }
    );

    const menu = Menu.buildFromTemplate(menuTemplate);
    menu.popup();
  });

  // Configurar menú contextual con sugerencias ortográficas
  /* contextMenu({
    window: mainWindow,
    showSearchWithGoogle: false,
    showLookUpSelection: false,
    showCopyImage: false,
    showSaveImageAs: false,
    showInspectElement: true,
    spellcheck: true, 
    labels: {
      cut: "Cortar",
      copy: "Copiar",
      paste: "Pegar",
      inspect: "Inspeccionar elemento",
    },
  }); */

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
    const backendPath = path.join(
      process.resourcesPath,
      "bautismo-backend",
      "server.js"
    );
    // Lanzar backend
    backendProcess = spawn("node", [backendPath], {
      stdio: "inherit",
      detached: true,
      windowsHide: true,
    });

    await waitForBackend(4000);

    createWindow("http://localhost:4000");
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
