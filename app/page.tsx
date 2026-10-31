import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const quizzes = await prisma.quiz.findMany({
    where: { status: "published" },
    include: { series: true, _count: { select: { questions: true } } },
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "asc" }],
  });

  const groups = new Map<string, typeof quizzes>();
  for (const q of quizzes) {
    const name = q.series?.name ?? "Other quizzes";
    groups.set(name, [...(groups.get(name) ?? []), q]);
  }

  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h1 className="font-serif text-3xl font-semibold sm:text-4xl">Read. Think. Answer.</h1>
        <p className="text-muted">
          Every question comes with the Scriptures it is drawn from. Read the verses, take a minute to think, and
          then choose your answer.
        </p>
      </section>

      {quizzes.length === 0 && <p className="text-muted">No quizzes have been published yet.</p>}

      {[...groups].map(([series, list]) => (
        <section key={series} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{series}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {list.map((q) => (
              <li key={q.id}>
                <Link href={`/quiz/${q.slug}`} className="card block h-full p-4 transition hover:border-accent">
                  <h3 className="font-serif text-lg font-semibold">{q.title}</h3>
                  {q.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{q.description}</p>}
                  <p className="mt-3 text-xs text-muted">{q._count.questions} questions</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
