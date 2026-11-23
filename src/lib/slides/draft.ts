import type { JSONNode } from "@/lib/content";
import { nodeText } from "@/lib/import/blocks";
import { emptySlide, type Slide } from "./types";

// Folienentwurf aus einem Dokument (ohne KI): Gliederung → Folien.
//   Titel + Haupttext → Titelfolie · Überschrift Ebene 2 → Abschnitt · Ebene 3 + Listen → Punkte
//   Bibel-Block → Bibelvers · Zitat → Zitat. Notizen und lange Absätze bleiben im Manuskript.

const firstSentence = (s: string) => {
  const t = s.replace(/\s+/g, " ").trim();
  const m = /^(.{20,160}?[.!?])(\s|$)/.exec(t);
  return (m ? m[1] : t.slice(0, 140)).trim();
};

export function draftFromDocument(content: JSONNode, meta: { title: string; mainRef: string; heldOn: string | null; place: string }): Slide[] {
  const slides: Slide[] = [];
  const title = emptySlide("titel") as Extract<Slide, { kind: "titel" }>;
  title.title = meta.title || "Ohne Titel";
  title.subtitle = [meta.mainRef, meta.heldOn ? new Date(`${meta.heldOn}T12:00:00`).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" }) : "", meta.place].filter(Boolean).join(" · ");
  slides.push(title);

  let points: Extract<Slide, { kind: "punkte" }> | null = null;
  const flush = () => {
    if (points && (points.points.length || points.title)) slides.push(points);
    points = null;
  };

  for (const node of content.content ?? []) {
    const t = nodeText(node).trim();
    if (node.type === "heading") {
      flush();
      const level = Number(node.attrs?.level ?? 2);
      if (level <= 2) {
        const s = emptySlide("abschnitt") as Extract<Slide, { kind: "abschnitt" }>;
        s.title = t;
        slides.push(s);
      } else {
        points = emptySlide("punkte") as Extract<Slide, { kind: "punkte" }>;
        points.title = t;
        points.points = [];
      }
    } else if (node.type === "bulletList" || node.type === "orderedList") {
      const items = (node.content ?? []).map((li) => nodeText(li).trim()).filter(Boolean);
      if (!points) {
        points = emptySlide("punkte") as Extract<Slide, { kind: "punkte" }>;
        points.points = [];
      }
      for (const item of items) {
        if (points.points.length >= 6) {
          const title = points.title;
          flush();
          points = emptySlide("punkte") as Extract<Slide, { kind: "punkte" }>;
          points.title = title ? `${title} (Forts.)` : "";
          points.points = [];
        }
        points.points.push(firstSentence(item));
      }
    } else if (node.type === "bibleBlock") {
      flush();
      const s = emptySlide("bibel") as Extract<Slide, { kind: "bibel" }>;
      s.reference = String(node.attrs?.reference ?? "");
      s.translation = String(node.attrs?.translation ?? "");
      s.text = t;
      slides.push(s);
    } else if (node.type === "blockquote") {
      flush();
      const s = emptySlide("zitat") as Extract<Slide, { kind: "zitat" }>;
      s.text = t;
      slides.push(s);
    }
  }
  flush();
  return slides;
}
