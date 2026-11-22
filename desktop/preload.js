// Brücke zwischen Fenster und Mac: nur diese eine Funktion, keine Node-Rechte im Fenster.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dmsDesktop", {
  /** Originaldatei als schreibgeschützte Kopie im passenden Programm öffnen (Word, PowerPoint, Vorschau). */
  openOriginal: (file) => ipcRenderer.invoke("dms:open-original", file),
});
