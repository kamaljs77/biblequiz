import Link from "next/link";

export function Unavailable({ newer }: { newer?: { slug: string; title: string } | null }) {
  return (
    <div className="card space-y-3 p-6 text-center">
      <h1 className="font-serif text-2xl font-semibold">This quiz is no longer available</h1>
      {newer ? (
        <p>
          A newer version is available:{" "}
          <Link href={`/quiz/${newer.slug}`} className="font-semibold text-accent underline">
            {newer.title}
          </Link>
        </p>
      ) : (
        <p className="text-muted">It may have been archived by the author.</p>
      )}
      <Link href="/" className="btn-secondary">
        See all quizzes
      </Link>
    </div>
  );
}

export function NewerVersionNotice({ newer }: { newer: { slug: string; title: string } }) {
  return (
    <div className="rounded-lg border border-accent bg-accent-soft px-4 py-3 text-sm">
      A newer version of this quiz is available:{" "}
      <Link href={`/quiz/${newer.slug}`} className="font-semibold text-accent underline">
        {newer.title}
      </Link>
    </div>
  );
}
