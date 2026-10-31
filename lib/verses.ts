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
  const rows = await prisma.bibleVerse.findMany({
    where: {
      book: ref.book,
      chapter: ref.chapter,
      verse: { gte: ref.verseStart, lte: ref.verseEnd },
    },
    orderBy: { verse: "asc" },
  });
  return {
    ...ref,
    label: formatReference(ref),
    lines: rows.map((r) => ({ verse: r.verse, text: r.text })),
    complete: rows.length === ref.verseEnd - ref.verseStart + 1,
  };
}

/** Whether the WEB text has been imported (beyond the small development sample). */
export async function bibleIsLoaded(): Promise<boolean> {
  return (await prisma.bibleVerse.count()) > 30000;
}
