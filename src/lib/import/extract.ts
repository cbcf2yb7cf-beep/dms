import "server-only";
import type { JSONNode } from "@/lib/content";
import { htmlToDoc } from "./html";
import { textToDoc } from "./plaintext";
import { rtfToText } from "./rtf";
import { pptxToDoc } from "./pptx";

import type { SupportedExt } from "./formats";
export { SUPPORTED, FORMAT_RANK, type SupportedExt } from "./formats";

export type Extracted = { content: JSONNode; warnings: string[] };


function decodeText(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export async function extract(ext: SupportedExt, bytes: Uint8Array): Promise<Extracted> {
  const warnings: string[] = [];
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let content: JSONNode;

  switch (ext) {
    case "docx":
    case "docm": {
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.convertToHtml(
        { buffer },
        {
          // Deutsche und englische Überschrift-Formatvorlagen
          styleMap: ["p[style-name='Überschrift 1'] => h2:fresh", "p[style-name='Überschrift 2'] => h3:fresh", "p[style-name='Überschrift 3'] => h4:fresh", "p[style-name='Titel'] => h2:fresh", "p[style-name='Zitat'] => blockquote > p:fresh"],
          ignoreEmptyParagraphs: true,
          convertImage: undefined,
        },
      );
      content = htmlToDoc(result.value);
      if (/<img/.test(result.value)) warnings.push("Bilder wurden nicht übernommen (liegen in der Originaldatei).");
      break;
    }
    case "doc": {
      const WordExtractor = (await import("word-extractor")).default;
      const document = await new WordExtractor().extract(buffer);
      content = textToDoc(document.getBody());
      warnings.push("Altes Word-Format: Text übernommen, Formatierung (fett, Listen) nur teilweise.");
      break;
    }
    case "rtf":
      content = textToDoc(rtfToText(decodeText(bytes)));
      break;
    case "txt":
    case "md":
      content = textToDoc(decodeText(bytes));
      break;
    case "pptx": {
      const r = await pptxToDoc(bytes);
      content = r.content;
      warnings.push(`PowerPoint mit ${r.slides} ${r.slides === 1 ? "Folie" : "Folien"}: Texte und Notizen übernommen, Bilder liegen in der Originaldatei.`);
      break;
    }
    case "pdf": {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const { text } = await extractText(pdf, { mergePages: false });
      const pages = (Array.isArray(text) ? text : [text]).map((t) => t.trim());
      const joined = pages.filter(Boolean).join("\n\n");
      if (joined.replace(/\s/g, "").length < 20) {
        content = textToDoc("");
        warnings.push("Kein Text gefunden – vermutlich eine gescannte PDF. Die Originaldatei ist gespeichert; Texterkennung kann später folgen.");
      } else {
        content = textToDoc(joined);
      }
      break;
    }
  }
  return { content: content!, warnings };
}
