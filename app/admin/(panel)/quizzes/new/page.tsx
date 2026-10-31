import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { QuizForm } from "../QuizForm";
import { EMPTY_QUIZ, loadBuilderData } from "../data";

export default async function NewQuiz() {
  await requireAdmin();
  const { bank, series } = await loadBuilderData();
  return (
    <div className="space-y-4">
      <Link href="/admin/quizzes" className="text-sm text-muted hover:underline">
        ← Quizzes
      </Link>
      <h1 className="font-serif text-2xl font-semibold">New quiz</h1>
      <QuizForm id={null} initial={EMPTY_QUIZ} bank={bank} series={series} />
    </div>
  );
}
