import type { DocStatus, DocType } from "@/db/schema";

// Anzeigenamen (auch im Client nutzbar, ohne Datenbank).
export const TYPE_LABELS: Record<DocType, string> = {
  predigt: "Predigt",
  vortrag: "Vortrag",
  bibelstudie: "Bibelstudie",
  andacht: "Andacht",
  notiz: "Notiz",
};

export const STATUS_LABELS: Record<DocStatus, string> = {
  entwurf: "Entwurf",
  fertig: "Fertig",
  gehalten: "Gehalten",
};

export const TYPE_OPTIONS = Object.entries(TYPE_LABELS) as [DocType, string][];
export const STATUS_OPTIONS = Object.entries(STATUS_LABELS) as [DocStatus, string][];
