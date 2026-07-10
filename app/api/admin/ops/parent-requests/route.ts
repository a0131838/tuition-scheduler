import { prisma } from "@/lib/prisma";
import { guardOpsReadAccess } from "@/lib/ops-auth";
import { miniappRequestDto } from "@/lib/miniapp-parent-requests";

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
  const owner = String(url.searchParams.get("owner") ?? "").trim();
  const status = String(url.searchParams.get("status") ?? "").trim();
  const studentId = String(url.searchParams.get("studentId") ?? "").trim();
  const includeDoneRaw = String(url.searchParams.get("includeDone") ?? "false").toLowerCase();
  const includeDone = includeDoneRaw === "1" || includeDoneRaw === "true";
  const limit = Math.min(Math.max(toInt(url.searchParams.get("limit"), 50), 1), 200);

  const tickets = await prisma.ticket.findMany({
    where: {
      source: "家长小程序",
      isArchived: false,
      ...(owner ? { owner } : {}),
      ...(status ? { status } : includeDone ? {} : { status: { notIn: ["Completed", "Cancelled"] } }),
      ...(studentId ? { studentId } : {}),
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return Response.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    query: {
      owner: owner || null,
      status: status || null,
      studentId: studentId || null,
      includeDone,
      limit,
    },
    total: tickets.length,
    requests: tickets.map((ticket) => miniappRequestDto(ticket, { includeInternal: true })),
  });
}
