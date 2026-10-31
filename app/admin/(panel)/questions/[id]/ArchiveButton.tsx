"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setQuestionArchived } from "../actions";

export function ArchiveButton({ id, archived }: { id: number; archived: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn-secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setQuestionArchived(id, !archived);
          router.refresh();
        })
      }
    >
      {archived ? "Restore" : "Archive"}
    </button>
  );
}
