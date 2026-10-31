// Imports the Westminster Shorter Catechism as draft questions and 11 draft quizzes
// (requirements §10). Usage: npm run wsc:import
//
// Safe to re-run: questions are matched by source ("WSC Q1" …) and quizzes by slug,
// and existing ones are left as they are so the admin's review edits are kept.
// Run `npm run bible:import` first so every proof text can be checked.
import { prisma } from "../lib/db";
import { parseReference, type ParsedRef } from "../lib/bible";
import { bibleIsLoaded, resolveReference } from "../lib/verses";
import { newShortId } from "../lib/quizzes";
import { WSC, WSC_QUIZZES } from "../prisma/data/wsc";

const SERIES_SLUG = "westminster-shorter-catechism";

async function main() {
  if (!(await bibleIsLoaded())) throw new Error("Import the WEB text first: npm run bible:import -- <file>");

  // Check every entry before writing anything.
  const problems: string[] = [];
  const parsed = new Map<number, ParsedRef[]>();
  for (const e of WSC) {
    const refs: ParsedRef[] = [];
    for (const raw of e.refs) {
      const ref = parseReference(raw);
      if (!ref) problems.push(`Q${e.n}: cannot parse "${raw}"`);
      else if (!(await resolveReference(ref)).complete) problems.push(`Q${e.n}: "${raw}" is not in the WEB text`);
      else refs.push(ref);
    }
    if (e.correct.length === 0) problems.push(`Q${e.n}: no correct option`);
    if (e.correct.length + e.wrong.length < 2 || e.correct.length + e.wrong.length > 8) problems.push(`Q${e.n}: needs 2–8 options`);
    parsed.set(e.n, refs);
  }
  const numbers = WSC.map((e) => e.n);
  if (new Set(numbers).size !== 107 || Math.max(...numbers) !== 107) problems.push("Expected questions 1–107 exactly once each.");
  if (problems.length) {
    console.error(`Import report: ${problems.length} problem(s); nothing was imported.\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }

  const series = await prisma.series.upsert({
    where: { slug: SERIES_SLUG },
    create: {
      name: "Westminster Shorter Catechism",
      slug: SERIES_SLUG,
      description: "The 107 questions of the Westminster Shorter Catechism (1647), with their proof texts.",
    },
    update: {},
  });

  const idByNumber = new Map<number, number>();
  let created = 0;
  for (const e of WSC) {
    const sourceRef = `WSC Q${e.n}`;
    const existing = await prisma.question.findFirst({ where: { sourceRef } });
    if (existing) {
      idByNumber.set(e.n, existing.id);
      continue;
    }
    const options = [...e.correct.map((text) => ({ text, isCorrect: true })), ...e.wrong.map((text) => ({ text, isCorrect: false }))];
    const q = await prisma.question.create({
      data: {
        prompt: e.q,
        explanation: `“${e.a}” (WSC Q${e.n})`,
        sourceRef,
        status: "draft",
        options: { create: options.map((o, i) => ({ ...o, sortOrder: i })) },
        verseRefs: { create: parsed.get(e.n)!.map((r, i) => ({ ...r, sortOrder: i })) },
        tags: {
          create: ["WSC", e.topic].map((name) => ({
            tag: { connectOrCreate: { where: { name }, create: { name } } },
          })),
        },
      },
    });
    idByNumber.set(e.n, q.id);
    created++;
  }

  let quizzes = 0;
  for (const [i, def] of WSC_QUIZZES.entries()) {
    if (await prisma.quiz.findUnique({ where: { slug: def.slug } })) continue;
    const ids = numbers.filter((n) => n >= def.from && n <= def.to).map((n) => idByNumber.get(n)!);
    await prisma.quiz.create({
      data: {
        slug: def.slug,
        shortId: newShortId(),
        seriesId: series.id,
        title: def.title,
        description: def.description,
        sortOrder: i + 1,
        shuffleQuestions: false,
        questions: { create: ids.map((questionId, j) => ({ questionId, sortOrder: j })) },
      },
    });
    quizzes++;
  }

  const refCount = [...parsed.values()].reduce((s, r) => s + r.length, 0);
  console.log(`Import report: all ${refCount} proof texts matched the WEB text.`);
  console.log(`Created ${created} questions (${107 - created} already existed) and ${quizzes} draft quizzes.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
