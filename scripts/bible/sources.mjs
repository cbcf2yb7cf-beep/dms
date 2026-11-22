// Bibeldaten-Quellen. Lizenzen sind geprüft (Lizenzdatei im jeweiligen Paket gelesen, 2026-11-22).
// STEPBible ist auf einen festen Commit gepinnt; eBible/OpenBible haben keine Versions-URLs –
// das Build-Skript prüft deshalb Format und Versanzahl und speichert die Prüfsummen in bible.db.

export const STEP_COMMIT = "5de0a47f35f0fc13dfe1430d104e5db8a4285f9c";

export const TRANSLATIONS = [
  { id: "luther1912", ebible: "deu1912", name: "Luther 1912", short: "LUT", lang: "de", license: "gemeinfrei", notice: "Lutherbibel 1912 – gemeinfrei. Quelle: eBible.org" },
  { id: "elberfelder1905", ebible: "deuelo", name: "Elberfelder 1905", short: "ELB", lang: "de", license: "gemeinfrei", notice: "Unrevidierte Elberfelder 1905 – gemeinfrei. Quelle: eBible.org" },
  { id: "schlachter1951", ebible: "deu1951", name: "Schlachter 1951", short: "SCH", lang: "de", license: "CC BY 4.0", notice: "Schlachter 1951, © 1951 Genfer Bibelgesellschaft. Lizenz: CC BY 4.0. Quelle: eBible.org" },
  { id: "elberfelder-bk", ebible: "deuelbbk", name: "Elberfelder (bibelkommentare.de)", short: "ELB-BK", lang: "de", license: "CC BY-NC-ND 4.0", notice: "Elberfelder Übersetzung (Version von bibelkommentare.de), © 2019 Verbreitung des christlichen Glaubens e.V. Lizenz: CC BY-NC-ND 4.0 – nur nicht kommerziell, Text unverändert. Quelle: eBible.org" },
  { id: "textbibel1906", ebible: "deutkw", name: "Textbibel 1906 (Kautzsch/Weizsäcker)", short: "TKW", lang: "de", license: "gemeinfrei", notice: "Textbibel von Kautzsch und Weizsäcker 1906 – gemeinfrei. Quelle: eBible.org" },
  { id: "kjv", ebible: "eng-kjv2006", name: "King James Version", short: "KJV", lang: "en", license: "gemeinfrei", notice: "King James Version (1769) – gemeinfrei (außerhalb des Vereinigten Königreichs). Quelle: eBible.org/CrossWire" },
  { id: "bsb", ebible: "engbsb", name: "Berean Standard Bible", short: "BSB", lang: "en", license: "gemeinfrei", notice: "Berean Standard Bible – gemeinfrei. Quelle: eBible.org" },
  { id: "web", ebible: "engwebp", name: "World English Bible", short: "WEB", lang: "en", license: "gemeinfrei", notice: "World English Bible – gemeinfrei. „World English Bible“ ist eine Marke von eBible.org. Quelle: eBible.org" },
];

export const EXTRA_NOTICES = [
  "Grundtext (griechisch/hebräisch), Strong-Nummern und Lexika: STEPBible-Data (TAGNT, TAHOT, TBESG, TBESH), Tyndale House Cambridge, www.STEPBible.org – Lizenz: CC BY 4.0.",
  "Querverweise: OpenBible.info – Lizenz: CC BY.",
];

const step = (path) => ({ url: `https://raw.githubusercontent.com/STEPBible/STEPBible-Data/${STEP_COMMIT}/${encodeURI(path)}`, file: path.split("/").pop().split(" - ")[0].replace(/ /g, "_") + ".txt" });
export const STEP_FILES = {
  tagnt: ["Translators Amalgamated OT+NT/TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt", "Translators Amalgamated OT+NT/TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt"].map(step),
  tahot: [
    "Translators Amalgamated OT+NT/TAHOT Gen-Deu - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt",
    "Translators Amalgamated OT+NT/TAHOT Jos-Est - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt",
    "Translators Amalgamated OT+NT/TAHOT Job-Sng - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt",
    "Translators Amalgamated OT+NT/TAHOT Isa-Mal - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt",
  ].map(step),
  lexicon: ["Lexicons/TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt", "Lexicons/TBESH - Translators Brief lexicon of Extended Strongs for Hebrew - STEPBible.org CC BY.txt"].map(step),
};
export const CROSSREFS = { url: "https://a.openbible.info/data/cross-references.zip", file: "crossrefs.zip" };

// Buchcodes: eBible-VPL, STEPBible, OSIS (OpenBible) → Buchnummer 1–66
export const VPL_BOOKS = "GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SOL ISA JER LAM EZE DAN HOS JOE AMO OBA JON MIC NAH HAB ZEP HAG ZEC MAL MAT MAR LUK JOH ACT ROM 1CO 2CO GAL EPH PHI COL 1TH 2TH 1TI 2TI TIT PHM HEB JAM 1PE 2PE 1JO 2JO 3JO JUD REV".split(" ");
export const STEP_BOOKS = "Gen Exo Lev Num Deu Jos Jdg Rut 1Sa 2Sa 1Ki 2Ki 1Ch 2Ch Ezr Neh Est Job Psa Pro Ecc Sng Isa Jer Lam Ezk Dan Hos Jol Amo Oba Jon Mic Nam Hab Zep Hag Zec Mal Mat Mrk Luk Jhn Act Rom 1Co 2Co Gal Eph Php Col 1Th 2Th 1Ti 2Ti Tit Phm Heb Jas 1Pe 2Pe 1Jn 2Jn 3Jn Jud Rev".split(" ");
export const OSIS_BOOKS = "Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov Eccl Song Isa Jer Lam Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev".split(" ");
