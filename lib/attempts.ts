import { randomInt } from "crypto";
import { prisma } from "@/lib/db";
import type { QuizSnapshotContent, SnapshotQuestion } from "@/lib/snapshot";

/** Server-side state for one attempt. Never sent to the browser as a whole. */
export type AttemptState = {
  questionOrder: string[];
  optionOrder: Record<string, string[]>;
  /** When each question was first shown, used to enforce the thinking time. */
  shownAt: Record<string, number>;
  revealed: Record<string, boolean>;
};

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function initialState(content: QuizSnapshotContent): AttemptState {
  const keys = content.questions.map((q) => q.key);
  const optionOrder: Record<string, string[]> = {};
  for (const q of content.questions) {
    const optKeys = q.options.map((o) => o.key);
    optionOrder[q.key] = content.quiz.shuffleOptions ? shuffle(optKeys) : optKeys;
  }
  return {
    questionOrder: content.quiz.shuffleQuestions ? shuffle(keys) : keys,
    optionOrder,
    shownAt: {},
    revealed: {},
  };
}

export async function loadAttempt(id: string) {
  const attempt = await prisma.attempt.findUnique({
    where: { id },
    include: { quiz: { include: { snapshot: true } }, answers: true },
  });
  if (!attempt?.quiz.snapshot) return null;
  const content = JSON.parse(attempt.quiz.snapshot.contentJson) as QuizSnapshotContent;
  const state = JSON.parse(attempt.stateJson) as AttemptState;
  return { attempt, content, state };
}

export async function saveState(id: string, state: AttemptState) {
  await prisma.attempt.update({ where: { id }, data: { stateJson: JSON.stringify(state) } });
}

export function questionAt(content: QuizSnapshotContent, state: AttemptState, index: number) {
  const key = state.questionOrder[index];
  return key ? content.questions.find((q) => q.key === key) ?? null : null;
}

/** Question as shown during the thinking stage: prompt and verses only. */
export function publicQuestion(q: SnapshotQuestion) {
  return {
    key: q.key,
    prompt: q.prompt,
    type: q.type,
    thinkTimeSeconds: q.thinkTimeSeconds,
    verses: q.verses,
  };
}

/** Options in this attempt's order, without the correct flags. */
export function publicOptions(q: SnapshotQuestion, state: AttemptState) {
  const order = state.optionOrder[q.key] ?? q.options.map((o) => o.key);
  return order
    .map((k) => q.options.find((o) => o.key === k))
    .filter((o): o is NonNullable<typeof o> => !!o)
    .map((o) => ({ key: o.key, text: o.text }));
}

/** FR-3.5: every correct option and no wrong option. */
export function grade(q: SnapshotQuestion, selected: string[]) {
  const correct = new Set(q.options.filter((o) => o.isCorrect).map((o) => o.key));
  const chosen = new Set(selected);
  const isCorrect = correct.size === chosen.size && [...correct].every((k) => chosen.has(k));
  return {
    isCorrect,
    correctKeys: [...correct],
    missedKeys: [...correct].filter((k) => !chosen.has(k)),
    wrongKeys: [...chosen].filter((k) => !correct.has(k)),
  };
}
