import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import type { QuizSnapshotContent } from "@/lib/snapshot";
import { QuizForm } from "../QuizForm";
import { loadBuilderData } from "../data";
import { CopyLink } from "../CopyLink";
import { QuizActions } from "./QuizActions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; published?: string }> };

export default async function QuizDetail({ params, searchParams }: Props) {
  await requireAdmin();
  const id = Number((await params).id);
  const sp = await searchParams;
  const quiz = Number.isInteger(id)
    ? await prisma.quiz.findUnique({
        where: { id },
        include: { questions: { orderBy: { sortOrder: "asc" } }, snapshot: true },
      })
    : null;
  if (!quiz) notFound();

  const [previous, next] = await Promise.all([
    quiz.previousVersionId ? prisma.quiz.findUnique({ where: { id: quiz.previousVersionId } }) : null,
    quiz.supersededById ? prisma.quiz.findUnique({ where: { id: quiz.supersededById } }) : null,
  ]);

  const header = (
    <>
      <Link href="/admin/quizzes" className="text-sm text-muted hover:underline">
        ← Quizzes
      </Link>
      {sp.saved && <p className="rounded-lg bg-good-soft px-4 py-2 text-sm text-good">Draft saved.</p>}
      {sp.published && <p className="rounded-lg bg-good-soft px-4 py-2 text-sm text-good">Published. The quiz is now frozen and its link is live.</p>}
      {previous && (
        <p className="text-sm text-muted">
          New version of{" "}
          <Link href={`/admin/quizzes/${previous.id}`} className="underline">
            {previous.title} (/quiz/{previous.slug})
          </Link>
        </p>
      )}
      {next && (
        <p className="text-sm text-muted">
          Replaced by{" "}
          <Link href={`/admin/quizzes/${next.id}`} className="underline">
            /quiz/{next.slug}
          </Link>{" "}
          ({next.status})
        </p>
      )}
    </>
  );

  if (quiz.status === "draft") {
    const { bank, series } = await loadBuilderData();
    return (
      <div className="space-y-4">
        {header}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-serif text-2xl font-semibold">Edit draft quiz</h1>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/quizzes/${quiz.id}/preview`} className="btn-primary">
              Preview
            </Link>
            <QuizActions id={quiz.id} status={quiz.status} />
          </div>
        </div>
        <p className="text-xs text-muted">Preview shows the last saved draft. Save your changes first.</p>
        <QuizForm
          id={quiz.id}
          bank={bank}
          series={series}
          initial={{
            title: quiz.title,
            slug: quiz.slug,
            seriesId: quiz.seriesId,
            description: quiz.description,
            thinkTimeSeconds: quiz.thinkTimeSeconds,
            allowEarlyReveal: quiz.allowEarlyReveal,
            shuffleQuestions: quiz.shuffleQuestions,
            shuffleOptions: quiz.shuffleOptions,
            feedbackMode: quiz.feedbackMode === "end" ? "end" : "immediate",
            studyModeEnabled: quiz.studyModeEnabled,
            questionIds: quiz.questions.map((q) => q.questionId),
          }}
        />
      </div>
    );
  }

  const content = quiz.snapshot ? (JSON.parse(quiz.snapshot.contentJson) as QuizSnapshotContent) : null;
  return (
    <div className="space-y-4">
      {header}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl font-semibold">{quiz.title}</h1>
          <p className="text-sm text-muted">
            {quiz.status === "archived" ? "Archived" : "Published"}
            {quiz.publishedAt && ` ${quiz.publishedAt.toLocaleDateString()}`} · frozen
          </p>
        </div>
        <QuizActions id={quiz.id} status={quiz.status} />
      </div>

      <div className="card flex flex-wrap items-center gap-2 p-4 text-sm">
        <code className="flex-1 font-mono">/quiz/{quiz.slug}</code>
        <CopyLink path={`/quiz/${quiz.slug}`} />
        <CopyLink path={`/q/${quiz.shortId}`} label="Copy short link" />
        <Link href={`/quiz/${quiz.slug}`} target="_blank" className="btn-secondary">
          Open
        </Link>
        <Link href={`/admin/quizzes/${quiz.id}/preview`} className="btn-secondary">
          Preview
        </Link>
        <Link href={`/admin/quizzes/${quiz.id}/results`} className="btn-secondary">
          Results
        </Link>
      </div>

      {content && (
        <ol className="space-y-2">
          {content.questions.map((q, i) => (
            <li key={q.key} className="card p-4 text-sm">
              <p className="font-serif font-semibold">
                {i + 1}. {q.prompt}
              </p>
              <p className="mt-1 text-xs text-muted">{q.verses.map((v) => v.label).join("; ")}</p>
              <ul className="mt-2 space-y-0.5">
                {q.options.map((o) => (
                  <li key={o.key} className={o.isCorrect ? "font-semibold text-good" : "text-muted"}>
                    {o.isCorrect ? "✓" : "·"} {o.text}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
