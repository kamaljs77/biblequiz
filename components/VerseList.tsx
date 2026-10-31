import type { VerseLine } from "@/lib/verses";

type Verse = { label: string; lines: VerseLine[] };

/** Verse references with their WEB text. Each can be collapsed; all start open (FR-2.6). */
export function VerseList({ verses }: { verses: Verse[] }) {
  return (
    <div className="space-y-2">
      {verses.map((v) => (
        <details key={v.label} open className="group rounded-lg border border-line bg-surface-2 px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-accent">
            <span>📖 {v.label}</span>
            <span className="text-xs text-muted group-open:hidden">Show</span>
            <span className="hidden text-xs text-muted group-open:inline">Hide</span>
          </summary>
          <p className="mt-2 font-serif text-[17px] leading-relaxed text-verse">
            {v.lines.length === 0 ? (
              <span className="text-muted italic">Verse text not loaded yet.</span>
            ) : (
              v.lines.map((l) => (
                <span key={l.verse}>
                  {v.lines.length > 1 && <sup className="mr-0.5 text-xs text-muted">{l.verse}</sup>}
                  {l.text}{" "}
                </span>
              ))
            )}
          </p>
        </details>
      ))}
      <p className="text-right text-xs text-muted">World English Bible (WEB)</p>
    </div>
  );
}
