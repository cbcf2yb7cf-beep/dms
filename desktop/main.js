// DMS als Mac-App: startet den Next.js-Server (aus ../.next/standalone bzw. Resources/server)
// nur auf 127.0.0.1 und öffnet ihn in einem eigenen Fenster. Daten: ~/Library/Application Support/DMS
const { app, BrowserWindow, Menu, dialog, session, shell, utilityProcess } = require("electron");
const { execFileSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");

if (!app.requestSingleInstanceLock()) app.quit();

const dataDir = app.getPath("userData");
const logDir = path.join(dataDir, "logs");
// Neuer Schlüssel bei jedem Start: nur dieses Fenster bekommt ihn als Cookie (siehe src/proxy.ts).
const token = crypto.randomBytes(32).toString("hex");

let server = null;
let win = null;
let baseUrl = "";
let shuttingDown = false;

/** Geheimnis für NextAuth-intern; bleibt über Neustarts gleich, nur für den Benutzer lesbar. */
function secret() {
  const file = path.join(dataDir, "secret");
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32).toString("base64"), { mode: 0o600 });
  return fs.readFileSync(file, "utf8").trim();
}

/** Voller Name des Mac-Kontos ("Sascha Wiebe"), sonst Kurzname. */
function userName() {
  try {
    return execFileSync("id", ["-F"], { encoding: "utf8" }).trim();
  } catch {
    return os.userInfo().username;
  }
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function startServer() {
  fs.mkdirSync(logDir, { recursive: true });
  const port = await freePort();
  baseUrl = `http://127.0.0.1:${port}`;
  const dir = app.isPackaged ? path.join(process.resourcesPath, "server") : path.join(__dirname, "..", ".next", "standalone");
  const log = fs.createWriteStream(path.join(logDir, "server.log"), { flags: "a" });
  log.write(`\n--- Start ${new Date().toISOString()} (DMS ${app.getVersion()}) ---\n`);

  server = utilityProcess.fork(path.join(dir, "server.js"), [], {
    cwd: dir,
    stdio: "pipe",
    serviceName: "DMS Server",
    env: {
      ...process.env,
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      DATABASE_PATH: path.join(dataDir, "app.db"),
      DMS_DATA_DIR: dataDir,
      DMS_LOCAL_TOKEN: token,
      DMS_USER_NAME: userName(),
      NEXTAUTH_SECRET: secret(),
      NEXTAUTH_URL: baseUrl,
    },
  });
  server.stdout?.pipe(log);
  server.stderr?.pipe(log);
  server.on("exit", (code) => {
    if (shuttingDown) return;
    dialog.showErrorBox("DMS", `Der DMS-Dienst wurde unerwartet beendet (Code ${code}).\n\nDetails stehen in:\n${path.join(logDir, "server.log")}`);
    app.exit(1);
  });

  // Warten, bis der Server antwortet (robots.txt braucht keinen Schlüssel).
  for (let i = 0; i < 150; i++) {
    try {
      if ((await fetch(`${baseUrl}/robots.txt`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("Der DMS-Dienst startet nicht.");
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 600,
    title: "DMS",
    backgroundColor: "#f6f1e7",
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: true },
  });
  win.once("ready-to-show", () => win.show());

  // Fremde Links im Standardbrowser öffnen, das App-Fenster bleibt bei DMS.
  const inside = (url) => url === baseUrl || url.startsWith(`${baseUrl}/`);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!inside(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!inside(url)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  // Der Editor meldet ungespeicherte Änderungen (beforeunload) – in Electron gibt es dafür keinen Dialog.
  win.webContents.on("will-prevent-unload", (event) => {
    const choice = dialog.showMessageBoxSync(win, {
      type: "warning",
      buttons: ["Trotzdem schließen", "Abbrechen"],
      defaultId: 1,
      cancelId: 1,
      message: "Es gibt noch ungespeicherte Änderungen.",
      detail: "Warte einen Moment, bis oben „Gespeichert“ steht – oder schließe trotzdem.",
    });
    if (choice === 0) event.preventDefault();
  });

  win.on("closed", () => {
    win = null;
    shutdown();
  });
  void win.loadURL(baseUrl);
}

/** Fenster ist zu: dem Server kurz Zeit für letzte Speicherungen lassen, dann beenden. */
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  setTimeout(() => {
    server?.kill();
    app.exit(0);
  }, 1500);
}

function buildMenu() {
  const sep = { type: "separator" };
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "DMS",
        submenu: [
          { role: "about", label: "Über DMS" },
          sep,
          { label: "Datenordner im Finder zeigen", click: () => void shell.openPath(dataDir) },
          { label: "Protokoll anzeigen", click: () => void shell.openPath(path.join(logDir, "server.log")) },
          sep,
          { role: "hide", label: "DMS ausblenden" },
          { role: "hideOthers", label: "Andere ausblenden" },
          { role: "unhide", label: "Alle einblenden" },
          sep,
          { role: "quit", label: "DMS beenden" },
        ],
      },
      {
        label: "Bearbeiten",
        submenu: [
          { role: "undo", label: "Widerrufen" },
          { role: "redo", label: "Wiederholen" },
          sep,
          { role: "cut", label: "Ausschneiden" },
          { role: "copy", label: "Kopieren" },
          { role: "paste", label: "Einsetzen" },
          { role: "pasteAndMatchStyle", label: "Einsetzen und Stil anpassen" },
          { role: "selectAll", label: "Alles auswählen" },
        ],
      },
      {
        label: "Darstellung",
        submenu: [
          { role: "reload", label: "Neu laden" },
          sep,
          { role: "resetZoom", label: "Originalgröße" },
          { role: "zoomIn", label: "Vergrößern" },
          { role: "zoomOut", label: "Verkleinern" },
          sep,
          { role: "togglefullscreen", label: "Vollbild" },
        ],
      },
      { role: "windowMenu", label: "Fenster" },
    ]),
  );
}

app.on("second-instance", () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

// ⌘Q: erst das Fenster schließen (Editor kann noch speichern bzw. nachfragen), dann beenden.
app.on("before-quit", (event) => {
  if (shuttingDown || !win) return;
  event.preventDefault();
  win.close();
});

app.whenReady().then(async () => {
  app.setAboutPanelOptions({ applicationName: "DMS", applicationVersion: app.getVersion(), copyright: "Predigten, Vorträge und Bibel" });
  buildMenu();
  try {
    await startServer();
    await session.defaultSession.cookies.set({ url: baseUrl, name: "dms-local-token", value: token, httpOnly: true, sameSite: "strict" });
    createWindow();
  } catch (error) {
    dialog.showErrorBox("DMS", `DMS konnte nicht gestartet werden.\n\n${error.message}\n\nDetails: ${path.join(logDir, "server.log")}`);
    shuttingDown = true;
    server?.kill();
    app.exit(1);
  }
});
