// Die 66 Bücher der Bibel (protestantischer Kanon) mit deutschen und englischen
// Namen/Abkürzungen. `chapters` ist die höchste Kapitelzahl über die gängigen
// Zählungen hinweg (z. B. Joel 4 bei Luther, 3 im Englischen).
// Abkürzungen werden beim Nachschlagen normalisiert: klein, ohne Punkte und Leerzeichen
// ("1. Mose" → "1mose", "Röm." → "röm").

export type Book = {
  n: number; // 1–66
  osis: string;
  name: string; // deutscher Name
  abbr: string; // deutsche Abkürzung (Loccumer Richtlinien)
  chapters: number;
  aliases: string[];
  /** Abkürzung ist auch ein gewöhnliches Wort: nur mit Versangabe erkennen ("Am 5,24", nicht "am 5. Mai"). */
  ambiguous?: boolean;
};

const B = (n: number, osis: string, name: string, abbr: string, chapters: number, aliases: string[], ambiguous = false): Book => ({
  n,
  osis,
  name,
  abbr,
  chapters,
  aliases,
  ambiguous,
});

export const BOOKS: Book[] = [
  B(1, "Gen", "1. Mose", "1Mo", 50, ["1mose", "1mo", "1mos", "gen", "genesis", "gn"]),
  B(2, "Exod", "2. Mose", "2Mo", 40, ["2mose", "2mo", "2mos", "ex", "exod", "exodus"]),
  B(3, "Lev", "3. Mose", "3Mo", 27, ["3mose", "3mo", "3mos", "lev", "levitikus", "leviticus"]),
  B(4, "Num", "4. Mose", "4Mo", 36, ["4mose", "4mo", "4mos", "num", "numeri", "numbers"]),
  B(5, "Deut", "5. Mose", "5Mo", 34, ["5mose", "5mo", "5mos", "dtn", "deut", "deuteronomium", "deuteronomy"]),
  B(6, "Josh", "Josua", "Jos", 24, ["jos", "josua", "josh", "joshua"]),
  B(7, "Judg", "Richter", "Ri", 21, ["ri", "richter", "judg", "judges"], true),
  B(8, "Ruth", "Rut", "Rut", 4, ["rut", "ruth"]),
  B(9, "1Sam", "1. Samuel", "1Sam", 31, ["1sam", "1samuel", "1sa"]),
  B(10, "2Sam", "2. Samuel", "2Sam", 24, ["2sam", "2samuel", "2sa"]),
  B(11, "1Kgs", "1. Könige", "1Kön", 22, ["1kön", "1könige", "1koen", "1koenige", "1kings", "1kgs", "1ki"]),
  B(12, "2Kgs", "2. Könige", "2Kön", 25, ["2kön", "2könige", "2koen", "2koenige", "2kings", "2kgs", "2ki"]),
  B(13, "1Chr", "1. Chronik", "1Chr", 29, ["1chr", "1chronik", "1chron", "1chronicles"]),
  B(14, "2Chr", "2. Chronik", "2Chr", 36, ["2chr", "2chronik", "2chron", "2chronicles"]),
  B(15, "Ezra", "Esra", "Esr", 10, ["esr", "esra", "ezra"]),
  B(16, "Neh", "Nehemia", "Neh", 13, ["neh", "nehemia", "nehemiah"]),
  B(17, "Esth", "Ester", "Est", 10, ["est", "ester", "esther", "esth"], true),
  B(18, "Job", "Hiob", "Hi", 42, ["hi", "hiob", "ijob", "job"], true),
  B(19, "Ps", "Psalm", "Ps", 150, ["ps", "psalm", "psalmen", "psalms", "psa"]),
  B(20, "Prov", "Sprüche", "Spr", 31, ["spr", "sprüche", "sprueche", "prov", "proverbs"]),
  B(21, "Eccl", "Prediger", "Pred", 12, ["pred", "prediger", "koh", "kohelet", "eccl", "ecclesiastes", "qoh"]),
  B(22, "Song", "Hoheslied", "Hld", 8, ["hld", "hoheslied", "hohelied", "song", "songofsongs"]),
  B(23, "Isa", "Jesaja", "Jes", 66, ["jes", "jesaja", "isa", "isaiah"]),
  B(24, "Jer", "Jeremia", "Jer", 52, ["jer", "jeremia", "jeremiah"]),
  B(25, "Lam", "Klagelieder", "Klgl", 5, ["klgl", "klagelieder", "lam", "lamentations"]),
  B(26, "Ezek", "Hesekiel", "Hes", 48, ["hes", "hesekiel", "ez", "ezechiel", "ezek", "ezekiel"]),
  B(27, "Dan", "Daniel", "Dan", 12, ["dan", "daniel"]),
  B(28, "Hos", "Hosea", "Hos", 14, ["hos", "hosea"]),
  B(29, "Joel", "Joel", "Joel", 4, ["joel"]),
  B(30, "Amos", "Amos", "Am", 9, ["am", "amos"], true),
  B(31, "Obad", "Obadja", "Ob", 1, ["ob", "obd", "obadja", "obad", "obadiah"], true),
  B(32, "Jonah", "Jona", "Jona", 4, ["jona", "jon", "jonah"]),
  B(33, "Mic", "Micha", "Mi", 7, ["mi", "micha", "mic", "micah"], true),
  B(34, "Nah", "Nahum", "Nah", 3, ["nah", "nahum"]),
  B(35, "Hab", "Habakuk", "Hab", 3, ["hab", "habakuk", "habakkuk"], true),
  B(36, "Zeph", "Zefanja", "Zef", 3, ["zef", "zefanja", "zeph", "zephanja", "zephaniah"]),
  B(37, "Hag", "Haggai", "Hag", 2, ["hag", "haggai"]),
  B(38, "Zech", "Sacharja", "Sach", 14, ["sach", "sacharja", "zech", "zechariah"]),
  B(39, "Mal", "Maleachi", "Mal", 4, ["mal", "maleachi", "malachi"], true),
  B(40, "Matt", "Matthäus", "Mt", 28, ["mt", "matth", "matthäus", "matthaeus", "matt", "matthew"]),
  B(41, "Mark", "Markus", "Mk", 16, ["mk", "mark", "markus", "mar"]),
  B(42, "Luke", "Lukas", "Lk", 24, ["lk", "luk", "lukas", "luke"]),
  B(43, "John", "Johannes", "Joh", 21, ["joh", "johannes", "john", "jn"]),
  B(44, "Acts", "Apostelgeschichte", "Apg", 28, ["apg", "apostelgeschichte", "acts"]),
  B(45, "Rom", "Römer", "Röm", 16, ["röm", "römer", "roem", "roemer", "rom", "romans"]),
  B(46, "1Cor", "1. Korinther", "1Kor", 16, ["1kor", "1korinther", "1cor", "1corinthians", "1co"]),
  B(47, "2Cor", "2. Korinther", "2Kor", 13, ["2kor", "2korinther", "2cor", "2corinthians", "2co"]),
  B(48, "Gal", "Galater", "Gal", 6, ["gal", "galater", "galatians"]),
  B(49, "Eph", "Epheser", "Eph", 6, ["eph", "epheser", "ephesians"]),
  B(50, "Phil", "Philipper", "Phil", 4, ["phil", "philipper", "philippians", "php"]),
  B(51, "Col", "Kolosser", "Kol", 4, ["kol", "kolosser", "col", "colossians"]),
  B(52, "1Thess", "1. Thessalonicher", "1Thess", 5, ["1thess", "1thessalonicher", "1thes", "1th", "1thessalonians"]),
  B(53, "2Thess", "2. Thessalonicher", "2Thess", 3, ["2thess", "2thessalonicher", "2thes", "2th", "2thessalonians"]),
  B(54, "1Tim", "1. Timotheus", "1Tim", 6, ["1tim", "1timotheus", "1timothy", "1ti"]),
  B(55, "2Tim", "2. Timotheus", "2Tim", 4, ["2tim", "2timotheus", "2timothy", "2ti"]),
  B(56, "Titus", "Titus", "Tit", 3, ["tit", "titus"]),
  B(57, "Phlm", "Philemon", "Phlm", 1, ["phlm", "philemon", "phm", "philem"]),
  B(58, "Heb", "Hebräer", "Hebr", 13, ["hebr", "hebräer", "hebraeer", "heb", "hebrews"]),
  B(59, "Jas", "Jakobus", "Jak", 5, ["jak", "jakobus", "jas", "james"]),
  B(60, "1Pet", "1. Petrus", "1Petr", 5, ["1petr", "1petrus", "1pet", "1peter", "1pt"]),
  B(61, "2Pet", "2. Petrus", "2Petr", 3, ["2petr", "2petrus", "2pet", "2peter", "2pt"]),
  B(62, "1John", "1. Johannes", "1Joh", 5, ["1joh", "1johannes", "1john", "1jn"]),
  B(63, "2John", "2. Johannes", "2Joh", 1, ["2joh", "2johannes", "2john", "2jn"]),
  B(64, "3John", "3. Johannes", "3Joh", 1, ["3joh", "3johannes", "3john", "3jn"]),
  B(65, "Jude", "Judas", "Jud", 1, ["jud", "judas", "jude"]),
  B(66, "Rev", "Offenbarung", "Offb", 22, ["offb", "offenbarung", "apk", "rev", "revelation", "off"]),
];

export const normalizeBookKey = (s: string) => s.toLowerCase().replace(/[.\s]/g, "");

const BY_KEY = new Map<string, Book>();
for (const book of BOOKS) {
  for (const alias of [...book.aliases, book.abbr, book.name]) BY_KEY.set(normalizeBookKey(alias), book);
}

export function findBook(raw: string): Book | undefined {
  return BY_KEY.get(normalizeBookKey(raw));
}

export const bookByNumber = (n: number) => BOOKS[n - 1];
