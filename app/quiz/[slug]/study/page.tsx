import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedSnapshot } from "@/lib/snapshot";
import { StudyList } from "@/components/StudyList";
import { ShareButtons } from "@/components/ShareButtons";
import { NewerVersionNotice, Unavailable } from "@/components/Unavailable";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await getPublishedSnapshot((await params).slug);
  if (!found) return {};
  const title = `${found.content.quiz.title} (Study)`;
  const description = found.content.quiz.description || "Questions, verses and answers for study.";
  return { title, description, openGraph: { title, description, type: "article" } };
}

export default async function StudyPage({ params }: Props) {
  const { slug } = await params;
  const found = await getPublishedSnapshot(slug);
  if (!found || !found.content.quiz.studyModeEnabled) notFound();
  if (found.archived) return <Unavailable newer={found.supersededBy} />;
  const { quiz, questions } = found.content;

  return (
    <div className="space-y-8">
      {found.supersededBy && <NewerVersionNotice newer={found.supersededBy} />}
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">Study Mode{quiz.seriesName && ` · ${quiz.seriesName}`}</p>
        <h1 className="font-serif text-3xl font-semibold">{quiz.title}</h1>
        {quiz.description && <p className="text-muted">{quiz.description}</p>}
        <div className="flex flex-wrap gap-2 pt-2 print:hidden">
          <Link href={`/quiz/${slug}`} className="btn-primary">
            Take the quiz
          </Link>
          <PrintButton />
        </div>
      </header>

      <StudyList questions={questions} />

      <div className="space-y-2 print:hidden">
        <h2 className="font-semibold">Share this study page</h2>
        <ShareButtons path={`/quiz/${slug}/study`} title={`${quiz.title} (Study)`} />
      </div>
    </div>
  );
}
