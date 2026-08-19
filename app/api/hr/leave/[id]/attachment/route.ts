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
  const row = await prisma.hrLeaveRequest.findUnique({
    where: { id },
    include: { employee: { select: { userId: true } } },
  });
  if (!row?.attachmentPrivatePath || !row.attachmentOriginalName) {
    return NextResponse.json({ message: "Attachment not found" }, { status: 404 });
  }
  const own = row.employee.userId === actor.id;
  if (!own && !(await canManageHr(actor))) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const data = await readPrivateHrFile(row.attachmentPrivatePath);
  await logAudit({ actor, module: "hr", action: "LEAVE_ATTACHMENT_OPENED", entityType: "HrLeaveRequest", entityId: row.id });
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "content-type": row.attachmentMimeType || "application/octet-stream",
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(row.attachmentOriginalName)}`,
      "cache-control": "private, no-store",
    },
  });
}
