"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Bridge = { setApiKey?: (key: string) => Promise<string>; clearApiKey?: () => Promise<string> };

/** Mac-App: Claude-Schlüssel im macOS-Schlüsselbund speichern (verschlüsselt, nie in der Datenbank). */
export function ApiKeyForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [bridge, setBridge] = useState<Bridge | undefined>();
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => setBridge((window as unknown as { dmsDesktop?: Bridge }).dmsDesktop), []);

  if (!bridge?.setApiKey) {
    return <p className="text-sm text-muted">{configured ? "Schlüssel ist hinterlegt (Umgebungsvariable ANTHROPIC_API_KEY)." : "Den Schlüssel trägst du in der Mac-App ein (oder als Umgebungsvariable ANTHROPIC_API_KEY)."}</p>;
  }
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const err = await bridge.setApiKey!(key.trim());
        setMsg(err ? { ok: false, text: err } : { ok: true, text: "Gespeichert (macOS-Schlüsselbund)." });
        if (!err) {
          setKey("");
          router.refresh();
        }
      }}
    >
      <label htmlFor="api-key" className="label mb-0">Claude-API-Schlüssel {configured && <span className="font-normal text-ok">· hinterlegt</span>}</label>
      <div className="flex flex-wrap gap-2">
        <input id="api-key" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder={configured ? "Neuen Schlüssel eintragen, um ihn zu ersetzen" : "sk-ant-…"} className="input max-w-md font-mono" />
        <button type="submit" className="btn-primary" disabled={!key.trim()}>Speichern</button>
        {configured && (
          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              if (!window.confirm("Schlüssel entfernen? Der Assistent funktioniert dann nicht mehr.")) return;
              await bridge.clearApiKey!();
              setMsg({ ok: true, text: "Schlüssel entfernt." });
              router.refresh();
            }}
          >
            Entfernen
          </button>
        )}
      </div>
      {msg && <p className={`text-sm ${msg.ok ? "text-ok" : "text-danger"}`} role="status">{msg.text}</p>}
      <p className="text-xs text-muted">Den Schlüssel bekommst du unter console.anthropic.com → API Keys. Er wird verschlüsselt im macOS-Schlüsselbund gesichert und nicht ins Backup oder in die Datenbank geschrieben.</p>
    </form>
  );
}
