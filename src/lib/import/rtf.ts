// RTF → reiner Text. Klein und ohne Abhängigkeiten: Gruppen wie Schrift- und Farbtabellen,
// Bilder und Metadaten werden übersprungen, Sonderzeichen (\'e4, \u228?) umgewandelt.

const SKIP_DESTINATIONS = new Set(["fonttbl", "colortbl", "stylesheet", "info", "pict", "header", "footer", "headerl", "headerr", "footerl", "footerr", "listtable", "listoverridetable", "rsidtbl", "generator", "xmlnstbl", "themedata", "colorschememapping", "latentstyles", "datastore", "object", "fldinst"]);

export function rtfToText(rtf: string): string {
  const cp1252 = new TextDecoder("windows-1252");
  let out = "";
  const stack: { skip: boolean; uc: number }[] = [];
  let skip = false;
  let uc = 1;
  let pendingSkip = 0; // Ersatzzeichen nach \uN überspringen
  let i = 0;

  while (i < rtf.length) {
    const c = rtf[i];
    if (c === "{") {
      stack.push({ skip, uc });
      i++;
      // {\*\dest …} oder bekannte Ziel-Gruppen überspringen
      const m = /^\\(\*\\)?([a-z]+)/.exec(rtf.slice(i, i + 40));
      if (m && (m[1] || SKIP_DESTINATIONS.has(m[2]))) skip = true;
      continue;
    }
    if (c === "}") {
      const prev = stack.pop();
      if (prev) ({ skip, uc } = prev);
      i++;
      continue;
    }
    if (c === "\\") {
      const next = rtf[i + 1];
      if (next === "\\" || next === "{" || next === "}") {
        if (!skip) out += next;
        i += 2;
        continue;
      }
      if (next === "'") {
        const hex = rtf.slice(i + 2, i + 4);
        if (pendingSkip > 0) pendingSkip--;
        else if (!skip) out += cp1252.decode(Uint8Array.of(parseInt(hex, 16)));
        i += 4;
        continue;
      }
      const m = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(rtf.slice(i, i + 40));
      if (!m) {
        i += 2; // \~ \- \_ usw.
        if (!skip && next === "~") out += " ";
        continue;
      }
      const [all, word, num] = m;
      i += all.length;
      if (skip) continue;
      if (word === "par" || word === "line" || word === "sect" || word === "row") out += "\n";
      else if (word === "tab" || word === "cell") out += "\t";
      else if (word === "uc") uc = Number(num ?? 1);
      else if (word === "u") {
        let code = Number(num);
        if (code < 0) code += 65536;
        out += String.fromCharCode(code);
        pendingSkip = uc;
      } else if (word === "emdash") out += "—";
      else if (word === "endash") out += "–";
      else if (word === "bullet") out += "•";
      else if (word === "lquote" || word === "rquote") out += "'";
      else if (word === "ldblquote") out += "„";
      else if (word === "rdblquote") out += "“";
      continue;
    }
    if (c === "\r" || c === "\n") {
      i++;
      continue;
    }
    if (pendingSkip > 0) pendingSkip--;
    else if (!skip) out += c;
    i++;
  }
  return out;
}
