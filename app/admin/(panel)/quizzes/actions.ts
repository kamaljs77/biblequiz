"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { copyQuiz, newShortId, publishQuiz, slugify, uniqueSlug } from "@/lib/quizzes";

const QuizInput = z.object({
  title: z.string().trim().min(1, "Enter a title."),
  slug: z.string().trim().max(80),
  seriesId: z.number().int().nullable(),
  description: z.string().trim().max(500),
  thinkTimeSeconds: z.number().int().min(0).max(600),
  allowEarlyReveal: z.boolean(),
  shuffleQuestions: z.boolean(),
  shuffleOptions: z.boolean(),
  feedbackMode: z.enum(["immediate", "end"]),
  studyModeEnabled: z.boolean(),
  questionIds: z.array(z.number().int()).max(200),
});

export type QuizInput = z.infer<typeof QuizInput>;

export async function saveQuiz(
  id: number | null,
  input: QuizInput,
  publishAfter = false,
): Promise<{ errors: string[] }> {
  await requireAdmin();
  const parsed = QuizInput.safeParse(input);
  if (!parsed.success) return { errors: [...new Set(parsed.error.issues.map((i) => i.message))] };
  const { questionIds, slug: rawSlug, ...fields } = parsed.data;

  if (id != null) {
    const existing = await prisma.quiz.findUnique({ where: { id } });
    if (!existing) return { errors: ["Quiz not found."] };
    if (existing.status !== "draft") return { errors: ["Published quizzes are frozen. Create a new version instead."] };
  }

  const wanted = slugify(rawSlug || fields.title);
  if (!wanted) return { errors: ["Enter a link name using letters or numbers."] };
  const clash = await prisma.quiz.findUnique({ where: { slug: wanted } });
  if (clash && clash.id !== id) return { errors: [`The link “/quiz/${wanted}” is already used by “${clash.title}”.`] };

  const questions = { create: [...new Set(questionIds)].map((questionId, i) => ({ questionId, sortOrder: i })) };
  if (id == null) {
    const quiz = await prisma.quiz.create({ data: { ...fields, slug: wanted, shortId: newShortId(), questions } });
    id = quiz.id;
  } else {
    await prisma.$transaction([
      prisma.quizQuestion.deleteMany({ where: { quizId: id } }),
      prisma.quiz.update({ where: { id }, data: { ...fields, slug: wanted, questions } }),
    ]);
  }
  revalidatePath("/admin/quizzes");
  if (publishAfter) {
    const problems = await publishQuiz(id);
    if (problems.length) return { errors: ["Saved as draft, but it could not be published:", ...problems] };
    revalidatePath("/");
    redirect(`/admin/quizzes/${id}?published=1`);
  }
  redirect(`/admin/quizzes/${id}?saved=1`);
}

export async function setArchived(id: number, archived: boolean) {
  await requireAdmin();
  const quiz = await prisma.quiz.findUniqueOrThrow({ where: { id } });
  // Restoring returns a quiz to published if it was ever published, otherwise to draft.
  const status = archived ? "archived" : quiz.publishedAt ? "published" : "draft";
  await prisma.quiz.update({ where: { id }, data: { status } });
  revalidatePath("/");
  revalidatePath("/admin/quizzes");
  revalidatePath(`/admin/quizzes/${id}`);
}

export async function makeCopy(id: number, asNewVersion: boolean) {
  await requireAdmin();
  const copy = await copyQuiz(id, asNewVersion);
  revalidatePath("/admin/quizzes");
  redirect(`/admin/quizzes/${copy.id}`);
}

export async function createSeries(name: string): Promise<{ id: number; name: string } | { error: string }> {
  await requireAdmin();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Enter a series name." };
  const slug = slugify(trimmed);
  const existing = await prisma.series.findUnique({ where: { slug } });
  if (existing) return { id: existing.id, name: existing.name };
  const s = await prisma.series.create({ data: { name: trimmed, slug } });
  return { id: s.id, name: s.name };
}

export async function suggestSlug(title: string) {
  await requireAdmin();
  return uniqueSlug(title);
}
