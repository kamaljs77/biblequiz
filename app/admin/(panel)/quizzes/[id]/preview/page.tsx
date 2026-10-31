import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { buildSnapshot, validateForPublish, type QuizSnapshotContent } from "@/lib/snapshot";
import { StudyList } from "@/components/StudyList";
import { PreviewPlayer } from "./PreviewPlayer";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> };

/** Private preview of a quiz (FR-8.6). Drafts are built from the last saved version. */
export default async function QuizPreview({ params, searchParams }: Props) {
  await requireAdmin();
  const id = Number((await params).id);
  const view = (await searchParams).view === "study" ? "study" : "play";
  const quiz = Number.isInteger(id) ? await prisma.quiz.findUnique({ where: { id }, include: { snapshot: true } }) : null;
  if (!quiz) notFound();

  const isDraft = quiz.status === "draft";
  const content: QuizSnapshotContent =
    !isDraft && quiz.snapshot ? JSON.parse(quiz.snapshot.contentJson) : await buildSnapshot(id);
  const problems = isDraft ? await validateForPublish(id) : [];

  const tab = (v: string, label: string) => (
    <Link
      href={`/admin/quizzes/${id}/preview${v === "study" ? "?view=study" : ""}`}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === v ? "bg-accent text-accent-ink" : "hover:bg-surface-2"}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="space-y-5">
      <Link href={`/admin/quizzes/${id}`} className="text-sm text-muted hover:underline">
        ← Back to {isDraft ? "editing" : "quiz"}
      </Link>
      <div className="rounded-lg border border-accent bg-accent-soft px-4 py-3 text-sm">
        <p className="font-semibold">Preview{isDraft ? " of the last saved draft" : ""}. Only you can see this.</p>
        <p className="text-muted">
          Answers you give here are not saved. {isDraft && "Unsaved changes in the editor are not shown."}
        </p>
      </div>
      {problems.length > 0 && (
        <ul className="list-disc space-y-1 rounded-lg bg-bad-soft px-8 py-3 text-sm text-bad">
          <li className="list-none -ml-4 font-semibold">This quiz cannot be published yet:</li>
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <div className="flex gap-1">
        {tab("play", "Take the quiz")}
        {tab("study", "Study Mode")}
      </div>

      {content.questions.length === 0 ? (
        <p className="text-muted">Add questions to the quiz to preview it.</p>
      ) : view === "study" ? (
        <div className="space-y-4">
          <h1 className="font-serif text-3xl font-semibold">{content.quiz.title}</h1>
          <StudyList questions={content.questions} />
        </div>
      ) : (
        <PreviewPlayer quizId={id} content={content} />
      )}
    </div>
  );
}
