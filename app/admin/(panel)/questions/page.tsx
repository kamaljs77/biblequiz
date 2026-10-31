import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatReference } from "@/lib/bible";

type Search = { q?: string; tag?: string; status?: string; type?: string; saved?: string };

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-accent-soft text-accent",
  active: "bg-good-soft text-good",
  archived: "bg-surface-2 text-muted",
};

export default async function QuestionList({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin();
  const sp = await searchParams;
  const where: Prisma.QuestionWhereInput = {};
  if (sp.q) {
    where.OR = [
      { prompt: { contains: sp.q, mode: "insensitive" } },
      { sourceRef: { contains: sp.q, mode: "insensitive" } },
    ];
  }
  if (sp.tag) where.tags = { some: { tag: { name: sp.tag } } };
  where.status = sp.status ? sp.status : { not: "archived" };

  const [rows, tags] = await Promise.all([
    prisma.question.findMany({
      where,
      include: { options: true, verseRefs: { orderBy: { sortOrder: "asc" } }, tags: { include: { tag: true } } },
      orderBy: [{ sourceRef: "asc" }, { id: "asc" }],
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);
  const questions = rows.filter((q) => {
    if (!sp.type) return true;
    const multiple = q.options.filter((o) => o.isCorrect).length > 1;
    return sp.type === "multiple" ? multiple : !multiple;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-2xl font-semibold">Question bank</h1>
        <Link href="/admin/questions/new" className="btn-primary">
          New question
        </Link>
      </div>
      {sp.saved && <p className="rounded-lg bg-good-soft px-4 py-2 text-sm text-good">Question saved.</p>}

      <form className="card grid gap-2 p-3 sm:grid-cols-[1fr_auto_auto_auto_auto]">
        <input name="q" defaultValue={sp.q} placeholder="Search questions…" className="input" />
        <select name="tag" defaultValue={sp.tag ?? ""} className="input">
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t.id}>{t.name}</option>
          ))}
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className="input">
          <option value="">Draft + reviewed</option>
          <option value="draft">Draft</option>
          <option value="active">Reviewed</option>
          <option value="archived">Archived</option>
        </select>
        <select name="type" defaultValue={sp.type ?? ""} className="input">
          <option value="">Any type</option>
          <option value="single">Single answer</option>
          <option value="multiple">Multiple answer</option>
        </select>
        <button className="btn-secondary">Filter</button>
      </form>

      <p className="text-sm text-muted">{questions.length} questions</p>
      <ul className="space-y-2">
        {questions.map((q) => {
          const correct = q.options.filter((o) => o.isCorrect).length;
          return (
            <li key={q.id}>
              <Link href={`/admin/questions/${q.id}`} className="card block p-4 hover:border-accent">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-serif font-semibold">
                    {q.sourceRef && <span className="mr-2 text-sm font-normal text-muted">{q.sourceRef}</span>}
                    {q.prompt}
                  </p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[q.status] ?? ""}`}>
                    {q.status === "active" ? "reviewed" : q.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {correct > 1 ? `Multiple answer (${correct} correct)` : "Single answer"} · {q.options.length} options ·{" "}
                  {q.verseRefs.map((v) => formatReference(v)).join("; ")}
                  {q.tags.length > 0 && ` · ${q.tags.map((t) => t.tag.name).join(", ")}`}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
