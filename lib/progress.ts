// Browser-side progress for an attempt in progress (FR-3.8). Every access is
// guarded because storage can be unavailable (private mode, blocked cookies).

export type StoredProgress = {
  attemptId: string;
  index: number;
  /** Seconds left on the thinking timer for `index`, when it was last saved. */
  remaining: number | null;
};

const key = (slug: string) => `bq:progress:${slug}`;

export function readProgress(slug: string): StoredProgress | null {
  try {
    const raw = localStorage.getItem(key(slug));
    return raw ? (JSON.parse(raw) as StoredProgress) : null;
  } catch {
    return null;
  }
}

export function writeProgress(slug: string, p: StoredProgress) {
  try {
    localStorage.setItem(key(slug), JSON.stringify(p));
  } catch {}
}

export function clearProgress(slug: string) {
  try {
    localStorage.removeItem(key(slug));
  } catch {}
}

export function readName(): string {
  try {
    return localStorage.getItem("bq:name") ?? "";
  } catch {
    return "";
  }
}

export function writeName(name: string) {
  try {
    localStorage.setItem("bq:name", name);
  } catch {}
}
