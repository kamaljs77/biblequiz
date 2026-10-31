import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminId } from "@/lib/auth";

function csvCell(v: string | number) {
  const s = String(v);
  // Quote, and neutralise leading formula characters for spreadsheet apps.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  const quiz = await prisma.quiz.findUnique({ where: { id }, include: { attempts: { orderBy: { startedAt: "asc" } } } });
  if (!quiz) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rows = [
    ["Name", "Started", "Completed", "Score", "Max score"],
    ...quiz.attempts.map((a) => [
      a.participantName,
      a.startedAt.toISOString(),
      a.completedAt?.toISOString() ?? "",
      a.completedAt ? a.score : "",
      a.maxScore,
    ]),
  ];
  const body = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${quiz.slug}-results.csv"`,
    },
  });
}
