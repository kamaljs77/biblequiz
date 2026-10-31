"use client";

import { useEffect, useState, useTransition } from "react";
import type { VerseLine } from "@/lib/verses";
import { deleteQuestion, saveQuestion, type QuestionInput } from "./actions";

type Preview = { ok: boolean; label?: string; lines?: VerseLine[]; warning?: string | null; error?: string };

export function QuestionForm({
  id,
  initial,
  usedIn,
}: {
  id: number | null;
  initial: QuestionInput;
  usedIn: { id: number; title: string; status: string }[];
}) {
  const [form, setForm] = useState<QuestionInput>(initial);
  const [tagText, setTagText] = useState(initial.tags.join(", "));
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const set = <K extends keyof QuestionInput>(k: K, v: QuestionInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const correctCount = form.options.filter((o) => o.isCorrect).length;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const tags = tagText.split(",").map((t) => t.trim()).filter(Boolean);
    start(async () => {
      const res = await saveQuestion(id, { ...form, tags, refs: form.refs.filter((r) => r.trim()) });
      if (res?.errors) {
        setErrors(res.errors);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {errors.length > 0 && (
        <ul className="list-disc space-y-1 rounded-lg bg-bad-soft px-8 py-3 text-sm text-bad">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      {usedIn.length > 0 && (
        <div className="rounded-lg bg-surface-2 px-4 py-3 text-sm">
          Used in: {usedIn.map((q) => `${q.title} (${q.status})`).join(", ")}. Published quizzes are frozen and will
          not change when you edit this question.
        </div>
      )}

      <section className="card space-y-4 p-5">
        <div>
          <label className="label" htmlFor="prompt">
            Question
          </label>
          <textarea
            id="prompt"
            className="input min-h-20 font-serif text-lg"
            value={form.prompt}
            onChange={(e) => set("prompt", e.target.value)}
            placeholder="e.g. What is the chief end of man?"
          />
        </div>
      </section>

      <section className="card space-y-3 p-5">
        <div>
          <h2 className="font-semibold">Verse references</h2>
          <p className="text-sm text-muted">The answer must be taught by these verses. Add as many as you need.</p>
        </div>
        {form.refs.map((r, i) => (
          <RefRow
            key={i}
            value={r}
            onChange={(v) => set("refs", form.refs.map((x, j) => (j === i ? v : x)))}
            onRemove={form.refs.length > 1 ? () => set("refs", form.refs.filter((_, j) => j !== i)) : undefined}
          />
        ))}
        <button type="button" className="btn-secondary" onClick={() => set("refs", [...form.refs, ""])}>
          + Add reference
        </button>
      </section>

      <section className="card space-y-3 p-5">
        <div>
          <h2 className="font-semibold">Answer options</h2>
          <p className="text-sm text-muted">
            Tick every correct option.{" "}
            {correctCount > 1
              ? "This is a multiple-answer question (checkboxes)."
              : correctCount === 1
                ? "This is a single-answer question (radio buttons). Add more correct options if the verses teach more than one truth."
                : "No correct option yet."}
          </p>
        </div>
        {form.options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <label className="flex shrink-0 items-center gap-1.5 text-sm" title="Correct">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--good)]"
                checked={o.isCorrect}
                onChange={(e) =>
                  set("options", form.options.map((x, j) => (j === i ? { ...x, isCorrect: e.target.checked } : x)))
                }
              />
              <span className="sr-only sm:not-sr-only">Correct</span>
            </label>
            <input
              className={`input ${o.isCorrect ? "border-good" : ""}`}
              value={o.text}
              onChange={(e) => set("options", form.options.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
              placeholder={`Option ${i + 1}`}
            />
            <button
              type="button"
              className="px-2 text-muted hover:text-ink disabled:opacity-30"
              aria-label="Move up"
              disabled={i === 0}
              onClick={() => {
                const a = [...form.options];
                [a[i - 1], a[i]] = [a[i], a[i - 1]];
                set("options", a);
              }}
            >
              ↑
            </button>
            <button
              type="button"
              className="px-2 text-muted hover:text-bad disabled:opacity-30"
              aria-label="Remove option"
              disabled={form.options.length <= 2}
              onClick={() => set("options", form.options.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn-secondary"
          disabled={form.options.length >= 8}
          onClick={() => set("options", [...form.options, { text: "", isCorrect: false }])}
        >
          + Add option
        </button>
      </section>

      <section className="card space-y-4 p-5">
        <div>
          <label className="label" htmlFor="explanation">
            Explanation <span className="font-normal text-muted">(shown after answering)</span>
          </label>
          <textarea
            id="explanation"
            className="input min-h-24 font-serif"
            value={form.explanation}
            onChange={(e) => set("explanation", e.target.value)}
            placeholder="Tie the correct answers back to the verses."
          />
          {!form.explanation.trim() && <p className="mt-1 text-xs text-muted">Recommended: every question should have an explanation.</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="tags">
              Tags <span className="font-normal text-muted">(comma separated)</span>
            </label>
            <input id="tags" className="input" value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="WSC, Salvation" />
          </div>
          <div>
            <label className="label" htmlFor="sourceRef">
              Source <span className="font-normal text-muted">(optional)</span>
            </label>
            <input id="sourceRef" className="input" value={form.sourceRef} onChange={(e) => set("sourceRef", e.target.value)} placeholder="WSC Q1" />
          </div>
          <div>
            <label className="label" htmlFor="difficulty">
              Difficulty
            </label>
            <select
              id="difficulty"
              className="input"
              value={form.difficulty}
              onChange={(e) => set("difficulty", e.target.value as QuestionInput["difficulty"])}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="think">
              Thinking time override <span className="font-normal text-muted">(seconds, optional)</span>
            </label>
            <input
              id="think"
              type="number"
              min={0}
              max={600}
              className="input"
              value={form.thinkTimeSeconds ?? ""}
              onChange={(e) => set("thinkTimeSeconds", e.target.value === "" ? null : Number(e.target.value))}
              placeholder="Use the quiz setting"
            />
          </div>
          <div>
            <label className="label" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              className="input"
              value={form.status}
              onChange={(e) => set("status", e.target.value as QuestionInput["status"])}
            >
              <option value="draft">Draft (needs review)</option>
              <option value="active">Reviewed</option>
            </select>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save question"}
        </button>
        {id != null && usedIn.length === 0 && (
          <button
            type="button"
            className="btn-danger"
            disabled={pending}
            onClick={() => {
              if (!confirm("Delete this question permanently?")) return;
              start(async () => {
                const r = await deleteQuestion(id);
                if (r?.error) setErrors([r.error]);
              });
            }}
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

function RefRow({ value, onChange, onRemove }: { value: string; onChange: (v: string) => void; onRemove?: () => void }) {
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    if (!value.trim()) return setPreview(null);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/verses?ref=${encodeURIComponent(value)}`, { signal: ctrl.signal });
        setPreview(await res.json());
      } catch {}
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value]);

  return (
    <div className="space-y-1.5 rounded-lg border border-line p-3">
      <div className="flex gap-2">
        <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder="e.g. Genesis 1:26-27" />
        {onRemove && (
          <button type="button" className="px-2 text-muted hover:text-bad" aria-label="Remove reference" onClick={onRemove}>
            ✕
          </button>
        )}
      </div>
      {preview && (
        <div className="text-sm">
          {preview.error && <p className="text-bad">{preview.error}</p>}
          {preview.label && <p className="font-semibold text-accent">{preview.label}</p>}
          {preview.lines?.map((l) => (
            <p key={l.verse} className="font-serif text-verse">
              <sup className="mr-0.5 text-xs text-muted">{l.verse}</sup>
              {l.text}
            </p>
          ))}
          {preview.warning && <p className={preview.ok ? "text-muted" : "text-bad"}>{preview.warning}</p>}
        </div>
      )}
    </div>
  );
}
