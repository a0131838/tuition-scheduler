import { prisma } from "@/lib/prisma";
import { ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { miniappRequestDto } from "@/lib/miniapp-parent-requests";

function toInt(v: string | null, fallback: number) {
  const n = Number(v ?? "");
  if (!Number.isFinite(n)) return fallback;
  return Math.floor(n);
}

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const owner = String(url.searchParams.get("owner") ?? "").trim();
  const status = String(url.searchParams.get("status") ?? "").trim();
  const type = String(url.searchParams.get("type") ?? "").trim();
  const includeDoneRaw = String(url.searchParams.get("includeDone") ?? "false").toLowerCase();
  const includeDone = includeDoneRaw === "1" || includeDoneRaw === "true";
  const limit = Math.min(Math.max(toInt(url.searchParams.get("limit"), 50), 1), 200);

  const tickets = await prisma.ticket.findMany({
    where: {
      source: "家长小程序",
      isArchived: false,
      ...(owner ? { owner } : {}),
      ...(type ? { type } : {}),
      ...(status ? { status } : includeDone ? {} : { status: { notIn: ["Completed", "Cancelled"] } }),
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return ok({
    generatedAt: new Date().toISOString(),
    total: tickets.length,
    requests: tickets.map(miniappRequestDto),
  });
}
