import { fitSize, THEMES, type Slide, type ThemeId } from "@/lib/slides/types";

// Eine Folie, 16:9. Schriftgrößen in cqw (Prozent der Folienbreite) – so sieht die Folie
// als kleine Vorschau, im Editor und im Vollbild am Beamer gleich aus.

export function SlideView({ slide, theme, className = "", black = false }: { slide: Slide | undefined; theme: ThemeId; className?: string; black?: boolean }) {
  const t = THEMES[theme];
  const serif = t.serif ? "var(--font-serif)" : "var(--font-sans)";
  const isBlack = black || !slide || slide.kind === "leer";
  return (
    <div
      className={`relative w-full overflow-hidden select-none ${className}`}
      style={{ aspectRatio: "16 / 9", containerType: "inline-size", background: isBlack ? "#000" : t.bg, color: t.fg }}
      aria-label={slide && !isBlack ? `Folie: ${"title" in slide ? slide.title : slide.kind}` : "Schwarze Folie"}
    >
      {!isBlack && slide && <Content slide={slide} t={t} serif={serif} />}
    </div>
  );
}

function Content({ slide, t, serif }: { slide: Slide; t: (typeof THEMES)[ThemeId]; serif: string }) {
  const pad = { position: "absolute" as const, inset: "6cqw 7cqw" };
  const rule = <div style={{ width: "9cqw", height: "0.4cqw", background: t.accent, margin: "2.2cqw auto" }} />;
  switch (slide.kind) {
    case "titel":
      return (
        <div style={{ ...pad, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          <div style={{ fontFamily: serif, fontWeight: 600, fontSize: `${fitSize(slide.title.length * 3, 5.6)}cqw`, lineHeight: 1.12 }}>{slide.title}</div>
          {rule}
          {slide.subtitle && <div style={{ fontSize: "2.4cqw", color: t.muted }}>{slide.subtitle}</div>}
        </div>
      );
    case "abschnitt":
      return (
        <div style={{ ...pad, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          {rule}
          <div style={{ fontFamily: serif, fontWeight: 600, fontSize: `${fitSize(slide.title.length * 3, 5)}cqw`, lineHeight: 1.15 }}>{slide.title}</div>
        </div>
      );
    case "punkte":
      return (
        <div style={{ ...pad, display: "flex", flexDirection: "column", gap: "2.4cqw" }}>
          {slide.title && <div style={{ fontFamily: serif, fontWeight: 600, fontSize: "3.8cqw", color: t.accent, lineHeight: 1.15 }}>{slide.title}</div>}
          <ul style={{ margin: 0, paddingLeft: "3.2cqw", display: "flex", flexDirection: "column", gap: "1.5cqw", fontSize: `${fitSize(slide.points.join(" ").length, 3.1)}cqw`, lineHeight: 1.3, listStyle: "disc" }}>
            {slide.points.filter((p) => p.trim()).map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      );
    case "bibel":
      return (
        <div style={{ ...pad, display: "flex", flexDirection: "column", justifyContent: "center", gap: "3cqw" }}>
          <div style={{ fontFamily: serif, fontStyle: t.serif ? "italic" : "normal", fontSize: `${fitSize(slide.text.length, 3.7)}cqw`, lineHeight: 1.42, whiteSpace: "pre-line" }}>{slide.text}</div>
          <div style={{ textAlign: "right", fontSize: "2.3cqw" }}>
            <span style={{ color: t.accent, fontWeight: 600 }}>{slide.reference}</span>
            {slide.translation && <span style={{ color: t.muted }}> · {slide.translation}</span>}
          </div>
        </div>
      );
    case "zitat":
      return (
        <div style={{ ...pad, padding: "0 3cqw", display: "flex", flexDirection: "column", justifyContent: "center", gap: "3cqw" }}>
          <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: `${fitSize(slide.text.length, 4)}cqw`, lineHeight: 1.38 }}>„{slide.text}“</div>
          {slide.source && <div style={{ textAlign: "right", fontSize: "2.3cqw", color: t.muted }}>— {slide.source}</div>}
        </div>
      );
    case "bild":
      return (
        <div style={{ position: "absolute", inset: "3cqw 4cqw", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5cqw" }}>
          {slide.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/medien/${slide.image}`} alt={slide.caption || ""} style={{ flex: 1, minHeight: 0, width: "100%", objectFit: "contain" }} />
          ) : (
            <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", border: `0.3cqw dashed ${t.muted}`, color: t.muted, fontSize: "2.4cqw" }}>Kein Bild gewählt</div>
          )}
          {slide.caption && <div style={{ fontSize: "2.3cqw", color: t.muted, textAlign: "center" }}>{slide.caption}</div>}
        </div>
      );
    default:
      return null;
  }
}
