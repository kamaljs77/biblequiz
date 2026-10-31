import { randomInt } from "crypto";
import { prisma } from "@/lib/db";
import type { QuizSnapshotContent } from "@/lib/snapshot";
import { initialState as buildInitialState, type AttemptState } from "@/lib/attempt-logic";

export function initialState(content: QuizSnapshotContent): AttemptState {
  return buildInitialState(content, (max) => randomInt(max));
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
