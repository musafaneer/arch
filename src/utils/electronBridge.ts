/**
 * Electron Bridge Interface & Utilities
 * Provides seamless fallback when running in a standard web browser (AI Studio preview)
 * and native desktop features when running inside Electron (Windows, macOS, Linux).
 */

export interface ElectronAppInfo {
  version: string;
  platform: string;
  arch: string;
  isElectron: boolean;
  isPackaged: boolean;
}

export interface ElectronSaveFileOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
  data: string; // text content or base64
  isBase64?: boolean;
}

export interface ElectronSaveResult {
  success: boolean;
  filePath?: string;
  canceled?: boolean;
  error?: string;
}

export interface ElectronNotificationOptions {
  title: string;
  body: string;
  icon?: string;
}

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      getAppInfo: () => Promise<ElectronAppInfo>;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      saveFile: (options: ElectronSaveFileOptions) => Promise<ElectronSaveResult>;
      showNotification: (options: ElectronNotificationOptions) => Promise<boolean>;
      printPage: () => Promise<boolean>;
    };
  }
}

/**
 * Returns whether the application is running inside the native Electron desktop shell.
 */
export function isElectron(): boolean {
  return typeof window !== "undefined" && Boolean(window.electronAPI?.isElectron);
}

/**
 * Retrieves platform info from Electron main process, or fallback info for web.
 */
export async function getAppEnvironment(): Promise<ElectronAppInfo> {
  if (isElectron() && window.electronAPI?.getAppInfo) {
    try {
      return await window.electronAPI.getAppInfo();
    } catch {
      // fallback
    }
  }
  return {
    version: "2.4.0-web",
    platform: typeof navigator !== "undefined" ? navigator.platform : "web",
    arch: "wasm/web",
    isElectron: false,
    isPackaged: true
  };
}

/**
 * Minimize native desktop window
 */
export function minimizeWindow(): void {
  if (isElectron() && window.electronAPI?.minimizeWindow) {
    window.electronAPI.minimizeWindow();
  }
}

/**
 * Maximize / Restore native desktop window
 */
export function maximizeWindow(): void {
  if (isElectron() && window.electronAPI?.maximizeWindow) {
    window.electronAPI.maximizeWindow();
  }
}

/**
 * Close native desktop window
 */
export function closeWindow(): void {
  if (isElectron() && window.electronAPI?.closeWindow) {
    window.electronAPI.closeWindow();
  }
}

/**
 * Shows a native desktop system notification, falling back to browser Notification API.
 */
export async function triggerNativeNotification(
  title: string,
  body: string,
  icon?: string
): Promise<boolean> {
  if (isElectron() && window.electronAPI?.showNotification) {
    return await window.electronAPI.showNotification({ title, body, icon });
  }

  // Fallback to Web Notification API if permitted
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification(title, { body, icon });
      return true;
    } else if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        new Notification(title, { body, icon });
        return true;
      }
    }
  }
  return false;
}

/**
 * Triggers native desktop printing or browser window.print()
 */
export async function triggerPrint(): Promise<void> {
  if (isElectron() && window.electronAPI?.printPage) {
    await window.electronAPI.printPage();
    return;
  }
  if (typeof window !== "undefined") {
    window.print();
  }
}

/**
 * Saves a file using native desktop Save Dialog, or triggers browser download fallback.
 */
export async function saveFileWithNativeFallback(
  filename: string,
  content: string | Blob,
  mimeType: string = "application/json"
): Promise<{ success: boolean; filePath?: string }> {
  // If running inside Electron, use native desktop save dialog
  if (isElectron() && window.electronAPI?.saveFile) {
    let dataString = "";
    let isBase64 = false;

    if (typeof content === "string") {
      dataString = content;
    } else if (content instanceof Blob) {
      const arrayBuffer = await content.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      dataString = btoa(binary);
      isBase64 = true;
    }

    const extension = filename.split(".").pop() || "txt";
    const res = await window.electronAPI.saveFile({
      title: "تصدير الملف من الأرشيف الرقمي السيادي",
      defaultPath: filename,
      filters: [{ name: `${extension.toUpperCase()} File`, extensions: [extension] }],
      data: dataString,
      isBase64
    });

    return { success: res.success, filePath: res.filePath };
  }

  // Browser download fallback
  try {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { success: true };
  } catch (err) {
    console.error("Browser download fallback failed:", err);
    return { success: false };
  }
}
