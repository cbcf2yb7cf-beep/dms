// Verse für die Startseite, Luther 1912 (gemeinfrei). Wechselt täglich.
// Bis das Bibelzentrum (Phase 4) steht, als feste Auswahl.
export const DAILY_VERSES = [
  { ref: "Hebräer 11,1", text: "Es ist aber der Glaube eine gewisse Zuversicht des, das man hofft, und ein Nichtzweifeln an dem, das man nicht sieht." },
  { ref: "Psalm 23,1", text: "Der HERR ist mein Hirte; mir wird nichts mangeln." },
  { ref: "Psalm 119,105", text: "Dein Wort ist meines Fußes Leuchte und ein Licht auf meinem Wege." },
  { ref: "Römer 8,28", text: "Wir wissen aber, daß denen, die Gott lieben, alle Dinge zum Besten dienen, denen, die nach dem Vorsatz berufen sind." },
  { ref: "Johannes 3,16", text: "Also hat Gott die Welt geliebt, daß er seinen eingeborenen Sohn gab, auf daß alle, die an ihn glauben, nicht verloren werden, sondern das ewige Leben haben." },
  { ref: "Philipper 4,13", text: "Ich vermag alles durch den, der mich mächtig macht, Christus." },
] as const;

export function verseOfDay(now = new Date()) {
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const day = Math.floor((now.getTime() - start) / 86_400_000);
  return DAILY_VERSES[day % DAILY_VERSES.length];
}
