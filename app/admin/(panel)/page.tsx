import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { bibleIsLoaded } from "@/lib/verses";

export default async function Dashboard() {
  await requireAdmin();
  const [questions, drafts, quizzes, published, attempts, completed, loaded] = await Promise.all([
    prisma.question.count({ where: { status: { not: "archived" } } }),
    prisma.question.count({ where: { status: "draft" } }),
    prisma.quiz.count({ where: { status: { not: "archived" } } }),
    prisma.quiz.count({ where: { status: "published" } }),
    prisma.attempt.count(),
    prisma.attempt.count({ where: { completedAt: { not: null } } }),
    bibleIsLoaded(),
  ]);

  const stats = [
    { label: "Questions", value: questions, sub: `${drafts} draft` },
    { label: "Quizzes", value: quizzes, sub: `${published} published` },
    { label: "Attempts", value: attempts, sub: `${completed} completed` },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-semibold">Dashboard</h1>
      {!loaded && (
        <div className="rounded-lg border border-accent bg-accent-soft px-4 py-3 text-sm">
          The full World English Bible text has not been imported yet, so only a few sample verses are available. Run{" "}
          <code className="font-mono">npm run bible:import</code> to load it.
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-sm text-muted">{s.label}</p>
            <p className="text-3xl font-semibold">{s.value}</p>
            <p className="text-xs text-muted">{s.sub}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/questions/new" className="btn-primary">
          New question
        </Link>
        <Link href="/admin/quizzes/new" className="btn-secondary">
          New quiz
        </Link>
      </div>
    </div>
  );
}
