import { prisma } from "@/lib/prisma";
import { guardOpsReadAccess } from "@/lib/ops-auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function toInt(v: string | null, fallback: number) {
  const n = Number(v ?? "");
  if (!Number.isFinite(n)) return fallback;
  return Math.floor(n);
}

function mapKind(kind: string) {
  if (kind === "DEDUCT") return "扣课";
  if (kind === "ROLLBACK") return "回滚";
  if (kind === "ADJUST") return "调整";
  if (kind === "PURCHASE") return "购课";
  return kind;
}

function riskHint(kind: string, deltaMinutesAbs: number) {
  if (kind === "ADJUST") return "需复核：人工调整流水";
  if (kind === "ROLLBACK") return "需复核：回滚流水";
  if (kind === "DEDUCT" && deltaMinutesAbs >= 180) return "需复核：单次扣减分钟较大";
  return "正常";
}

async function resolveSingleStudent(name: string) {
  const exact = await prisma.student.findMany({
    where: { name: { equals: name, mode: "insensitive" } },
    take: 5,
    orderBy: { name: "asc" },
    select: { id: true, name: true, grade: true, school: true },
  });

  const candidates =
    exact.length > 0
      ? exact
      : await prisma.student.findMany({
          where: { name: { contains: name, mode: "insensitive" } },
          take: 5,
          orderBy: { name: "asc" },
          select: { id: true, name: true, grade: true, school: true },
        });

  return candidates;
}

export async function GET(req: Request) {
  const access = await guardOpsReadAccess(req);
  if (!access.ok) return access.response;

  const url = new URL(req.url);
  const studentId = String(url.searchParams.get("studentId") ?? "").trim();
  const name = String(url.searchParams.get("name") ?? "").trim();
  const days = Math.min(Math.max(toInt(url.searchParams.get("days"), 30), 1), 365);
  const limit = Math.min(Math.max(toInt(url.searchParams.get("limit"), 50), 1), 200);

  if (!studentId && !name) {
    return bad("Missing query parameter: studentId or name", 409);
  }

  let student: { id: string; name: string; grade: string | null; school: string | null } | null = null;

  if (studentId) {
    const row = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, grade: true, school: true },
    });
    if (!row) return bad("Student not found", 404, { studentId });
    student = row;
  } else {
    const candidates = await resolveSingleStudent(name);
    if (candidates.length === 0) {
      return Response.json({
        ok: true,
        query: { name, days, limit },
        totalCandidates: 0,
        message: "无匹配学生",
      });
    }

    if (candidates.length > 1) {
      return Response.json({
        ok: true,
        query: { name, days, limit },
        totalCandidates: candidates.length,
        needDisambiguation: true,
        candidates: candidates.map((s, idx) => ({
          no: idx + 1,
          studentId: s.id,
          name: s.name,
          grade: s.grade ?? null,
          school: s.school ?? null,
        })),
      });
    }

    student = candidates[0] ?? null;
  }

  if (!student) return bad("Student not found", 404);

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const txns = await prisma.packageTxn.findMany({
    where: {
      createdAt: { gte: fromDate },
      package: { studentId: student.id },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      packageId: true,
      kind: true,
      deltaMinutes: true,
      sessionId: true,
      note: true,
      createdAt: true,
      package: {
        select: {
          course: { select: { name: true } },
        },
      },
    },
  });

  return Response.json({
    ok: true,
    query: {
      name: name || null,
      studentId: student.id,
      days,
      limit,
      fromDate: fromDate.toISOString(),
    },
    totalCandidates: 1,
    student: {
      studentId: student.id,
      name: student.name,
      grade: student.grade ?? null,
      school: student.school ?? null,
    },
    totalTxns: txns.length,
    txns: txns.map((t) => ({
      txnId: t.id,
      txnTime: t.createdAt.toISOString(),
      txnType: mapKind(t.kind),
      rawKind: t.kind,
      packageId: t.packageId,
      course: t.package?.course?.name ?? null,
      changedMinutes: t.deltaMinutes,
      changedHours: Number((t.deltaMinutes / 60).toFixed(2)),
      operator: null,
      relatedDocOrTicket: null,
      relatedSessionId: t.sessionId ?? null,
      note: t.note ?? null,
      riskHint: riskHint(t.kind, Math.abs(t.deltaMinutes)),
    })),
  });
}
