"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { VerseList } from "@/components/VerseList";
import { ShareButtons } from "@/components/ShareButtons";
import { ThinkingTimer } from "@/components/ThinkingTimer";
import { clearProgress, readProgress, writeProgress } from "@/lib/progress";
import type { VerseLine } from "@/lib/verses";

type Verse = { label: string; lines: VerseLine[] };
type Question = { key: string; prompt: string; type: "single" | "multiple"; thinkTimeSeconds: number; verses: Verse[] };
type Option = { key: string; text: string };
type Feedback = {
  selected: string[];
  isCorrect?: boolean;
  correctKeys?: string[];
  missedKeys?: string[];
  wrongKeys?: string[];
  explanation?: string;
};
type ReviewItem = {
  key: string;
  prompt: string;
  verses: Verse[];
  explanation: string;
  options: { key: string; text: string; isCorrect: boolean }[];
  selected: string[];
  isCorrect: boolean;
};
type Results = { name: string; score: number; maxScore: number; review: ReviewItem[] };

type Phase = "loading" | "think" | "choose" | "feedback" | "results" | "error";

export function QuizPlayer({ slug, title }: { slug: string; title: string }) {
  const router = useRouter();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState(0);
  const [allowEarly, setAllowEarly] = useState(true);
  const [question, setQuestion] = useState<Question | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [startSeconds, setStartSeconds] = useState(0);
  const [results, setResults] = useState<Results | null>(null);
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const topRef = useRef<HTMLDivElement>(null);

  const call = useCallback(
    async (id: string, body: object) => {
      const res = await fetch(`/api/attempts/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    },
    [],
  );

  const reveal = useCallback(
    async (id: string, i: number) => {
      for (let tries = 0; tries < 5; tries++) {
        const r = await call(id, { action: "reveal", index: i });
        if (r.ok) {
          setOptions(r.data.options);
          setSelected([]);
          setPhase("choose");
          setAnnouncement("The answers are now shown.");
          writeProgress(slug, { attemptId: id, index: i, remaining: 0 });
          return;
        }
        if (r.status !== 403) break;
        await new Promise((res) => setTimeout(res, 1000));
      }
      setError("Could not show the answers. Please refresh the page.");
      setPhase("error");
    },
    [call, slug],
  );

  const load = useCallback(
    async (id: string, i: number, storedRemaining: number | null) => {
      setPhase("loading");
      setFeedback(null);
      const r = await call(id, { action: "question", index: i });
      if (!r.ok) {
        if (r.status === 409 || r.status === 404) {
          clearProgress(slug);
          router.replace(`/quiz/${slug}`);
          return;
        }
        setError(r.data.error ?? "Something went wrong.");
        setPhase("error");
        return;
      }
      setIndex(i);
      setTotal(r.data.total);
      setAllowEarly(r.data.allowEarlyReveal);
      setQuestion(r.data.question);
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (r.data.feedback) {
        setOptions(r.data.options ?? []);
        setFeedback(r.data.feedback);
        setPhase("feedback");
      } else if (r.data.options) {
        setOptions(r.data.options);
        setSelected([]);
        setPhase("choose");
      } else {
        const full = r.data.question.thinkTimeSeconds as number;
        const remaining = storedRemaining != null ? Math.min(storedRemaining, full) : full;
        if (remaining <= 0) {
          await reveal(id, i);
        } else {
          setStartSeconds(remaining);
          setPhase("think");
          writeProgress(slug, { attemptId: id, index: i, remaining });
        }
      }
    },
    [call, reveal, router, slug],
  );

  useEffect(() => {
    const p = readProgress(slug);
    if (!p) {
      router.replace(`/quiz/${slug}`);
      return;
    }
    setAttemptId(p.attemptId);
    load(p.attemptId, p.index, p.remaining);
  }, [slug, load, router]);

  function toggle(key: string) {
    if (!question) return;
    if (question.type === "single") setSelected([key]);
    else setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  }

  async function submit() {
    if (!attemptId || selected.length === 0) return;
    setBusy(true);
    const r = await call(attemptId, { action: "answer", index, selected });
    setBusy(false);
    if (!r.ok && r.status !== 409) {
      setError(r.data.error ?? "Could not save your answer.");
      return;
    }
    if (r.status === 409) return load(attemptId, index, 0);
    setError("");
    setFeedback(r.data.feedback);
    setPhase("feedback");
    setAnnouncement(r.data.feedback.isCorrect === undefined ? "Answer saved." : r.data.feedback.isCorrect ? "Correct." : "Not quite.");
  }

  async function next() {
    if (!attemptId) return;
    if (index + 1 < total) {
      writeProgress(slug, { attemptId, index: index + 1, remaining: null });
      return load(attemptId, index + 1, null);
    }
    setPhase("loading");
    const r = await call(attemptId, { action: "finish" });
    if (!r.ok) {
      setError(r.data.error ?? "Could not finish the quiz.");
      setPhase("error");
      return;
    }
    clearProgress(slug);
    setResults(r.data);
    setPhase("results");
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const onTick = useCallback(
    (remaining: number) => {
      if (attemptId) writeProgress(slug, { attemptId, index, remaining });
      if (remaining === 30 || remaining === 10) setAnnouncement(`${remaining} seconds left to think.`);
    },
    [attemptId, index, slug],
  );

  return (
    <div ref={topRef} className="scroll-mt-4 space-y-5">
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {phase === "results" && results ? (
        <ResultsView results={results} title={title} slug={slug} onRetake={() => router.push(`/quiz/${slug}`)} />
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-muted">
            <span className="truncate pr-2">{title}</span>
            {total > 0 && (
              <span className="shrink-0">
                Question {index + 1} of {total}
              </span>
            )}
          </div>
          {total > 0 && (
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              <div className="h-full bg-accent transition-all" style={{ width: `${(index / total) * 100}%` }} />
            </div>
          )}

          {phase === "loading" && <p className="py-10 text-center text-muted">Loading…</p>}
          {phase === "error" && <p className="card p-5 text-bad">{error}</p>}

          {question && (phase === "think" || phase === "choose" || phase === "feedback") && (
            <div className="space-y-5">
              <h1 className="font-serif text-2xl font-semibold leading-snug sm:text-3xl">{question.prompt}</h1>
              <VerseList verses={question.verses} />

              {phase === "think" && (
                <ThinkingTimer
                  key={question.key}
                  seconds={startSeconds}
                  total={question.thinkTimeSeconds}
                  allowEarly={allowEarly}
                  onTick={onTick}
                  onDone={() => attemptId && reveal(attemptId, index)}
                />
              )}

              {(phase === "choose" || phase === "feedback") && (
                <OptionList
                  question={question}
                  options={options}
                  selected={phase === "feedback" ? feedback?.selected ?? [] : selected}
                  feedback={phase === "feedback" ? feedback : null}
                  onToggle={toggle}
                />
              )}

              {error && phase === "choose" && <p className="text-sm text-bad">{error}</p>}

              {phase === "choose" && (
                <button className="btn-primary w-full sm:w-auto" onClick={submit} disabled={busy || selected.length === 0}>
                  {busy ? "Saving…" : "Submit Answer"}
                </button>
              )}

              {phase === "feedback" && feedback && (
                <div className="space-y-4">
                  {feedback.isCorrect !== undefined ? (
                    <div className={`rounded-lg px-4 py-3 ${feedback.isCorrect ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
                      <p className="font-semibold">{feedback.isCorrect ? "✓ Correct" : "✗ Not quite"}</p>
                      {!feedback.isCorrect && question.type === "multiple" && (
                        <p className="mt-1 text-sm">
                          {feedback.missedKeys?.length ? `You missed ${feedback.missedKeys.length} correct answer(s). ` : ""}
                          {feedback.wrongKeys?.length ? `You chose ${feedback.wrongKeys.length} wrong answer(s).` : ""}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="rounded-lg bg-surface-2 px-4 py-3 text-sm">Answer saved. You will see the results at the end.</p>
                  )}
                  {feedback.explanation && (
                    <div className="card p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Explanation</p>
                      <p className="font-serif leading-relaxed">{feedback.explanation}</p>
                    </div>
                  )}
                  <button className="btn-primary w-full sm:w-auto" onClick={next}>
                    {index + 1 < total ? "Next Question →" : "See my results"}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OptionList({
  question,
  options,
  selected,
  feedback,
  onToggle,
}: {
  question: Question;
  options: Option[];
  selected: string[];
  feedback: Feedback | null;
  onToggle: (key: string) => void;
}) {
  const multiple = question.type === "multiple";
  const graded = feedback?.correctKeys !== undefined;
  return (
    <fieldset className="animate-[fadeIn_.4s_ease-out] space-y-2" disabled={!!feedback}>
      <legend className="mb-2 text-sm font-semibold text-muted">
        {multiple ? "Select all that apply" : "Choose one answer"}
      </legend>
      {options.map((o) => {
        const isSelected = selected.includes(o.key);
        const isCorrect = graded && feedback!.correctKeys!.includes(o.key);
        let tone = isSelected ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent";
        let tag = "";
        if (graded) {
          if (isCorrect && isSelected) [tone, tag] = ["border-good bg-good-soft", "Correct"];
          else if (isCorrect) [tone, tag] = ["border-good border-dashed bg-surface", "Missed"];
          else if (isSelected) [tone, tag] = ["border-bad bg-bad-soft", "Wrong"];
          else tone = "border-line bg-surface opacity-70";
        }
        return (
          <label key={o.key} className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 px-4 py-3 transition ${tone}`}>
            <input
              type={multiple ? "checkbox" : "radio"}
              name={question.key}
              aria-label={tag ? `${o.text} (${tag})` : o.text}
              className="mt-1 h-4 w-4 accent-[var(--accent)]"
              checked={isSelected}
              onChange={() => onToggle(o.key)}
            />
            <span className="flex-1">{o.text}</span>
            {tag && (
              <span className={`text-xs font-semibold ${tag === "Wrong" ? "text-bad" : "text-good"}`}>
                {tag === "Correct" ? "✓ " : tag === "Wrong" ? "✗ " : ""}
                {tag}
              </span>
            )}
          </label>
        );
      })}
    </fieldset>
  );
}

function ResultsView({
  results,
  title,
  slug,
  onRetake,
}: {
  results: Results;
  title: string;
  slug: string;
  onRetake: () => void;
}) {
  const pct = results.maxScore ? Math.round((results.score / results.maxScore) * 100) : 0;
  return (
    <div className="space-y-6">
      <div className="card space-y-3 p-6 text-center">
        <p className="text-sm text-muted">{title}</p>
        <h1 className="font-serif text-3xl font-semibold">
          {pct >= 80 ? "Well done" : "Thank you"}, {results.name}!
        </h1>
        <p className="text-4xl font-bold text-accent">
          {results.score}/{results.maxScore}
        </p>
        <p className="text-muted">{pct}% correct</p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <button className="btn-primary" onClick={onRetake}>
            Retake Quiz
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold">Share this quiz</h2>
        <ShareButtons path={`/quiz/${slug}`} title={title} />
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold">Review</h2>
        {results.review.map((r, i) => (
          <article key={r.key} className="card space-y-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-serif text-lg font-semibold">
                {i + 1}. {r.prompt}
              </h3>
              <span className={`shrink-0 text-sm font-semibold ${r.isCorrect ? "text-good" : "text-bad"}`}>
                {r.isCorrect ? "✓ Correct" : "✗ Wrong"}
              </span>
            </div>
            <ul className="space-y-1 text-sm">
              {r.options.map((o) => {
                const chose = r.selected.includes(o.key);
                return (
                  <li key={o.key} className={o.isCorrect ? "font-semibold text-good" : chose ? "text-bad line-through" : "text-muted"}>
                    {o.isCorrect ? "✓" : chose ? "✗" : "·"} {o.text}
                    {chose && <span className="ml-1 text-xs font-normal">(your answer)</span>}
                  </li>
                );
              })}
            </ul>
            <VerseList verses={r.verses} />
            {r.explanation && <p className="font-serif text-sm leading-relaxed">{r.explanation}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}
