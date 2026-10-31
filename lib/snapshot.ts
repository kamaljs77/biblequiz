import { prisma } from "@/lib/db";
import { resolveReferences, type VerseLine } from "@/lib/verses";

/** The frozen content of a published quiz (requirements FR-5.4). */
export type QuizSnapshotContent = {
  version: 1;
  quiz: {
    id: number;
    slug: string;
    shortId: string;
    title: string;
    description: string;
    seriesName: string | null;
    thinkTimeSeconds: number;
    allowEarlyReveal: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    feedbackMode: "immediate" | "end";
    studyModeEnabled: boolean;
  };
  questions: SnapshotQuestion[];
};

export type SnapshotQuestion = {
  key: string;
  prompt: string;
  explanation: string;
  sourceRef: string | null;
  thinkTimeSeconds: number;
  type: "single" | "multiple";
  verses: { label: string; lines: VerseLine[] }[];
  options: { key: string; text: string; isCorrect: boolean }[];
};

export async function buildSnapshot(quizId: number): Promise<QuizSnapshotContent> {
  const quiz = await prisma.quiz.findUniqueOrThrow({
    where: { id: quizId },
    include: {
      series: true,
      questions: {
        orderBy: { sortOrder: "asc" },
        include: {
          question: {
            include: {
              options: { orderBy: { sortOrder: "asc" } },
              verseRefs: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
    },
  });

  const resolved = await resolveReferences(quiz.questions.flatMap(({ question: q }) => q.verseRefs));
  let next = 0;

  const questions: SnapshotQuestion[] = [];
  for (const { question: q } of quiz.questions) {
    const verses = resolved.slice(next, next + q.verseRefs.length).map((r) => ({ label: r.label, lines: r.lines }));
    next += q.verseRefs.length;
    const correctCount = q.options.filter((o) => o.isCorrect).length;
    questions.push({
      key: `q${q.id}`,
      prompt: q.prompt,
      explanation: q.explanation,
      sourceRef: q.sourceRef,
      thinkTimeSeconds: q.thinkTimeSeconds ?? quiz.thinkTimeSeconds,
      type: correctCount > 1 ? "multiple" : "single",
      verses,
      options: q.options.map((o) => ({ key: `o${o.id}`, text: o.text, isCorrect: o.isCorrect })),
    });
  }

  return {
    version: 1,
    quiz: {
      id: quiz.id,
      slug: quiz.slug,
      shortId: quiz.shortId,
      title: quiz.title,
      description: quiz.description,
      seriesName: quiz.series?.name ?? null,
      thinkTimeSeconds: quiz.thinkTimeSeconds,
      allowEarlyReveal: quiz.allowEarlyReveal,
      shuffleQuestions: quiz.shuffleQuestions,
      shuffleOptions: quiz.shuffleOptions,
      feedbackMode: quiz.feedbackMode === "end" ? "end" : "immediate",
      studyModeEnabled: quiz.studyModeEnabled,
    },
    questions,
  };
}

/** Problems that block publishing, listed for the admin. */
export async function validateForPublish(quizId: number): Promise<string[]> {
  const quiz = await prisma.quiz.findUniqueOrThrow({
    where: { id: quizId },
    include: {
      questions: {
        include: { question: { include: { options: true, verseRefs: true } } },
      },
    },
  });
  const problems: string[] = [];
  if (quiz.questions.length === 0) problems.push("The quiz has no questions.");
  for (const { question: q } of quiz.questions) {
    const label = `"${q.prompt.slice(0, 60)}"`;
    if (q.verseRefs.length === 0) problems.push(`${label} has no verse reference.`);
    if (q.options.length < 2) problems.push(`${label} has fewer than 2 options.`);
    if (!q.options.some((o) => o.isCorrect)) problems.push(`${label} has no correct option.`);
    if (q.status === "archived") problems.push(`${label} is archived.`);
  }
  return problems;
}

export async function getPublishedSnapshot(slug: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { slug },
    include: { snapshot: true },
  });
  if (!quiz || quiz.status === "draft" || !quiz.snapshot) return null;
  const content = JSON.parse(quiz.snapshot.contentJson) as QuizSnapshotContent;
  let supersededBy: { slug: string; title: string } | null = null;
  if (quiz.supersededById) {
    const next = await prisma.quiz.findUnique({ where: { id: quiz.supersededById } });
    if (next && next.status === "published") supersededBy = { slug: next.slug, title: next.title };
  }
  return { quiz, content, archived: quiz.status === "archived", supersededBy };
}
