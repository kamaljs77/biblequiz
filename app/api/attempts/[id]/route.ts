import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { loadAttempt, saveState } from "@/lib/attempts";
import { handleAction } from "@/lib/attempt-logic";

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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const loaded = await loadAttempt(id);
  if (!loaded) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  const { attempt, content, state } = loaded;

  const result = handleAction(
    {
      content,
      state,
      answers: new Map(attempt.answers.map((a) => [a.questionKey, JSON.parse(a.selectedJson) as string[]])),
      completed: !!attempt.completedAt,
      participantName: attempt.participantName,
    },
    parsed.data,
    Date.now(),
  );

  if (result.stateChanged) await saveState(id, state);
  if (result.recordAnswer) {
    const { questionKey, selected, isCorrect } = result.recordAnswer;
    await prisma.attemptAnswer.create({
      data: { attemptId: id, questionKey, selectedJson: JSON.stringify(selected), isCorrect },
    });
  }
  if (result.complete) {
    await prisma.attempt.update({ where: { id }, data: { completedAt: new Date(), score: result.complete.score } });
  }
  return NextResponse.json(result.data, { status: result.status });
}
