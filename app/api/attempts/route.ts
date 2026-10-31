import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getPublishedSnapshot } from "@/lib/snapshot";
import { initialState } from "@/lib/attempts";

const Body = z.object({
  slug: z.string().min(1),
  name: z.string().trim().min(1, "Please enter your name.").max(50),
});

/** Starts an attempt for a published quiz. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const found = await getPublishedSnapshot(parsed.data.slug);
  if (!found || found.archived) {
    return NextResponse.json({ error: "This quiz is no longer available." }, { status: 404 });
  }
  const state = initialState(found.content);
  const attempt = await prisma.attempt.create({
    data: {
      quizId: found.quiz.id,
      participantName: parsed.data.name,
      stateJson: JSON.stringify(state),
      maxScore: found.content.questions.length,
    },
  });
  return NextResponse.json({ attemptId: attempt.id, total: state.questionOrder.length });
}
