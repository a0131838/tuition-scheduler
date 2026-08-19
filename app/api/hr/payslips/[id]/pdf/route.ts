import { PassThrough } from "stream";
import { getCurrentUser } from "@/lib/auth";
import { canManageHr } from "@/lib/hr-access";
import { logAudit } from "@/lib/audit-log";
import { buildHrPayslipPdf } from "@/lib/hr-payslip-pdf";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser(); if (!actor) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const row = await prisma.hrPayslip.findUnique({ where: { id }, include: { employee: { include: { user: true, legalEntity: true } } } });
  if (!row) return new Response("Payslip not found", { status: 404 });
  const own = row.employee.userId === actor.id && (row.status === "DIRECTOR_APPROVED" || row.status === "PAID");
  const privileged = actor.role === "FINANCE" || await canManageHr(actor);
  if (!own && !privileged) return new Response("Forbidden", { status: 403 });
  await logAudit({ actor, module: "hr", action: "PAYSLIP_PDF_OPENED", entityType: "HrPayslip", entityId: row.id });
  const doc = buildHrPayslipPdf(row); const stream = new PassThrough(); doc.pipe(stream); doc.end();
  const filename = `payslip_${row.month}_${row.employee.user.name.replace(/[^A-Za-z0-9_-]+/g, "_")}.pdf`;
  return new Response(stream as any, { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${filename}"`, "cache-control": "private, no-store" } });
}
