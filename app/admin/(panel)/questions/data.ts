import { prisma } from "@/lib/db";
import { formatReference } from "@/lib/bible";
import type { QuestionInput } from "./actions";

export const EMPTY_QUESTION: QuestionInput = {
  prompt: "",
  explanation: "",
  difficulty: "medium",
  status: "draft",
  thinkTimeSeconds: null,
  sourceRef: "",
  tags: [],
  refs: [""],
  options: [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
};

export async function loadQuestionForEdit(id: number) {
  const q = await prisma.question.findUnique({
    where: { id },
    include: {
      options: { orderBy: { sortOrder: "asc" } },
      verseRefs: { orderBy: { sortOrder: "asc" } },
      tags: { include: { tag: true } },
      quizzes: { include: { quiz: true } },
    },
  });
  if (!q) return null;
  const initial: QuestionInput = {
    prompt: q.prompt,
    explanation: q.explanation,
    difficulty: (["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "medium") as QuestionInput["difficulty"],
    status: q.status === "draft" ? "draft" : "active",
    thinkTimeSeconds: q.thinkTimeSeconds,
    sourceRef: q.sourceRef ?? "",
    tags: q.tags.map((t) => t.tag.name),
    refs: q.verseRefs.map((v) => formatReference(v)),
    options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
  };
  return {
    question: q,
    initial,
    usedIn: q.quizzes.map((x) => ({ id: x.quiz.id, title: x.quiz.title, status: x.quiz.status })),
  };
}
