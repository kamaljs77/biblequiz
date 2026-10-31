"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Countdown shown while the participant reads the verses (FR-3.3a–c).
 * Pauses while the tab is hidden.
 */
export function ThinkingTimer({
  seconds,
  total,
  allowEarly,
  onTick,
  onDone,
}: {
  seconds: number;
  total: number;
  allowEarly: boolean;
  onTick: (remainingWholeSeconds: number) => void;
  onDone: () => void;
}) {
  const [remainingMs, setRemainingMs] = useState(seconds * 1000);
  const [paused, setPaused] = useState(false);
  const done = useRef(false);
  const lastWhole = useRef(seconds);
  const onTickRef = useRef(onTick);
  const onDoneRef = useRef(onDone);
  onTickRef.current = onTick;
  onDoneRef.current = onDone;

  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const delta = now - last;
      last = now;
      if (document.hidden) return;
      setRemainingMs((ms) => Math.max(0, ms - delta));
    }, 200);
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    const whole = Math.ceil(remainingMs / 1000);
    if (whole !== lastWhole.current) {
      lastWhole.current = whole;
      onTickRef.current(whole);
    }
    if (remainingMs <= 0 && !done.current) {
      done.current = true;
      onDoneRef.current();
    }
  }, [remainingMs]);

  function finishEarly() {
    if (done.current) return;
    done.current = true;
    onDoneRef.current();
  }

  const whole = Math.ceil(remainingMs / 1000);
  const mm = Math.floor(whole / 60);
  const ss = String(whole % 60).padStart(2, "0");
  const fraction = total > 0 ? remainingMs / (total * 1000) : 0;
  const r = 26;
  const c = 2 * Math.PI * r;

  return (
    <div className="card flex items-center gap-4 p-4">
      <div className="relative h-16 w-16 shrink-0" role="timer" aria-label={`${whole} seconds left to think`}>
        <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - fraction)}
            style={{ transition: "stroke-dashoffset 0.2s linear" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums" aria-hidden>
          {mm}:{ss}
        </span>
      </div>
      <div className="flex-1 space-y-2">
        <p className="text-sm text-muted">
          {paused ? "Timer paused." : "Read the verses and think. The answers will appear when the timer ends."}
        </p>
        {allowEarly && (
          <button type="button" className="btn-secondary" onClick={finishEarly}>
            I’m ready
          </button>
        )}
      </div>
    </div>
  );
}
