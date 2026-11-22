import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Archiv" };

export default function Page() {
  return (
    <ComingSoon
      icon="archive"
      title="Archiv"
      phase={2}
      intro="Hier verwaltest du Predigten, Vorträge, Bibelstudien und Andachten. Im nächsten Schritt kommen Editor und Import für deine vorhandenen Dateien dazu."
      features={[
        "Editor mit Gliederung, Bibelstellen-Block und Notizen",
        "Automatisches Speichern und Versionsverlauf",
        "Bibelstellen werden im Text automatisch erkannt",
        "Import von Word, PDF, PowerPoint und älteren Formaten (Phase 3)",
        "Themen, Reihen, Anlass und Datum",
        "Papierkorb statt endgültigem Löschen",
      ]}
    />
  );
}
