"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearProgress, readName, readProgress, writeName, writeProgress } from "@/lib/progress";

export function StartForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [hasProgress, setHasProgress] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(readName());
    setHasProgress(!!readProgress(slug));
  }, [slug]);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Please enter your name.");
    setBusy(true);
    setError("");
    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, name: trimmed }),
    });
    const data = await res.json();
    if (!res.ok) {
      setBusy(false);
      return setError(data.error ?? "Something went wrong.");
    }
    writeName(trimmed);
    writeProgress(slug, { attemptId: data.attemptId, index: 0, remaining: null });
    router.push(`/quiz/${slug}/play`);
  }

  return (
    <form onSubmit={start} className="card space-y-4 p-5">
      <div>
        <label htmlFor="name" className="label">
          Your name
        </label>
        <input
          id="name"
          className="input text-base"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          autoComplete="given-name"
          placeholder="Enter your name"
          required
        />
        <p className="mt-1 text-xs text-muted">Your name is saved with your score so the quiz author can see it.</p>
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Starting…" : "Start Quiz"}
        </button>
        {hasProgress && (
          <>
            <button type="button" className="btn-secondary" onClick={() => router.push(`/quiz/${slug}/play`)}>
              Continue where you left off
            </button>
            <button
              type="button"
              className="text-sm text-muted underline"
              onClick={() => {
                clearProgress(slug);
                setHasProgress(false);
              }}
            >
              Discard progress
            </button>
          </>
        )}
      </div>
    </form>
  );
}
