import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedSnapshot } from "@/lib/snapshot";
import { NewerVersionNotice, Unavailable } from "@/components/Unavailable";
import { StartForm } from "./StartForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await getPublishedSnapshot((await params).slug);
  if (!found) return {};
  const { title, description } = found.content.quiz;
  return {
    title,
    description: description || "A Bible quiz drawn from the Scriptures.",
    openGraph: { title, description, type: "website" },
  };
}

export default async function QuizStart({ params }: Props) {
  const { slug } = await params;
  const found = await getPublishedSnapshot(slug);
  if (!found) notFound();
  if (found.archived) return <Unavailable newer={found.supersededBy} />;
  const { quiz, questions } = found.content;

  return (
    <div className="space-y-6">
      {found.supersededBy && <NewerVersionNotice newer={found.supersededBy} />}
      <div className="space-y-2">
        {quiz.seriesName && <p className="text-sm font-semibold uppercase tracking-wide text-muted">{quiz.seriesName}</p>}
        <h1 className="font-serif text-3xl font-semibold">{quiz.title}</h1>
        {quiz.description && <p className="text-muted">{quiz.description}</p>}
        <p className="text-sm text-muted">
          {questions.length} questions
          {quiz.thinkTimeSeconds > 0 && ` · ${quiz.thinkTimeSeconds} seconds of thinking time for each`}
        </p>
      </div>

      <div className="card space-y-3 p-5 text-sm">
        <h2 className="font-semibold">How it works</h2>
        <ol className="list-decimal space-y-1 pl-5 text-muted">
          <li>Read the question and the Bible verses it is based on.</li>
          <li>
            Take time to think while the timer runs
            {quiz.allowEarlyReveal && " (or tap “I’m ready” when you are)"}.
          </li>
          <li>The answers then appear. Some questions have more than one correct answer.</li>
        </ol>
      </div>

      <StartForm slug={slug} />

      {quiz.studyModeEnabled && (
        <p className="text-sm text-muted">
          Just want to read?{" "}
          <Link href={`/quiz/${slug}/study`} className="font-semibold text-accent underline">
            Open Study Mode
          </Link>{" "}
          to see every question with its verses and answers.
        </p>
      )}
    </div>
  );
}
