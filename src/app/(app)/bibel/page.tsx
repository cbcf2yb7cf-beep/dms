import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Bibel" };

export default function Page() {
  return (
    <ComingSoon
      icon="bible"
      title="Bibel"
      phase={4}
      intro="Freie Bibelübersetzungen auf Deutsch und Englisch, lokal auf dem Server gespeichert – schnell und ohne fremde Dienste."
      features={[
        "Luther 1912, Elberfelder 1905 u. a.; KJV, WEB, BSB",
        "Bis zu drei Übersetzungen nebeneinander",
        "Konkordanz mit Treffern je Buch",
        "Grundtext mit Strong-Nummern und Kurzlexikon",
        "Querverweise, Lesezeichen und Versnotizen",
        "„Wo habe ich über diese Stelle gepredigt?“",
      ]}
    />
  );
}
