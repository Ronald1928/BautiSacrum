const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getConfig: (callback) =>
    ipcRenderer.on("config", (_, data) => callback(data)),
});
