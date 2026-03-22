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

export async function GET(req: Request) {
  const access = await guardOpsReadAccess(req);
  if (!access.ok) return access.response;

  const url = new URL(req.url);
  const studentId = String(url.searchParams.get("studentId") ?? "").trim();
  const status = String(url.searchParams.get("status") ?? "").trim();
  const includeArchivedRaw = String(url.searchParams.get("includeArchived") ?? "false").toLowerCase();
  const includeArchived = includeArchivedRaw === "1" || includeArchivedRaw === "true";
  const limit = Math.min(Math.max(toInt(url.searchParams.get("limit"), 20), 1), 50);

  if (!studentId) return bad("Missing query parameter: studentId", 409);

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, grade: true, school: true },
  });
  if (!student) return bad("Student not found", 404, { studentId });

  const where = {
    studentName: { equals: student.name, mode: "insensitive" as const },
    ...(status ? { status } : {}),
    ...(includeArchived ? {} : { isArchived: false }),
  };

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      ticketNo: true,
      type: true,
      priority: true,
      status: true,
      owner: true,
      createdAt: true,
      updatedAt: true,
      nextAction: true,
      nextActionDue: true,
      summary: true,
      isArchived: true,
    },
  });

  return Response.json({
    ok: true,
    student,
    query: { limit, status: status || null, includeArchived },
    total: tickets.length,
    tickets: tickets.map((row) => ({
      id: row.id,
      ticketNo: row.ticketNo,
      type: row.type,
      priority: row.priority,
      status: row.status,
      owner: row.owner ?? null,
      isArchived: row.isArchived,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      nextAction: row.nextAction ?? null,
      nextActionDue: row.nextActionDue ? row.nextActionDue.toISOString() : null,
      summary: row.summary ?? null,
    })),
  });
}
