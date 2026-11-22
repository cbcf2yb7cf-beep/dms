import JSZip from "jszip";
import type { JSONNode } from "@/lib/content";
import { doc, heading, paragraph, text } from "./blocks";

// PowerPoint → Folientexte in Präsentationsreihenfolge, Sprechernotizen als Notiz-Block.

const decodeXml = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

/** Absätze (<a:p>) einer Folie oder Notizseite als Text. */
function paragraphsOf(xml: string): string[] {
  const out: string[] = [];
  for (const p of xml.matchAll(/<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g)) {
    const t = [...p[1].matchAll(/<a:t>([^<]*)<\/a:t>|<a:br\b/g)].map((m) => (m[1] === undefined ? " " : decodeXml(m[1]))).join("");
    const clean = t.replace(/\s+/g, " ").trim();
    if (clean) out.push(clean);
  }
  return out;
}

const relsOf = (xml: string) => new Map([...xml.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1], m[2]]));

export async function pptxToDoc(bytes: Uint8Array): Promise<{ content: JSONNode; slides: number }> {
  const zip = await JSZip.loadAsync(bytes);
  const read = (path: string) => zip.file(path)?.async("string") ?? Promise.resolve("");

  // Reihenfolge laut presentation.xml (nicht nach Dateinamen).
  const pres = await read("ppt/presentation.xml");
  const presRels = relsOf(await read("ppt/_rels/presentation.xml.rels"));
  let slidePaths = [...pres.matchAll(/<p:sldId\b[^>]*r:id="([^"]+)"/g)].map((m) => presRels.get(m[1])).filter(Boolean).map((t) => `ppt/${t!.replace(/^\/?ppt\//, "")}`);
  if (!slidePaths.length) {
    slidePaths = Object.keys(zip.files)
      .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
      .sort((a, b) => Number(a.match(/(\d+)\.xml$/)![1]) - Number(b.match(/(\d+)\.xml$/)![1]));
  }

  const blocks: JSONNode[] = [];
  for (const [i, path] of slidePaths.entries()) {
    const [first, ...rest] = paragraphsOf(await read(path));
    blocks.push(heading(3, `Folie ${i + 1}${first ? ` – ${first}` : ""}`));
    for (const p of rest) blocks.push(paragraph([text(p)]));

    // Sprechernotizen: Verweis in slideN.xml.rels auf ../notesSlides/notesSlideM.xml
    const rels = await read(path.replace(/slides\/(slide\d+\.xml)$/, "slides/_rels/$1.rels"));
    const notesTarget = [...relsOf(rels).values()].find((t) => t.includes("notesSlide"));
    if (notesTarget) {
      const notes = paragraphsOf(await read(`ppt/${notesTarget.replace(/^\.\.\//, "")}`)).filter((p) => !/^\d+$/.test(p)); // Foliennummer weglassen
      if (notes.length) blocks.push({ type: "note", content: notes.map((n) => paragraph([text(n)])) });
    }
  }
  return { content: doc(blocks), slides: slidePaths.length };
}
