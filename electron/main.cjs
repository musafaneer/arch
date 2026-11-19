const { app, BrowserWindow, ipcMain, dialog, Notification, shell } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow = null;

// Determine environment
const isDev = !app.isPackaged && process.env.NODE_ENV !== "production";

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: "منظومة الأرشيف الرقمي السيادي - وزارة المالية الليبية",
    backgroundColor: "#0d2b1d",
    frame: process.platform === "darwin", // Custom titlebar on Windows/Linux, native on macOS
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      devTools: isDev
    },
    icon: path.join(__dirname, "../public/icon-512.png")
  });

  // Remove default menu for sleek sovereign app look
  mainWindow.setMenuBarVisibility(false);

  // Load app: dev server url or static production dist
  if (isDev && process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else if (fs.existsSync(path.join(__dirname, "../dist/index.html"))) {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  } else {
    // Fallback to local dev server port 3000
    mainWindow.loadURL("http://localhost:3000");
  }

  // Open external links in default web browser, not inside the Electron app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// IPC Handlers for Desktop Integration
ipcMain.handle("app:get-info", () => {
  return {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    isElectron: true,
    isPackaged: app.isPackaged
  };
});

ipcMain.on("window:minimize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.on("window:maximize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on("window:close", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

ipcMain.handle("dialog:save-file", async (event, { title, defaultPath, filters, data, isBase64 }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showSaveDialog(win, {
    title: title || "حفظ الوثيقة الأرشيفية",
    defaultPath: defaultPath || "mof-archive-export.pdf",
    filters: filters || [
      { name: "PDF Document", extensions: ["pdf"] },
      { name: "All Files", extensions: ["*"] }
    ]
  });

  if (!result.canceled && result.filePath) {
    try {
      const buffer = isBase64 ? Buffer.from(data, "base64") : Buffer.from(data, "utf8");
      fs.writeFileSync(result.filePath, buffer);
      return { success: true, filePath: result.filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: false, canceled: true };
});

ipcMain.handle("system:show-notification", (event, { title, body, icon }) => {
  if (Notification.isSupported()) {
    const notif = new Notification({
      title: title || "منظومة الأرشيف المالي",
      body: body || "",
      icon: icon ? path.join(__dirname, icon) : undefined
    });
    notif.show();
    return true;
  }
  return false;
});

ipcMain.handle("system:print-page", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.webContents.print({ silent: false, printBackground: true });
    return true;
  }
  return false;
});
