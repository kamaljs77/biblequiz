import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { QuestionForm } from "../QuestionForm";
import { EMPTY_QUESTION } from "../data";

export default async function NewQuestion() {
  await requireAdmin();
  return (
    <div className="space-y-4">
      <Link href="/admin/questions" className="text-sm text-muted hover:underline">
        ← Questions
      </Link>
      <h1 className="font-serif text-2xl font-semibold">New question</h1>
      <QuestionForm id={null} initial={EMPTY_QUESTION} usedIn={[]} />
    </div>
  );
}
