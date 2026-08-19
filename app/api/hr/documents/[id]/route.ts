import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageHr } from "@/lib/hr-access";
import { readPrivateHrFile } from "@/lib/hr-private-files";
import { logAudit } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const row = await prisma.hrDocument.findUnique({ where: { id }, include: { employee: { select: { userId: true } } } });
  if (!row || row.archivedAt) return NextResponse.json({ message: "Not found" }, { status: 404 });
  const ownDocument = row.employee?.userId === actor.id;
  const manager = await canManageHr(actor);
  if (!manager && (!ownDocument || row.sensitivity === "HIGHLY_RESTRICTED")) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const data = await readPrivateHrFile(row.privatePath);
  await logAudit({ actor, module: "hr", action: "PRIVATE_DOCUMENT_OPENED", entityType: "HrDocument", entityId: row.id });
  return new NextResponse(new Uint8Array(data), { headers: { "content-type": row.mimeType || "application/octet-stream", "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(row.originalName)}`, "cache-control": "private, no-store" } });
}
