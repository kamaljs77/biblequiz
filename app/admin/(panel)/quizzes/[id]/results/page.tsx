import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import type { QuizSnapshotContent } from "@/lib/snapshot";

export default async function QuizResults({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  const quiz = Number.isInteger(id)
    ? await prisma.quiz.findUnique({
        where: { id },
        include: { snapshot: true, attempts: { include: { answers: true }, orderBy: { startedAt: "desc" } } },
      })
    : null;
  if (!quiz?.snapshot) notFound();
  const content = JSON.parse(quiz.snapshot.contentJson) as QuizSnapshotContent;
  const completed = quiz.attempts.filter((a) => a.completedAt);
  const avg = completed.length
    ? Math.round((completed.reduce((s, a) => s + a.score / (a.maxScore || 1), 0) / completed.length) * 100)
    : null;

  const perQuestion = content.questions.map((q) => {
    const answers = quiz.attempts.flatMap((a) => a.answers.filter((x) => x.questionKey === q.key));
    const picks = new Map<string, number>();
    for (const a of answers) for (const k of JSON.parse(a.selectedJson) as string[]) picks.set(k, (picks.get(k) ?? 0) + 1);
    return {
      q,
      total: answers.length,
      correct: answers.filter((a) => a.isCorrect).length,
      picks,
    };
  });

  return (
    <div className="space-y-6">
      <Link href={`/admin/quizzes/${id}`} className="text-sm text-muted hover:underline">
        ← {quiz.title}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-2xl font-semibold">Results</h1>
        <a href={`/api/admin/quizzes/${id}/attempts.csv`} className="btn-secondary">
          Export CSV
        </a>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-sm text-muted">Attempts</p>
          <p className="text-3xl font-semibold">{quiz.attempts.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted">Completed</p>
          <p className="text-3xl font-semibold">{completed.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted">Average score</p>
          <p className="text-3xl font-semibold">{avg == null ? "–" : `${avg}%`}</p>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">Participants</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr className="border-b border-line">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {quiz.attempts.map((a) => (
                <tr key={a.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2">{a.participantName}</td>
                  <td className="px-4 py-2 text-muted">{a.startedAt.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {a.completedAt ? `${a.score}/${a.maxScore}` : <span className="text-muted">in progress</span>}
                  </td>
                </tr>
              ))}
              {quiz.attempts.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-center text-muted">
                    No attempts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">By question</h2>
        {perQuestion.map(({ q, total, correct, picks }, i) => (
          <div key={q.key} className="card space-y-2 p-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="font-serif font-semibold">
                {i + 1}. {q.prompt}
              </p>
              <span className="shrink-0 font-semibold">{total ? `${Math.round((correct / total) * 100)}% correct` : "–"}</span>
            </div>
            <ul className="space-y-1">
              {q.options.map((o) => {
                const n = picks.get(o.key) ?? 0;
                const pct = total ? Math.round((n / total) * 100) : 0;
                return (
                  <li key={o.key} className="flex items-center gap-2">
                    <span className={`w-48 shrink-0 truncate sm:w-72 ${o.isCorrect ? "font-semibold text-good" : "text-muted"}`}>
                      {o.isCorrect ? "✓ " : ""}
                      {o.text}
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded bg-surface-2">
                      <span className={`block h-full ${o.isCorrect ? "bg-good" : "bg-muted"}`} style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-10 text-right tabular-nums text-muted">{pct}%</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
