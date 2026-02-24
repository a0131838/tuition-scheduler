import { requireAdmin } from "@/lib/auth";
import { areAllApproversConfirmed, getApprovalRoleConfig } from "@/lib/approval-flow";
import { getPartnerSettlementApprovalMap, markPartnerSettlementExported } from "@/lib/partner-settlement-approval";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const id = String(searchParams.get("id") ?? "").trim();
  if (!id) return new Response("Missing id", { status: 400 });

  const settlement = await prisma.partnerSettlement.findUnique({
    where: { id },
    include: {
      student: { select: { name: true } },
      package: { include: { course: { select: { name: true } } } },
    },
  });
  if (!settlement) return new Response("Settlement not found", { status: 404 });

  const [cfg, approvalMap] = await Promise.all([
    getApprovalRoleConfig(),
    getPartnerSettlementApprovalMap([id]),
  ]);
  const approval = approvalMap.get(id) ?? { managerApprovedBy: [], financeApprovedBy: [], exportedAt: null };
  const managerAllApproved = areAllApproversConfirmed(approval.managerApprovedBy, cfg.managerApproverEmails);
  const financeAllApproved = areAllApproversConfirmed(approval.financeApprovedBy, cfg.financeApproverEmails);
  if (!(managerAllApproved && financeAllApproved)) {
    return new Response("All manager + finance approvals are required before export", { status: 403 });
  }

  await markPartnerSettlementExported(id);

  const headers = [
    "settlement_id",
    "created_at",
    "student",
    "mode",
    "month",
    "course",
    "hours",
    "amount",
    "status",
    "note",
  ];
  const row = [
    settlement.id,
    settlement.createdAt.toISOString(),
    settlement.student?.name ?? "",
    settlement.mode,
    settlement.monthKey ?? "",
    settlement.package?.course?.name ?? "",
    String(settlement.hours),
    String(settlement.amount),
    settlement.status,
    settlement.note ?? "",
  ];
  const csv = `${headers.join(",")}\n${row.map((x) => `"${String(x).replaceAll("\"", "\"\"")}"`).join(",")}\n`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="partner-settlement-${settlement.id}.csv"`,
    },
  });
}

