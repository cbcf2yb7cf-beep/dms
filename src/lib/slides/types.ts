import { z } from "zod";

// Folien – ohne Server-Abhängigkeiten (Editor, Vorschau, Präsentieren, Export).

export const SLIDE_KINDS = ["titel", "abschnitt", "punkte", "bibel", "zitat", "bild", "leer"] as const;
export type SlideKind = (typeof SLIDE_KINDS)[number];

export const KIND_LABELS: Record<SlideKind, string> = {
  titel: "Titel",
  abschnitt: "Abschnitt",
  punkte: "Punkte",
  bibel: "Bibelvers",
  zitat: "Zitat",
  bild: "Bild",
  leer: "Leer (schwarz)",
};

const text = (max: number) => z.string().max(max).default("");

export const slideSchema = z.discriminatedUnion("kind", [
  z.object({ id: z.string().max(40), kind: z.literal("titel"), notes: text(5000), title: text(300), subtitle: text(500) }),
  z.object({ id: z.string().max(40), kind: z.literal("abschnitt"), notes: text(5000), title: text(300) }),
  z.object({ id: z.string().max(40), kind: z.literal("punkte"), notes: text(5000), title: text(300), points: z.array(z.string().max(500)).max(12).default([]) }),
  z.object({ id: z.string().max(40), kind: z.literal("bibel"), notes: text(5000), reference: text(100), translation: text(100), text: text(4000) }),
  z.object({ id: z.string().max(40), kind: z.literal("zitat"), notes: text(5000), text: text(2000), source: text(300) }),
  z.object({ id: z.string().max(40), kind: z.literal("bild"), notes: text(5000), image: z.string().regex(/^([0-9a-f]{64}\.(png|jpg|webp|gif))?$/).default(""), caption: text(300) }),
  z.object({ id: z.string().max(40), kind: z.literal("leer"), notes: text(5000) }),
]);
export type Slide = z.infer<typeof slideSchema>;

export const THEMES = {
  papier: { name: "Papier", bg: "#f6f1e7", fg: "#2a2520", muted: "#6b6257", accent: "#7a5c17", serif: true },
  anthrazit: { name: "Anthrazit", bg: "#1c1d20", fg: "#ece6da", muted: "#a8a196", accent: "#d4b26a", serif: true },
  nacht: { name: "Nacht (hoher Kontrast)", bg: "#000000", fg: "#ffffff", muted: "#c8c8c8", accent: "#ffd27a", serif: false },
  klar: { name: "Klar", bg: "#ffffff", fg: "#1b2a3a", muted: "#5a6b7c", accent: "#2f6db5", serif: false },
} as const;
export type ThemeId = keyof typeof THEMES;
export const THEME_IDS = Object.keys(THEMES) as ThemeId[];

let counter = 0;
export const newSlideId = () => `s${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function emptySlide(kind: SlideKind): Slide {
  const base = { id: newSlideId(), notes: "" };
  switch (kind) {
    case "titel":
      return { ...base, kind, title: "", subtitle: "" };
    case "abschnitt":
      return { ...base, kind, title: "" };
    case "punkte":
      return { ...base, kind, title: "", points: [""] };
    case "bibel":
      return { ...base, kind, reference: "", translation: "", text: "" };
    case "zitat":
      return { ...base, kind, text: "", source: "" };
    case "bild":
      return { ...base, kind, image: "", caption: "" };
    case "leer":
      return { ...base, kind };
  }
}

/** Schriftgröße für lange Texte verkleinern (Anteil der Folienbreite in %). */
export function fitSize(textLength: number, base: number): number {
  if (textLength > 600) return base * 0.62;
  if (textLength > 420) return base * 0.72;
  if (textLength > 260) return base * 0.84;
  return base;
}
