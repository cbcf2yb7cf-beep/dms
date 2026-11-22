// Lokal-Modus: DMS läuft als Mac-App (Electron) nur auf 127.0.0.1, ohne Login.
// Die App setzt bei jedem Start einen zufälligen Schlüssel (DMS_LOCAL_TOKEN) als
// Cookie in ihrem eigenen Fenster; ohne diesen Schlüssel antwortet der Server nicht.
// So kommen weder andere Programme noch Webseiten im Browser an die Daten.

export const LOCAL_COOKIE = "dms-local-token";

export const isLocal = () => Boolean(process.env.DMS_LOCAL_TOKEN);

/** Ordner mit Datenbank und Dateien (nur zur Anzeige in den Einstellungen). */
export const localDataDir = () => process.env.DMS_DATA_DIR ?? "";
