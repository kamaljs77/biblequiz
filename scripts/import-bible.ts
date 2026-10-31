// Imports the World English Bible into the BibleVerse table.
//
// Usage: npm run bible:import -- <file>
//
// Accepted files:
//   - eBible.org "verse per line" text (eng-web_vpl.txt from
//     https://ebible.org/Scriptures/eng-web_vpl.zip), lines like "GEN 1:1 In the beginning…"
//   - CSV with a header row and columns book,chapter,verse,text
//
// Books outside the 66-book Protestant canon (e.g. Tobit) are skipped.
import { readFileSync } from "fs";
import { prisma } from "../lib/db";
import { BOOKS, canonicalBook } from "../lib/bible";

// eBible.org VPL book codes, in canonical order (Genesis … Revelation).
const VPL_CODES = [
  "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA", "1KI", "2KI", "1CH", "2CH",
  "EZR", "NEH", "EST", "JOB", "PSA", "PRO", "ECC", "SOL", "ISA", "JER", "LAM", "EZE", "DAN", "HOS",
  "JOE", "AMO", "OBA", "JON", "MIC", "NAH", "HAB", "ZEP", "HAG", "ZEC", "MAL", "MAT", "MAR", "LUK",
  "JOH", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHI", "COL", "1TH", "2TH", "1TI", "2TI", "TIT",
  "PHM", "HEB", "JAM", "1PE", "2PE", "1JO", "2JO", "3JO", "JUD", "REV",
];
const VPL_BOOK = new Map(VPL_CODES.map((code, i) => [code, BOOKS[i].name]));

type Verse = { book: string; chapter: number; verse: number; text: string };

function parseVpl(src: string): { verses: Verse[]; skipped: Set<string> } {
  const verses: Verse[] = [];
  const skipped = new Set<string>();
  for (const line of src.split(/\r?\n/)) {
    const m = line.match(/^(\w{3}) (\d+):(\d+) (.*)$/);
    if (!m) continue;
    const book = VPL_BOOK.get(m[1]);
    if (!book) {
      skipped.add(m[1]);
      continue;
    }
    verses.push({ book, chapter: Number(m[2]), verse: Number(m[3]), text: m[4].trim() });
  }
  return { verses, skipped };
}

function parseCsvRows(src: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') (cell += '"'), i++;
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") row.push(cell), (cell = "");
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x !== "")) rows.push(row);
  return rows;
}

function parseCsv(src: string): { verses: Verse[]; skipped: Set<string> } {
  const [header, ...rows] = parseCsvRows(src);
  const col = (name: string) => {
    const i = header.findIndex((h) => h.trim().toLowerCase() === name);
    if (i < 0) throw new Error(`Missing column "${name}" in header: ${header.join(",")}`);
    return i;
  };
  const [b, c, v, t] = [col("book"), col("chapter"), col("verse"), col("text")];
  const verses: Verse[] = [];
  const skipped = new Set<string>();
  for (const r of rows) {
    const book = canonicalBook(r[b] ?? "");
    if (!book) {
      skipped.add(r[b]);
      continue;
    }
    verses.push({ book, chapter: Number(r[c]), verse: Number(r[v]), text: (r[t] ?? "").trim() });
  }
  return { verses, skipped };
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: npm run bible:import -- <file>");
  const src = readFileSync(file, "utf8").replace(/^﻿/, "");
  const { verses, skipped } = /^\w{3} \d+:\d+ /.test(src) ? parseVpl(src) : parseCsv(src);
  if (skipped.size) console.log(`Skipped books outside the 66-book canon: ${[...skipped].join(", ")}`);

  const books = new Set(verses.map((v) => v.book));
  if (books.size !== 66) throw new Error(`Expected 66 books, found ${books.size}. Nothing was imported.`);

  await prisma.$transaction(async (tx) => {
    await tx.bibleVerse.deleteMany();
    for (let i = 0; i < verses.length; i += 1000) {
      await tx.bibleVerse.createMany({ data: verses.slice(i, i + 1000) });
    }
  }, { timeout: 120_000 });
  console.log(`Imported ${verses.length} verses from ${books.size} books.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
