#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const name = String(process.argv[2] ?? "").trim();
const limitRaw = Number(process.argv[3] ?? "20");
const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 50) : 20;

if (!name) {
  console.error("Usage: node ops/codex/query-student-by-name.mjs \"学生姓名\" [limit]");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const exact = await prisma.student.findMany({
    where: { name: { equals: name, mode: "insensitive" } },
    orderBy: { name: "asc" },
    take: limit,
    select: {
      id: true,
      name: true,
      grade: true,
      school: true,
      _count: { select: { packages: true, sessions: true, attendances: true } },
    },
  });

  const exactIds = new Set(exact.map((s) => s.id));
  const remaining = limit - exact.length;

  const fuzzy =
    remaining > 0
      ? await prisma.student.findMany({
          where: {
            name: { contains: name, mode: "insensitive" },
            id: { notIn: Array.from(exactIds) },
          },
          orderBy: { name: "asc" },
          take: remaining,
          select: {
            id: true,
            name: true,
            grade: true,
            school: true,
            _count: { select: { packages: true, sessions: true, attendances: true } },
          },
        })
      : [];

  const rows = [...exact, ...fuzzy].map((r) => ({
    studentId: r.id,
    name: r.name,
    grade: r.grade ?? null,
    school: r.school ?? null,
    stats: {
      packages: r._count.packages,
      sessions: r._count.sessions,
      attendances: r._count.attendances,
    },
  }));

  console.log(JSON.stringify({ ok: true, query: { name, limit }, total: rows.length, candidates: rows }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, message: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
