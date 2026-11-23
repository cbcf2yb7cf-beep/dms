// Brücke zwischen Fenster und Mac: nur diese eine Funktion, keine Node-Rechte im Fenster.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dmsDesktop", {
  /** Originaldatei als schreibgeschützte Kopie im passenden Programm öffnen (Word, PowerPoint, Vorschau). */
  openOriginal: (file) => ipcRenderer.invoke("dms:open-original", file),
  /** Präsentation im Vollbild auf dem zweiten Bildschirm (Beamer) – sonst auf diesem. */
  presentOnDisplay: (path) => ipcRenderer.invoke("dms:present", path),
});
