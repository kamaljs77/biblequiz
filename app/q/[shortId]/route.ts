import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Short links: /q/{shortId} → /quiz/{slug} (FR-5.3). */
export async function GET(req: Request, { params }: { params: Promise<{ shortId: string }> }) {
  const { shortId } = await params;
  const quiz = await prisma.quiz.findUnique({ where: { shortId } });
  const target = quiz && quiz.status !== "draft" ? `/quiz/${quiz.slug}` : "/";
  return NextResponse.redirect(new URL(target, req.url), 308);
}
