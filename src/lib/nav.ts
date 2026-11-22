// Navigation der App — eine Quelle für Seitenleiste und Suche (⌘K).
export const NAV = [
  { href: "/", label: "Dashboard", icon: "dashboard", keywords: "start übersicht" },
  { href: "/archiv", label: "Archiv", icon: "archive", keywords: "predigten vorträge dokumente import" },
  { href: "/bibel", label: "Bibel", icon: "bible", keywords: "übersetzung konkordanz grundtext strong" },
  { href: "/themen", label: "Themen", icon: "tags", keywords: "schlagwörter reihen" },
  { href: "/praesentationen", label: "Präsentationen", icon: "slides", keywords: "folien beamer pptx" },
  { href: "/assistent", label: "Assistent", icon: "sparkles", keywords: "claude ki" },
] as const;

export const SETTINGS_NAV = { href: "/einstellungen", label: "Einstellungen", icon: "settings", keywords: "konto passwort 2fa darstellung" } as const;

export type NavIcon = (typeof NAV)[number]["icon"] | typeof SETTINGS_NAV.icon;
