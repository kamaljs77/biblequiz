// Imports the World English Bible into the BibleVerse table.
// Usage: npm run bible:import -- <path-to-file.csv>
// Expected columns (header row required): book,chapter,verse,text
// Book names may be full names or common abbreviations ("Gen", "1 Cor").
import { readFileSync } from "fs";
import { prisma } from "../lib/db";
import { canonicalBook } from "../lib/bible";

function parseCsv(src: string): string[][] {
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

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: npm run bible:import -- <path-to-file.csv>");
  const [header, ...rows] = parseCsv(readFileSync(file, "utf8").replace(/^﻿/, ""));
  const col = (name: string) => {
    const i = header.findIndex((h) => h.trim().toLowerCase() === name);
    if (i < 0) throw new Error(`Missing column "${name}" in header: ${header.join(",")}`);
    return i;
  };
  const [b, c, v, t] = [col("book"), col("chapter"), col("verse"), col("text")];

  const verses = [];
  const unknownBooks = new Set<string>();
  for (const r of rows) {
    const book = canonicalBook(r[b] ?? "");
    if (!book) {
      unknownBooks.add(r[b]);
      continue;
    }
    verses.push({ book, chapter: Number(r[c]), verse: Number(r[v]), text: (r[t] ?? "").trim() });
  }
  if (unknownBooks.size) console.warn(`Skipped unknown books: ${[...unknownBooks].join(", ")}`);

  await prisma.bibleVerse.deleteMany();
  for (let i = 0; i < verses.length; i += 1000) {
    await prisma.bibleVerse.createMany({ data: verses.slice(i, i + 1000) });
  }
  console.log(`Imported ${verses.length} verses.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
