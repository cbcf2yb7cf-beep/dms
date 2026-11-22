import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Themen" };

export default function Page() {
  return (
    <ComingSoon
      icon="tags"
      title="Themen"
      phase={5}
      intro="Themen verbinden deine Predigten, Vorträge und Bibelstellen – so findest du schnell, wo du ein Thema schon behandelt hast."
      features={[
        "Themen mit Unterthemen (z. B. Gnade → Rechtfertigung)",
        "Volltextsuche mit deutschen Wortformen",
        "Filter nach Typ, Jahr, Reihe und Bibelstelle",
        "Fundstelle direkt im Text hervorgehoben",
      ]}
    />
  );
}
