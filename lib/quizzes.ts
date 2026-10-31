import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { buildSnapshot, validateForPublish } from "@/lib/snapshot";

const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newShortId(length = 6) {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function uniqueSlug(base: string, excludeId?: number) {
  const root = slugify(base) || "quiz";
  let slug = root;
  for (let n = 2; ; n++) {
    const clash = await prisma.quiz.findUnique({ where: { slug } });
    if (!clash || clash.id === excludeId) return slug;
    slug = `${root}-${n}`;
  }
}

/** Freezes the quiz (FR-5.4). Returns the problems that blocked publishing, if any. */
export async function publishQuiz(quizId: number): Promise<string[]> {
  const problems = await validateForPublish(quizId);
  if (problems.length) return problems;
  const content = await buildSnapshot(quizId);
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.quizSnapshot.create({
      data: { quizId, publishedAt: now, contentJson: JSON.stringify(content) },
    });
    const quiz = await tx.quiz.update({
      where: { id: quizId },
      data: { status: "published", publishedAt: now },
      include: { questions: true },
    });
    // Questions used in a published quiz become active in the bank.
    await tx.question.updateMany({
      where: { id: { in: quiz.questions.map((q) => q.questionId) }, status: "draft" },
      data: { status: "active" },
    });
    if (quiz.previousVersionId) {
      await tx.quiz.update({
        where: { id: quiz.previousVersionId },
        data: { supersededById: quizId },
      });
    }
  });
  return [];
}

/** Copies a quiz into a new draft. With asNewVersion, links the two (FR-5.6). */
export async function copyQuiz(quizId: number, asNewVersion: boolean) {
  const src = await prisma.quiz.findUniqueOrThrow({
    where: { id: quizId },
    include: { questions: true },
  });
  const baseSlug = asNewVersion ? nextVersionSlug(src.slug) : `${src.slug}-copy`;
  return prisma.quiz.create({
    data: {
      slug: await uniqueSlug(baseSlug),
      shortId: newShortId(),
      seriesId: src.seriesId,
      title: asNewVersion ? src.title : `${src.title} (copy)`,
      description: src.description,
      coverImageUrl: src.coverImageUrl,
      thinkTimeSeconds: src.thinkTimeSeconds,
      allowEarlyReveal: src.allowEarlyReveal,
      shuffleQuestions: src.shuffleQuestions,
      shuffleOptions: src.shuffleOptions,
      feedbackMode: src.feedbackMode,
      studyModeEnabled: src.studyModeEnabled,
      sortOrder: src.sortOrder,
      previousVersionId: asNewVersion ? src.id : null,
      questions: {
        create: src.questions.map((q) => ({ questionId: q.questionId, sortOrder: q.sortOrder })),
      },
    },
  });
}

function nextVersionSlug(slug: string) {
  const m = slug.match(/^(.*)-v(\d+)$/);
  return m ? `${m[1]}-v${Number(m[2]) + 1}` : `${slug}-v2`;
}
