"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { makeCopy, setArchived } from "../actions";

export function QuizActions({ id, status }: { id: number; status: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "draft" && (
        <button type="button" className="btn-primary" disabled={pending} onClick={() => run(() => makeCopy(id, true))}>
          Create new version
        </button>
      )}
      <button type="button" className="btn-secondary" disabled={pending} onClick={() => run(() => makeCopy(id, false))}>
        Duplicate
      </button>
      {status === "archived" ? (
        <button type="button" className="btn-secondary" disabled={pending} onClick={() => run(() => setArchived(id, false))}>
          Restore
        </button>
      ) : (
        <button
          type="button"
          className="btn-danger"
          disabled={pending}
          onClick={() => {
            const msg =
              status === "published"
                ? "Archive this quiz? Its link will show “no longer available”."
                : "Archive this draft?";
            if (confirm(msg)) run(() => setArchived(id, true));
          }}
        >
          Archive
        </button>
      )}
    </div>
  );
}
