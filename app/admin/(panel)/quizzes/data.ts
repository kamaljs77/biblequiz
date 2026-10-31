import { prisma } from "@/lib/db";
import type { BankQuestion } from "./QuizForm";
import type { QuizInput } from "./actions";

export const EMPTY_QUIZ: QuizInput = {
  title: "",
  slug: "",
  seriesId: null,
  description: "",
  thinkTimeSeconds: 60,
  allowEarlyReveal: true,
  shuffleQuestions: false,
  shuffleOptions: true,
  feedbackMode: "immediate",
  studyModeEnabled: true,
  questionIds: [],
};

export async function loadBuilderData() {
  const [questions, series] = await Promise.all([
    prisma.question.findMany({
      include: { options: true, tags: { include: { tag: true } } },
      orderBy: [{ sourceRef: "asc" }, { id: "asc" }],
    }),
    prisma.series.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  const bank: BankQuestion[] = questions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    sourceRef: q.sourceRef,
    status: q.status,
    multiple: q.options.filter((o) => o.isCorrect).length > 1,
    tags: q.tags.map((t) => t.tag.name),
  }));
  return { bank, series: series.map((s) => ({ id: s.id, name: s.name })) };
}
