import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { QuestionForm } from "../QuestionForm";
import { loadQuestionForEdit } from "../data";
import { ArchiveButton } from "./ArchiveButton";

export default async function EditQuestion({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  const loaded = Number.isInteger(id) ? await loadQuestionForEdit(id) : null;
  if (!loaded) notFound();
  const archived = loaded.question.status === "archived";

  return (
    <div className="space-y-4">
      <Link href="/admin/questions" className="text-sm text-muted hover:underline">
        ← Questions
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-2xl font-semibold">Edit question</h1>
        <ArchiveButton id={id} archived={archived} />
      </div>
      {archived && <p className="rounded-lg bg-surface-2 px-4 py-3 text-sm">This question is archived and hidden from the quiz builder.</p>}
      <QuestionForm key={loaded.question.updatedAt.toISOString()} id={id} initial={loaded.initial} usedIn={loaded.usedIn} />
    </div>
  );
}
