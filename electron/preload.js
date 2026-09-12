const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  cloudConfigured: () => ipcRenderer.invoke("cloud-configured"),
  cloudPublicUrl: () => ipcRenderer.invoke("cloud-public-url"),
  configureCloud: (url, token, password) =>
    ipcRenderer.invoke("cloud-configure", url, token, password),
  getConfig: (callback) =>
    ipcRenderer.on("config", (_, data) => callback(data)),
  tieneContrasenaRespaldo: () =>
    ipcRenderer.invoke("tiene-contrasena-respaldo"),
  configurarContrasenaRespaldo: (password) =>
    ipcRenderer.invoke("configurar-contrasena-respaldo", password),
  verificarContrasenaRespaldo: (password) =>
    ipcRenderer.invoke("verificar-contrasena-respaldo", password),
  exportarBaseDatos: (password) =>
    ipcRenderer.invoke("exportar-base-datos", password),
  importarBaseDatos: (password) =>
    ipcRenderer.invoke("importar-base-datos", password),
});
