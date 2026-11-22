// Ohne Server-Abhängigkeiten, auch im Browser nutzbar (Vorprüfung vor dem Hochladen).

export const SUPPORTED = ["docx", "docm", "doc", "rtf", "txt", "md", "pptx", "pdf"] as const;
export type SupportedExt = (typeof SUPPORTED)[number];

/** Bevorzugte Fassung, wenn derselbe Name in mehreren Formaten vorliegt (kleiner = besser). */
export const FORMAT_RANK: Record<string, number> = { docx: 0, docm: 1, doc: 2, rtf: 3, txt: 4, md: 4, pptx: 5, pdf: 6 };

export const extOf = (name: string) => name.match(/\.([a-z0-9]{1,5})$/i)?.[1].toLowerCase() ?? "";

/** Systemdateien, die nie importiert werden (Word-Sperrdateien, macOS-Reste …). */
export const isJunk = (name: string) => /^(\.|~\$|\._)|^(thumbs\.db|desktop\.ini)$/i.test(name);

/**
 * Vorprüfung einer Dateiliste: was wird importiert, was übersprungen?
 * Liegt derselbe Name im selben Ordner mehrfach vor (z. B. .doc und .docx, .pptx und .pdf),
 * wird nur die beste Fassung importiert. PowerPoint und Word mit gleichem Namen bleiben beide.
 */
export function planImport(paths: string[]): { path: string; action: "import" | "skip"; reason?: string }[] {
  const groups = new Map<string, string[]>();
  for (const p of paths) {
    const key = p.replace(/\.[a-z0-9]{1,5}$/i, "").toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const out: { path: string; action: "import" | "skip"; reason?: string }[] = [];
  for (const p of paths) {
    const name = p.split("/").pop() ?? p;
    const ext = extOf(name);
    if (isJunk(name)) continue;
    if (!(SUPPORTED as readonly string[]).includes(ext)) {
      out.push({ path: p, action: "skip", reason: `Dateityp .${ext || "?"} wird nicht unterstützt` });
      continue;
    }
    const siblings = groups.get(p.replace(/\.[a-z0-9]{1,5}$/i, "").toLowerCase())!.filter((s) => s !== p);
    const isText = (e: string) => e !== "pptx";
    // Bessere Fassung vorhanden? Textformate untereinander; PDF auch gegenüber PowerPoint.
    const better = siblings.find((s) => {
      const se = extOf(s);
      if (!(se in FORMAT_RANK)) return false;
      if (ext === "pdf") return FORMAT_RANK[se] < FORMAT_RANK.pdf;
      return isText(ext) && isText(se) && FORMAT_RANK[se] < FORMAT_RANK[ext];
    });
    if (better) out.push({ path: p, action: "skip", reason: `Gleiche Datei als .${extOf(better)} vorhanden – die wird übernommen` });
    else out.push({ path: p, action: "import" });
  }
  return out;
}
