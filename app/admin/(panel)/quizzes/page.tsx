import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { CopyLink } from "./CopyLink";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-accent-soft text-accent",
  published: "bg-good-soft text-good",
  archived: "bg-surface-2 text-muted",
};

export default async function QuizList({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  await requireAdmin();
  const showArchived = (await searchParams).archived === "1";
  const quizzes = await prisma.quiz.findMany({
    where: showArchived ? {} : { status: { not: "archived" } },
    include: {
      series: true,
      _count: { select: { questions: true } },
      attempts: { select: { score: true, maxScore: true, completedAt: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-2xl font-semibold">Quizzes</h1>
        <div className="flex gap-2">
          <Link href={showArchived ? "/admin/quizzes" : "/admin/quizzes?archived=1"} className="btn-secondary">
            {showArchived ? "Hide archived" : "Show archived"}
          </Link>
          <Link href="/admin/quizzes/new" className="btn-primary">
            New quiz
          </Link>
        </div>
      </div>
      <ul className="space-y-2">
        {quizzes.map((q) => {
          const done = q.attempts.filter((a) => a.completedAt);
          const avg = done.length
            ? Math.round((done.reduce((s, a) => s + a.score / (a.maxScore || 1), 0) / done.length) * 100)
            : null;
          return (
            <li key={q.id} className="card flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <Link href={`/admin/quizzes/${q.id}`} className="font-serif font-semibold hover:underline">
                  {q.title}
                </Link>
                <p className="text-xs text-muted">
                  {q.series?.name && `${q.series.name} · `}
                  {q._count.questions} questions · {q.attempts.length} attempts
                  {avg != null && ` · average ${avg}%`}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[q.status] ?? ""}`}>{q.status}</span>
              {q.status === "published" && <CopyLink path={`/quiz/${q.slug}`} />}
              {q.status === "draft" && (
                <Link href={`/admin/quizzes/${q.id}/preview`} className="btn-secondary">
                  Preview
                </Link>
              )}
            </li>
          );
        })}
        {quizzes.length === 0 && <li className="text-muted">No quizzes yet.</li>}
      </ul>
    </div>
  );
}
