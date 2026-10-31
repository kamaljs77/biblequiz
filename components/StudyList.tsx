import type { SnapshotQuestion } from "@/lib/snapshot";
import { VerseList } from "@/components/VerseList";

/** Every question with its verses, correct answers and explanation (Study Mode, FR-4.1). */
export function StudyList({ questions }: { questions: SnapshotQuestion[] }) {
  return (
    <ol className="space-y-6">
      {questions.map((q, i) => (
        <li key={q.key} className="card space-y-4 p-5 break-inside-avoid">
          <h2 className="font-serif text-xl font-semibold">
            {i + 1}. {q.prompt}
          </h2>
          <VerseList verses={q.verses} />
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              {q.type === "multiple" ? "Correct answers" : "Correct answer"}
            </p>
            <ul className="space-y-1">
              {q.options.map((o) => (
                <li key={o.key} className={o.isCorrect ? "font-semibold text-good" : "text-muted"}>
                  {o.isCorrect ? "✓" : "·"} {o.text}
                </li>
              ))}
            </ul>
          </div>
          {q.explanation && <p className="font-serif leading-relaxed">{q.explanation}</p>}
        </li>
      ))}
    </ol>
  );
}
