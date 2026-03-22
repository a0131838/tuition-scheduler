#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const name = String(process.argv[2] ?? "").trim();
const daysRaw = Number(process.argv[3] ?? "30");
const limitRaw = Number(process.argv[4] ?? "50");
const days = Number.isFinite(daysRaw) ? Math.min(Math.max(Math.floor(daysRaw), 1), 365) : 30;
const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 200) : 50;

if (!name) {
  console.error("Usage: node ops/codex/query-package-txns-by-name.mjs \"学生姓名\" [days=30] [limit=50]");
  process.exit(1);
}

const prisma = new PrismaClient();

function riskHint(kind, deltaMinutes) {
  if (kind === "ADJUST") return "需复核：人工调整流水";
  if (kind === "ROLLBACK") return "需复核：回滚流水";
  if (kind === "DEDUCT" && deltaMinutes >= 180) return "需复核：单次扣减分钟较大";
  return "正常";
}

function mapKind(kind) {
  if (kind === "DEDUCT") return "扣课";
  if (kind === "ROLLBACK") return "回滚";
  if (kind === "ADJUST") return "调整";
  if (kind === "PURCHASE") return "购课";
  return kind;
}

try {
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

  if (candidates.length === 0) {
    console.log(JSON.stringify({ ok: true, query: { name, days, limit }, totalCandidates: 0, message: "无匹配学生" }, null, 2));
    process.exit(0);
  }

  if (candidates.length > 1) {
    console.log(
      JSON.stringify(
        {
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
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  const student = candidates[0];
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const txns = await prisma.packageTxn.findMany({
    where: {
      createdAt: { gte: fromDate },
      package: { studentId: student.id },
    },
    orderBy: [{ createdAt: "desc" }],
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

  console.log(
    JSON.stringify(
      {
        ok: true,
        query: { name, days, limit, fromDate: fromDate.toISOString() },
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
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(JSON.stringify({ ok: false, message: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
