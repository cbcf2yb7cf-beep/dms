// Brücke zwischen Fenster und Mac: nur diese eine Funktion, keine Node-Rechte im Fenster.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dmsDesktop", {
  /** Originaldatei als schreibgeschützte Kopie im passenden Programm öffnen (Word, PowerPoint, Vorschau). */
  openOriginal: (file) => ipcRenderer.invoke("dms:open-original", file),
  /** Präsentation im Vollbild auf dem zweiten Bildschirm (Beamer) – sonst auf diesem. */
  presentOnDisplay: (path) => ipcRenderer.invoke("dms:present", path),
  /** Claude-API-Schlüssel im macOS-Schlüsselbund speichern / entfernen. */
  setApiKey: (key) => ipcRenderer.invoke("dms:set-api-key", key),
  clearApiKey: () => ipcRenderer.invoke("dms:clear-api-key"),
});
