import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  grade,
  loadAttempt,
  publicOptions,
  publicQuestion,
  questionAt,
  saveState,
} from "@/lib/attempts";
import type { QuizSnapshotContent, SnapshotQuestion } from "@/lib/snapshot";

// A little slack for network latency when checking that the thinking time has passed.
const REVEAL_TOLERANCE_MS = 2000;

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("question"), index: z.number().int().min(0) }),
  z.object({ action: z.literal("reveal"), index: z.number().int().min(0) }),
  z.object({
    action: z.literal("answer"),
    index: z.number().int().min(0),
    selected: z.array(z.string()).max(8),
  }),
  z.object({ action: z.literal("finish") }),
]);

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function feedback(q: SnapshotQuestion, selected: string[]) {
  return { ...grade(q, selected), selected, explanation: q.explanation };
}

function review(content: QuizSnapshotContent, order: string[], answers: Map<string, string[]>) {
  return order.map((key) => {
    const q = content.questions.find((x) => x.key === key)!;
    const selected = answers.get(key) ?? [];
    return {
      key,
      prompt: q.prompt,
      verses: q.verses,
      explanation: q.explanation,
      options: q.options.map((o) => ({ key: o.key, text: o.text, isCorrect: o.isCorrect })),
      selected,
      isCorrect: grade(q, selected).isCorrect,
    };
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid request");
  const loaded = await loadAttempt(id);
  if (!loaded) return fail("Attempt not found", 404);
  const { attempt, content, state } = loaded;
  const body = parsed.data;
  const answers = new Map(attempt.answers.map((a) => [a.questionKey, JSON.parse(a.selectedJson) as string[]]));
  const showFeedback = content.quiz.feedbackMode === "immediate";

  if (body.action === "finish") {
    if (answers.size < state.questionOrder.length) return fail("Some questions are not answered yet.");
    const score = attempt.answers.filter((a) => a.isCorrect).length;
    if (!attempt.completedAt) {
      await prisma.attempt.update({ where: { id }, data: { completedAt: new Date(), score } });
    }
    return NextResponse.json({
      name: attempt.participantName,
      score,
      maxScore: attempt.maxScore,
      review: review(content, state.questionOrder, answers),
    });
  }

  const q = questionAt(content, state, body.index);
  if (!q) return fail("Question not found", 404);
  if (attempt.completedAt) return fail("This attempt is already finished.", 409);

  if (body.action === "question") {
    if (!state.shownAt[q.key]) {
      state.shownAt[q.key] = Date.now();
      await saveState(id, state);
    }
    const prior = answers.get(q.key);
    return NextResponse.json({
      index: body.index,
      total: state.questionOrder.length,
      allowEarlyReveal: content.quiz.allowEarlyReveal,
      question: publicQuestion(q),
      options: state.revealed[q.key] ? publicOptions(q, state) : null,
      feedback: prior ? (showFeedback ? feedback(q, prior) : { selected: prior }) : null,
    });
  }

  if (body.action === "reveal") {
    const shownAt = state.shownAt[q.key];
    if (!shownAt) return fail("Question has not been shown yet.");
    const elapsed = Date.now() - shownAt;
    if (!content.quiz.allowEarlyReveal && elapsed + REVEAL_TOLERANCE_MS < q.thinkTimeSeconds * 1000) {
      return fail("Please take the full thinking time.", 403);
    }
    if (!state.revealed[q.key]) {
      state.revealed[q.key] = true;
      await saveState(id, state);
    }
    return NextResponse.json({ options: publicOptions(q, state) });
  }

  // answer
  if (!state.revealed[q.key]) return fail("Options have not been shown yet.");
  if (answers.has(q.key)) return fail("This question is already answered.", 409);
  const validKeys = new Set(q.options.map((o) => o.key));
  const selected = [...new Set(body.selected)].filter((k) => validKeys.has(k));
  if (selected.length === 0) return fail("Please choose an answer.");
  if (q.type === "single" && selected.length > 1) return fail("Choose only one answer.");
  const result = grade(q, selected);
  await prisma.attemptAnswer.create({
    data: {
      attemptId: id,
      questionKey: q.key,
      selectedJson: JSON.stringify(selected),
      isCorrect: result.isCorrect,
    },
  });
  return NextResponse.json({ feedback: showFeedback ? feedback(q, selected) : { selected } });
}
