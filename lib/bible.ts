// The 66 books of the Protestant canon, with the abbreviations accepted when parsing.
export const BOOKS: { name: string; aliases: string[] }[] = [
  { name: "Genesis", aliases: ["gen", "ge", "gn"] },
  { name: "Exodus", aliases: ["exod", "exo", "ex"] },
  { name: "Leviticus", aliases: ["lev", "le", "lv"] },
  { name: "Numbers", aliases: ["num", "nu", "nm"] },
  { name: "Deuteronomy", aliases: ["deut", "deu", "dt"] },
  { name: "Joshua", aliases: ["josh", "jos"] },
  { name: "Judges", aliases: ["judg", "jdg"] },
  { name: "Ruth", aliases: ["ru", "rth"] },
  { name: "1 Samuel", aliases: ["1 sam", "1sam", "1 sa", "1sa"] },
  { name: "2 Samuel", aliases: ["2 sam", "2sam", "2 sa", "2sa"] },
  { name: "1 Kings", aliases: ["1 kgs", "1kgs", "1 ki", "1ki"] },
  { name: "2 Kings", aliases: ["2 kgs", "2kgs", "2 ki", "2ki"] },
  { name: "1 Chronicles", aliases: ["1 chron", "1 chr", "1chr", "1ch"] },
  { name: "2 Chronicles", aliases: ["2 chron", "2 chr", "2chr", "2ch"] },
  { name: "Ezra", aliases: ["ezr"] },
  { name: "Nehemiah", aliases: ["neh", "ne"] },
  { name: "Esther", aliases: ["esth", "est"] },
  { name: "Job", aliases: ["jb"] },
  { name: "Psalms", aliases: ["psalm", "ps", "psa", "pss"] },
  { name: "Proverbs", aliases: ["prov", "pro", "pr", "prv"] },
  { name: "Ecclesiastes", aliases: ["eccl", "ecc", "ec", "qoh"] },
  { name: "Song of Solomon", aliases: ["song of songs", "song", "sos", "so"] },
  { name: "Isaiah", aliases: ["isa", "is"] },
  { name: "Jeremiah", aliases: ["jer", "je"] },
  { name: "Lamentations", aliases: ["lam", "la"] },
  { name: "Ezekiel", aliases: ["ezek", "eze", "ezk"] },
  { name: "Daniel", aliases: ["dan", "da", "dn"] },
  { name: "Hosea", aliases: ["hos", "ho"] },
  { name: "Joel", aliases: ["jl"] },
  { name: "Amos", aliases: ["am"] },
  { name: "Obadiah", aliases: ["obad", "ob"] },
  { name: "Jonah", aliases: ["jon", "jnh"] },
  { name: "Micah", aliases: ["mic", "mc"] },
  { name: "Nahum", aliases: ["nah", "na"] },
  { name: "Habakkuk", aliases: ["hab", "hb"] },
  { name: "Zephaniah", aliases: ["zeph", "zep"] },
  { name: "Haggai", aliases: ["hag", "hg"] },
  { name: "Zechariah", aliases: ["zech", "zec"] },
  { name: "Malachi", aliases: ["mal", "ml"] },
  { name: "Matthew", aliases: ["matt", "mat", "mt"] },
  { name: "Mark", aliases: ["mrk", "mk", "mr"] },
  { name: "Luke", aliases: ["luk", "lk"] },
  { name: "John", aliases: ["jn", "jhn", "joh"] },
  { name: "Acts", aliases: ["act", "ac"] },
  { name: "Romans", aliases: ["rom", "ro", "rm"] },
  { name: "1 Corinthians", aliases: ["1 cor", "1cor", "1 co", "1co"] },
  { name: "2 Corinthians", aliases: ["2 cor", "2cor", "2 co", "2co"] },
  { name: "Galatians", aliases: ["gal", "ga"] },
  { name: "Ephesians", aliases: ["eph", "ephes"] },
  { name: "Philippians", aliases: ["phil", "php", "pp"] },
  { name: "Colossians", aliases: ["col", "co"] },
  { name: "1 Thessalonians", aliases: ["1 thess", "1thess", "1 th", "1th"] },
  { name: "2 Thessalonians", aliases: ["2 thess", "2thess", "2 th", "2th"] },
  { name: "1 Timothy", aliases: ["1 tim", "1tim", "1 ti", "1ti"] },
  { name: "2 Timothy", aliases: ["2 tim", "2tim", "2 ti", "2ti"] },
  { name: "Titus", aliases: ["tit", "ti"] },
  { name: "Philemon", aliases: ["philem", "phm", "pm"] },
  { name: "Hebrews", aliases: ["heb"] },
  { name: "James", aliases: ["jas", "jm"] },
  { name: "1 Peter", aliases: ["1 pet", "1pet", "1 pe", "1pe", "1 pt", "1pt"] },
  { name: "2 Peter", aliases: ["2 pet", "2pet", "2 pe", "2pe", "2 pt", "2pt"] },
  { name: "1 John", aliases: ["1 jn", "1jn", "1 jhn", "1jhn", "1 jo", "1jo"] },
  { name: "2 John", aliases: ["2 jn", "2jn", "2 jhn", "2jhn", "2 jo", "2jo"] },
  { name: "3 John", aliases: ["3 jn", "3jn", "3 jhn", "3jhn", "3 jo", "3jo"] },
  { name: "Jude", aliases: ["jud", "jd"] },
  { name: "Revelation", aliases: ["rev", "re", "revelations"] },
];

const BOOK_LOOKUP = new Map<string, string>();
for (const b of BOOKS) {
  BOOK_LOOKUP.set(normalizeBookKey(b.name), b.name);
  for (const a of b.aliases) BOOK_LOOKUP.set(normalizeBookKey(a), b.name);
}

function normalizeBookKey(s: string) {
  return s
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/^(i{1,3})\s+/, (m) => `${m.trim().length} `)
    .replace(/^first\s+/, "1 ")
    .replace(/^second\s+/, "2 ")
    .replace(/^third\s+/, "3 ")
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalBook(input: string): string | null {
  return BOOK_LOOKUP.get(normalizeBookKey(input)) ?? null;
}

export function bookOrder(book: string): number {
  return BOOKS.findIndex((b) => b.name === book);
}

export type ParsedRef = {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
};

/** Parses references such as "Genesis 1:27", "1 Cor 10:31", "Ps 73:25–28". */
export function parseReference(input: string): ParsedRef | null {
  const m = input
    .trim()
    .match(/^(.+?)\s*(\d+)\s*:\s*(\d+)(?:\s*[-–—]\s*(\d+))?$/);
  if (!m) return null;
  const book = canonicalBook(m[1]);
  if (!book) return null;
  const chapter = Number(m[2]);
  const verseStart = Number(m[3]);
  const verseEnd = m[4] ? Number(m[4]) : verseStart;
  if (chapter < 1 || verseStart < 1 || verseEnd < verseStart) return null;
  return { book, chapter, verseStart, verseEnd };
}

export function formatReference(r: ParsedRef): string {
  const name = r.book === "Psalms" ? "Psalm" : r.book;
  const verses =
    r.verseEnd > r.verseStart ? `${r.verseStart}–${r.verseEnd}` : `${r.verseStart}`;
  return `${name} ${r.chapter}:${verses}`;
}
