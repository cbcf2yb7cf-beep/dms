import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Assistent" };

export default function Page() {
  return (
    <ComingSoon
      icon="sparkles"
      title="Assistent"
      phase={7}
      intro="Claude unterstützt dich – aber nur, wenn du es willst. Vor jedem Aufruf siehst du genau, welche Texte gesendet werden."
      features={[
        "Zusammenfassen, Gliederung, Themen vorschlagen",
        "„Was habe ich schon über … gepredigt?“ mit Quellenangaben",
        "Zwei Predigten vergleichen",
        "Folienentwurf aus einem Manuskript",
        "Vorschläge werden nie automatisch übernommen",
        "Kosten pro Aufruf sichtbar",
      ]}
    />
  );
}
