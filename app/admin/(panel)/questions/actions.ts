"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseReference } from "@/lib/bible";
import { bibleIsLoaded, resolveReference } from "@/lib/verses";

const QuestionInput = z.object({
  prompt: z.string().trim().min(1, "Enter the question."),
  explanation: z.string().trim(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  status: z.enum(["draft", "active"]),
  thinkTimeSeconds: z.number().int().min(0).max(600).nullable(),
  sourceRef: z.string().trim().max(40),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  refs: z.array(z.string().trim()).min(1, "Add at least one verse reference."),
  options: z
    .array(z.object({ text: z.string().trim().min(1, "Option text cannot be empty."), isCorrect: z.boolean() }))
    .min(2, "Add at least 2 options.")
    .max(8, "Use at most 8 options."),
});

export type QuestionInput = z.infer<typeof QuestionInput>;

export async function saveQuestion(id: number | null, input: QuestionInput): Promise<{ errors: string[] }> {
  await requireAdmin();
  const parsed = QuestionInput.safeParse(input);
  if (!parsed.success) return { errors: [...new Set(parsed.error.issues.map((i) => i.message))] };
  const data = parsed.data;
  const errors: string[] = [];

  if (!data.options.some((o) => o.isCorrect)) errors.push("Mark at least one option as correct.");

  const loaded = await bibleIsLoaded();
  const refs = [];
  for (const raw of data.refs.filter(Boolean)) {
    const ref = parseReference(raw);
    if (!ref) {
      errors.push(`“${raw}” is not a valid reference.`);
      continue;
    }
    if (loaded && !(await resolveReference(ref)).complete) errors.push(`“${raw}” is not in the Bible text.`);
    refs.push(ref);
  }
  if (refs.length === 0 && errors.length === 0) errors.push("Add at least one verse reference.");
  if (errors.length) return { errors };

  const fields = {
    prompt: data.prompt,
    explanation: data.explanation,
    difficulty: data.difficulty,
    status: data.status,
    thinkTimeSeconds: data.thinkTimeSeconds,
    sourceRef: data.sourceRef || null,
  };
  const children = {
    options: { create: data.options.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, sortOrder: i })) },
    verseRefs: { create: refs.map((r, i) => ({ ...r, sortOrder: i })) },
    tags: {
      create: [...new Set(data.tags)].map((name) => ({
        tag: { connectOrCreate: { where: { name }, create: { name } } },
      })),
    },
  };

  if (id == null) {
    const q = await prisma.question.create({ data: { ...fields, ...children } });
    id = q.id;
  } else {
    // Published quizzes read from their frozen snapshot, so replacing children is safe (FR-5.5).
    await prisma.$transaction([
      prisma.option.deleteMany({ where: { questionId: id } }),
      prisma.verseRef.deleteMany({ where: { questionId: id } }),
      prisma.questionTag.deleteMany({ where: { questionId: id } }),
      prisma.question.update({ where: { id }, data: { ...fields, ...children } }),
    ]);
  }
  revalidatePath("/admin/questions");
  redirect(`/admin/questions?saved=${id}`);
}

export async function setQuestionArchived(id: number, archived: boolean) {
  await requireAdmin();
  await prisma.question.update({ where: { id }, data: { status: archived ? "archived" : "active" } });
  revalidatePath("/admin/questions");
}

export async function deleteQuestion(id: number): Promise<{ error?: string }> {
  await requireAdmin();
  const uses = await prisma.quizQuestion.count({ where: { questionId: id } });
  if (uses > 0) return { error: "This question is used in a quiz. Archive it instead." };
  await prisma.question.delete({ where: { id } });
  revalidatePath("/admin/questions");
  redirect("/admin/questions");
}
