import { prisma } from "@/lib/db";
import { formatReference, type ParsedRef } from "@/lib/bible";

export type VerseLine = { verse: number; text: string };

export type ResolvedRef = ParsedRef & {
  label: string;
  lines: VerseLine[];
  /** False when one or more verses in the range are not in the WEB table. */
  complete: boolean;
};

export async function resolveReference(ref: ParsedRef): Promise<ResolvedRef> {
  const rows = (
    await prisma.bibleVerse.findMany({
      where: {
        book: ref.book,
        chapter: ref.chapter,
        verse: { gte: ref.verseStart, lte: ref.verseEnd },
      },
      orderBy: { verse: "asc" },
    })
  ).filter((r) => r.text.trim()); // The WEB leaves some verses blank (e.g. Acts 8:37).
  return {
    ...ref,
    label: formatReference(ref),
    lines: rows.map((r) => ({ verse: r.verse, text: r.text })),
    complete: rows.length === ref.verseEnd - ref.verseStart + 1,
  };
}

/** Resolves many references with a single query (used when publishing). */
export async function resolveReferences(refs: ParsedRef[]): Promise<ResolvedRef[]> {
  if (refs.length === 0) return [];
  const rows = await prisma.bibleVerse.findMany({
    where: {
      OR: refs.map((r) => ({
        book: r.book,
        chapter: r.chapter,
        verse: { gte: r.verseStart, lte: r.verseEnd },
      })),
    },
  });
  return refs.map((ref) => {
    const lines = rows
      .filter((v) => v.book === ref.book && v.chapter === ref.chapter && v.verse >= ref.verseStart && v.verse <= ref.verseEnd)
      .filter((v) => v.text.trim())
      .sort((a, b) => a.verse - b.verse)
      .map((v) => ({ verse: v.verse, text: v.text }));
    return {
      ...ref,
      label: formatReference(ref),
      lines,
      complete: lines.length === ref.verseEnd - ref.verseStart + 1,
    };
  });
}

/** Whether the WEB text has been imported (beyond the small development sample). */
export async function bibleIsLoaded(): Promise<boolean> {
  return (await prisma.bibleVerse.count()) > 30000;
}
