const { contextBridge, ipcRenderer } = require("electron");

// Secure bridge exposing native capabilities to the React application
contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  
  // Platform & Environment Info
  getAppInfo: () => ipcRenderer.invoke("app:get-info"),
  
  // Window controls for custom desktop titlebar
  minimizeWindow: () => ipcRenderer.send("window:minimize"),
  maximizeWindow: () => ipcRenderer.send("window:maximize"),
  closeWindow: () => ipcRenderer.send("window:close"),

  // Native desktop dialogs
  saveFile: (options) => ipcRenderer.invoke("dialog:save-file", options),

  // System Notifications
  showNotification: (options) => ipcRenderer.invoke("system:show-notification", options),

  // Native Printing
  printPage: () => ipcRenderer.invoke("system:print-page")
});
