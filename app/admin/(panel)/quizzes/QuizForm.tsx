"use client";

import { useMemo, useState, useTransition } from "react";
import { createSeries, saveQuiz, type QuizInput } from "./actions";

export type BankQuestion = { id: number; prompt: string; sourceRef: string | null; status: string; multiple: boolean; tags: string[] };

export function QuizForm({
  id,
  initial,
  bank,
  series: initialSeries,
}: {
  id: number | null;
  initial: QuizInput;
  bank: BankQuestion[];
  series: { id: number; name: string }[];
}) {
  const [form, setForm] = useState<QuizInput>(initial);
  const [series, setSeries] = useState(initialSeries);
  const [search, setSearch] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const set = <K extends keyof QuizInput>(k: K, v: QuizInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const byId = useMemo(() => new Map(bank.map((q) => [q.id, q])), [bank]);
  const results = useMemo(() => {
    const s = search.trim().toLowerCase();
    return bank
      .filter((q) => q.status !== "archived" && !form.questionIds.includes(q.id))
      .filter((q) => !s || q.prompt.toLowerCase().includes(s) || (q.sourceRef ?? "").toLowerCase().includes(s) || q.tags.some((t) => t.toLowerCase().includes(s)))
      .slice(0, 30);
  }, [bank, search, form.questionIds]);

  function move(i: number, d: -1 | 1) {
    const a = [...form.questionIds];
    const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    set("questionIds", a);
  }

  function save(thenPublish = false) {
    start(async () => {
      if (thenPublish && !confirm("Publish this quiz? Its content will be frozen and can no longer be edited.")) return;
      const r = await saveQuiz(id, form, thenPublish);
      if (r?.errors) setErrors(r.errors);
    });
  }

  async function addSeries() {
    const name = prompt("New series name:");
    if (!name) return;
    const r = await createSeries(name);
    if ("error" in r) return setErrors([r.error]);
    setSeries((s) => (s.some((x) => x.id === r.id) ? s : [...s, r]));
    set("seriesId", r.id);
  }

  const toggle = (k: "allowEarlyReveal" | "shuffleQuestions" | "shuffleOptions" | "studyModeEnabled", label: string, help?: string) => (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--accent)]" checked={form[k]} onChange={(e) => set(k, e.target.checked)} />
      <span>
        {label}
        {help && <span className="block text-xs text-muted">{help}</span>}
      </span>
    </label>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-6"
    >
      {errors.length > 0 && (
        <ul className="list-disc space-y-1 rounded-lg bg-bad-soft px-8 py-3 text-sm text-bad">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="title">
            Title
          </label>
          <input id="title" className="input" value={form.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="slug">
            Link
          </label>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted">/quiz/</span>
            <input id="slug" className="input" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="made from the title" />
          </div>
          <p className="mt-1 text-xs text-muted">Locked once the quiz is published.</p>
        </div>
        <div>
          <label className="label" htmlFor="series">
            Series
          </label>
          <div className="flex gap-2">
            <select
              id="series"
              className="input"
              value={form.seriesId ?? ""}
              onChange={(e) => set("seriesId", e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">None</option>
              {series.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn-secondary shrink-0" onClick={addSeries}>
              New
            </button>
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="description">
            Description
          </label>
          <textarea id="description" className="input min-h-16" value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>
      </section>

      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Settings</h2>
        <div>
          <label className="label" htmlFor="think">
            Thinking time (seconds)
          </label>
          <input
            id="think"
            type="number"
            min={0}
            max={600}
            className="input"
            value={form.thinkTimeSeconds}
            onChange={(e) => set("thinkTimeSeconds", Number(e.target.value))}
          />
          <p className="mt-1 text-xs text-muted">0 turns the timer off.</p>
        </div>
        <div>
          <label className="label" htmlFor="feedback">
            Show answers
          </label>
          <select
            id="feedback"
            className="input"
            value={form.feedbackMode}
            onChange={(e) => set("feedbackMode", e.target.value as QuizInput["feedbackMode"])}
          >
            <option value="immediate">After each question</option>
            <option value="end">Only at the end</option>
          </select>
        </div>
        {toggle("allowEarlyReveal", "Allow “I’m ready” to skip the thinking time")}
        {toggle("shuffleOptions", "Shuffle answer options")}
        {toggle("shuffleQuestions", "Shuffle question order", "Leave off for catechism quizzes, where order matters.")}
        {toggle("studyModeEnabled", "Enable Study Mode page")}
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold">Questions ({form.questionIds.length})</h2>
        {form.questionIds.length === 0 && <p className="text-sm text-muted">No questions yet. Add some from the bank below.</p>}
        <ol className="space-y-1.5">
          {form.questionIds.map((qid, i) => {
            const q = byId.get(qid);
            return (
              <li key={qid} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                <span className="w-6 text-muted">{i + 1}.</span>
                <span className="flex-1">
                  {q?.sourceRef && <span className="mr-1 text-muted">{q.sourceRef}</span>}
                  {q?.prompt ?? `Question #${qid}`}
                  {q?.status === "draft" && <span className="ml-2 rounded bg-accent-soft px-1.5 text-xs text-accent">draft</span>}
                </span>
                <button type="button" className="px-1.5 text-muted hover:text-ink" aria-label="Move up" onClick={() => move(i, -1)}>
                  ↑
                </button>
                <button type="button" className="px-1.5 text-muted hover:text-ink" aria-label="Move down" onClick={() => move(i, 1)}>
                  ↓
                </button>
                <button
                  type="button"
                  className="px-1.5 text-muted hover:text-bad"
                  aria-label="Remove"
                  onClick={() => set("questionIds", form.questionIds.filter((x) => x !== qid))}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ol>

        <div className="space-y-2 border-t border-line pt-3">
          <input className="input" placeholder="Search the bank to add questions…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {results.map((q) => (
              <li key={q.id}>
                <button
                  type="button"
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2"
                  onClick={() => set("questionIds", [...form.questionIds, q.id])}
                >
                  <span className="mr-1 font-semibold text-accent">+</span>
                  {q.sourceRef && <span className="mr-1 text-muted">{q.sourceRef}</span>}
                  {q.prompt}
                  <span className="ml-2 text-xs text-muted">{q.multiple ? "multiple" : "single"}</span>
                </button>
              </li>
            ))}
            {results.length === 0 && <li className="px-3 py-2 text-sm text-muted">No matching questions.</li>}
          </ul>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save draft"}
        </button>
        <button type="button" className="btn-secondary" disabled={pending} onClick={() => save(true)}>
          Save and publish…
        </button>
      </div>
    </form>
  );
}
