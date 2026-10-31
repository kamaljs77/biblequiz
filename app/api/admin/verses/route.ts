import { NextResponse } from "next/server";
import { getAdminId } from "@/lib/auth";
import { parseReference } from "@/lib/bible";
import { bibleIsLoaded, resolveReference } from "@/lib/verses";

/** Live preview of a reference while the admin types it (FR-7.3). */
export async function GET(req: Request) {
  if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ref = new URL(req.url).searchParams.get("ref") ?? "";
  const parsed = parseReference(ref);
  if (!parsed) return NextResponse.json({ ok: false, error: "Use a form like “Genesis 1:27” or “Ps 73:25-28”." });
  const resolved = await resolveReference(parsed);
  const loaded = await bibleIsLoaded();
  return NextResponse.json({
    ok: resolved.complete || !loaded,
    label: resolved.label,
    lines: resolved.lines,
    warning: resolved.complete
      ? null
      : loaded
        ? "This reference is not in the Bible text. Check the chapter and verse."
        : "The Bible text is not fully imported yet, so this reference can’t be checked.",
  });
}
