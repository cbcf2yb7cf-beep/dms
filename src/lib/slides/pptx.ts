import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fitSize, THEMES, type Slide, type ThemeId } from "./types";

// PowerPoint-Export (16:9, 13,33 × 7,5 Zoll). Gleiche Gestaltung wie in der App.

const hex = (c: string) => c.replace("#", "").toUpperCase();
const W = 13.333;
const H = 7.5;

export async function buildPptx(p: { title: string; theme: ThemeId; slides: Slide[] }, mediaDir: string): Promise<Buffer> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = p.title || "Präsentation";
  pptx.author = "DMS";
  const t = THEMES[p.theme];
  const face = t.serif ? "Georgia" : "Helvetica Neue";
  const sans = "Helvetica Neue";
  const base = { fontFace: face, color: hex(t.fg), margin: 0 } as const;

  for (const s of p.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: s.kind === "leer" ? "000000" : hex(t.bg) };
    if (s.notes.trim()) slide.addNotes(s.notes);

    switch (s.kind) {
      case "titel":
        slide.addText(s.title || " ", { ...base, x: 0.9, y: 2.2, w: W - 1.8, h: 1.8, fontSize: 46, bold: true, align: "center", valign: "bottom", fit: "shrink" });
        if (s.subtitle) slide.addText(s.subtitle, { ...base, fontFace: sans, x: 0.9, y: 4.3, w: W - 1.8, h: 0.9, fontSize: 22, color: hex(t.muted), align: "center", valign: "top" });
        slide.addShape("rect", { x: W / 2 - 0.6, y: 4.12, w: 1.2, h: 0.05, fill: { color: hex(t.accent) }, line: { color: hex(t.accent) } });
        break;
      case "abschnitt":
        slide.addShape("rect", { x: W / 2 - 0.6, y: 2.9, w: 1.2, h: 0.05, fill: { color: hex(t.accent) }, line: { color: hex(t.accent) } });
        slide.addText(s.title || " ", { ...base, x: 0.9, y: 3.05, w: W - 1.8, h: 1.6, fontSize: 42, bold: true, align: "center", valign: "top", fit: "shrink" });
        break;
      case "punkte":
        if (s.title) slide.addText(s.title, { ...base, x: 0.9, y: 0.55, w: W - 1.8, h: 1.0, fontSize: 32, bold: true, color: hex(t.accent), valign: "bottom", fit: "shrink" });
        slide.addText(
          s.points.filter((x) => x.trim()).map((x) => ({ text: x, options: { bullet: { indent: 24 }, paraSpaceAfter: 12 } })),
          { ...base, x: 0.9, y: 1.8, w: W - 1.8, h: H - 2.5, fontSize: Math.round(fitSize(s.points.join(" ").length, 26)), valign: "top", fit: "shrink" },
        );
        break;
      case "bibel":
        slide.addText(s.text || " ", { ...base, x: 1.1, y: 0.8, w: W - 2.2, h: H - 2.4, fontSize: Math.round(fitSize(s.text.length, 32)), italic: t.serif, valign: "middle", fit: "shrink", lineSpacingMultiple: 1.15 });
        slide.addText(
          [
            { text: s.reference, options: { bold: true, color: hex(t.accent) } },
            { text: s.translation ? `  ·  ${s.translation}` : "", options: { color: hex(t.muted) } },
          ],
          { ...base, fontFace: sans, x: 1.1, y: H - 1.45, w: W - 2.2, h: 0.6, fontSize: 20, align: "right" },
        );
        break;
      case "zitat":
        slide.addText(`„${s.text}“`, { ...base, x: 1.3, y: 1.0, w: W - 2.6, h: H - 2.8, fontSize: Math.round(fitSize(s.text.length, 34)), italic: true, valign: "middle", fit: "shrink" });
        if (s.source) slide.addText(`— ${s.source}`, { ...base, fontFace: sans, x: 1.3, y: H - 1.6, w: W - 2.6, h: 0.6, fontSize: 20, color: hex(t.muted), align: "right" });
        break;
      case "bild": {
        const file = s.image ? join(/* turbopackIgnore: true */ mediaDir, s.image) : "";
        if (file && existsSync(/* turbopackIgnore: true */ file)) {
          const data = `data:image/${s.image.endsWith(".jpg") ? "jpeg" : s.image.split(".")[1]};base64,${readFileSync(/* turbopackIgnore: true */ file).toString("base64")}`;
          slide.addImage({ data, x: 0.6, y: 0.5, w: W - 1.2, h: s.caption ? H - 1.7 : H - 1.0, sizing: { type: "contain", w: W - 1.2, h: s.caption ? H - 1.7 : H - 1.0 } });
        }
        if (s.caption) slide.addText(s.caption, { ...base, fontFace: sans, x: 0.6, y: H - 1.05, w: W - 1.2, h: 0.6, fontSize: 20, color: hex(t.muted), align: "center" });
        break;
      }
      case "leer":
        break;
    }
  }
  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}
