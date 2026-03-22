#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const studentId = String(process.argv[2] ?? "").trim();
const limitRaw = Number(process.argv[3] ?? "10");
const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 50) : 10;

if (!studentId) {
  console.error("Usage: node ops/codex/query-recent-tickets-by-student.mjs <studentId> [limit]");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, grade: true, school: true },
  });

  if (!student) {
    console.log(JSON.stringify({ ok: false, message: "Student not found", studentId }, null, 2));
    process.exit(1);
  }

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
      summary: true,
      createdAt: true,
      updatedAt: true,
      priority: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        student,
        total: tickets.length,
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
