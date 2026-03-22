import { requireAdmin } from "@/lib/auth";
import { packageModeFromNote } from "@/lib/package-mode";
import { coursePackageAccessibleByStudent, coursePackageMatchesCourse } from "@/lib/package-sharing";
import { prisma } from "@/lib/prisma";
import { formatBusinessDateOnly } from "@/lib/date-only";

function bad(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

function parseAt(raw: string | null) {
  const s = String(raw ?? "").trim();
  if (!s) return new Date();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) {
    return new Date(`${s}:00+08:00`);
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: studentId } = await params;
  if (!studentId) return bad("Missing studentId");

  const url = new URL(req.url);
  const courseId = String(url.searchParams.get("courseId") ?? "").trim();
  const kind = String(url.searchParams.get("kind") ?? "oneOnOne").trim();
  const durationMinRaw = Number(url.searchParams.get("durationMin") ?? "60");
  const durationMin = Number.isFinite(durationMinRaw) ? Math.max(1, Math.floor(durationMinRaw)) : 60;
  const at = parseAt(url.searchParams.get("at"));

  if (!courseId) return bad("Missing courseId", 409);
  if (!at) return bad("Invalid at", 409);

  const rows = await prisma.coursePackage.findMany({
    where: {
      AND: [
        coursePackageAccessibleByStudent(studentId),
        coursePackageMatchesCourse(courseId),
        { status: "ACTIVE" },
        { validFrom: { lte: at } },
        { OR: [{ validTo: null }, { validTo: { gte: at } }] },
      ],
    },
    select: {
      id: true,
      type: true,
      remainingMinutes: true,
      validFrom: true,
      validTo: true,
      note: true,
      paid: true,
    },
    orderBy: [{ validTo: "asc" }, { createdAt: "desc" }],
  });

  const filtered = rows.filter((row) => {
    if (row.type === "MONTHLY") return true;
    const mode = packageModeFromNote(row.note);
    if (kind === "group") return mode === "GROUP_MINUTES" || mode === "GROUP_COUNT";
    return mode === "HOURS_MINUTES";
  });

  return Response.json({
    ok: true,
    studentId,
    courseId,
    kind,
    at: at.toISOString(),
    durationMin,
    rows: filtered.map((row) => {
      const remaining = row.remainingMinutes ?? 0;
      const canSchedule = row.type === "MONTHLY" ? true : remaining >= durationMin;
      const packMode = row.type === "MONTHLY" ? "MONTHLY" : packageModeFromNote(row.note);
      return {
        id: row.id,
        type: row.type,
        remainingMinutes: row.remainingMinutes,
        validFrom: formatBusinessDateOnly(row.validFrom),
        validTo: row.validTo ? formatBusinessDateOnly(row.validTo) : null,
        paid: row.paid,
        canSchedule,
        lowBalance: row.type === "HOURS" && remaining <= 120,
        packMode: packMode === "GROUP_COUNT" ? "GROUP" : "HOURS",
        packVariant: packMode,
      };
    }),
  });
}
