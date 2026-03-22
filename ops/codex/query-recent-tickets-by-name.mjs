#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const name = String(process.argv[2] ?? "").trim();
const limitRaw = Number(process.argv[3] ?? "10");
const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 50) : 10;

if (!name) {
  console.error("Usage: node ops/codex/query-recent-tickets-by-name.mjs \"学生姓名\" [limit]");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const exact = await prisma.student.findMany({
    where: { name: { equals: name, mode: "insensitive" } },
    take: 5,
    select: { id: true, name: true, grade: true, school: true },
    orderBy: { name: "asc" },
  });

  const candidates =
    exact.length > 0
      ? exact
      : await prisma.student.findMany({
          where: { name: { contains: name, mode: "insensitive" } },
          take: 5,
          select: { id: true, name: true, grade: true, school: true },
          orderBy: { name: "asc" },
        });

  if (candidates.length === 0) {
    console.log(JSON.stringify({ ok: true, query: { name }, totalCandidates: 0, message: "无匹配学生" }, null, 2));
    process.exit(0);
  }

  if (candidates.length > 1) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          query: { name },
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

  const tickets = await prisma.ticket.findMany({
    where: {
      studentName: { equals: student.name, mode: "insensitive" },
      isArchived: false,
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      ticketNo: true,
      status: true,
      owner: true,
      priority: true,
      summary: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        query: { name, limit },
        totalCandidates: 1,
        student: {
          studentId: student.id,
          name: student.name,
          grade: student.grade ?? null,
          school: student.school ?? null,
        },
        totalTickets: tickets.length,
        tickets: tickets.map((t) => ({
          id: t.id,
          ticketNo: t.ticketNo,
          status: t.status,
          owner: t.owner ?? null,
          priority: t.priority,
          summary: t.summary ?? null,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
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
