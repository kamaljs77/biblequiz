"use client";

import { useMemo, useState } from "react";
import { QuizPlayer, type PreviewApi } from "@/app/quiz/[slug]/play/QuizPlayer";
import { clearProgress } from "@/lib/progress";
import { handleAction, initialState, type ActionBody, type AttemptContext } from "@/lib/attempt-logic";
import type { QuizSnapshotContent } from "@/lib/snapshot";

const random = (max: number) => Math.floor(Math.random() * max);

/** Runs the real quiz player against an in-memory attempt. Nothing is saved. */
export function PreviewPlayer({ quizId, content }: { quizId: number; content: QuizSnapshotContent }) {
  const [run, setRun] = useState(0);
  const progressKey = `__preview-${quizId}`;

  const api = useMemo<PreviewApi>(() => {
    const ctx: AttemptContext = {
      content,
      state: initialState(content, random),
      answers: new Map(),
      completed: false,
      participantName: "Preview",
    };
    return {
      async call(body) {
        const b = body as ActionBody;
        // The timer is shown as participants see it, but the admin may always skip it.
        const now = b.action === "reveal" ? Number.MAX_SAFE_INTEGER : Date.now();
        const result = handleAction(ctx, b, now);
        if (result.complete) ctx.completed = true;
        return { ok: result.status < 400, status: result.status, data: result.data };
      },
      onRestart() {
        clearProgress(progressKey);
        setRun((n) => n + 1);
      },
    };
    // `run` is a dependency so that restarting builds a fresh attempt.
  }, [content, progressKey, run]); // eslint-disable-line react-hooks/exhaustive-deps

  return <QuizPlayer key={run} slug={progressKey} title={content.quiz.title} preview={api} />;
}
