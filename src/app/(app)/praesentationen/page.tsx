import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Präsentationen" };

export default function Page() {
  return (
    <ComingSoon
      icon="slides"
      title="Präsentationen"
      phase={6}
      intro="Folien direkt aus der Gliederung einer Predigt – und im Gottesdienst aus der App heraus präsentieren."
      features={[
        "Folien-Bausteine: Titel, Bibelvers, Punkte, Zitat, Bild",
        "Mehrere ruhige Designvorlagen",
        "Vollbild mit Referentenansicht auf dem zweiten Bildschirm",
        "Export als PowerPoint (PPTX) und PDF",
        "Offline präsentieren, auch ohne Internet in der Kirche",
      ]}
    />
  );
}
