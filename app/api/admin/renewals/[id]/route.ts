import { getRenewalEntitlementEvidence } from "@/lib/renewal-entitlement-evidence";
import { requireRenewalCenterUser } from "@/lib/renewal-access";
import { prisma } from "@/lib/prisma";
import { getRenewalPaymentEvidence } from "@/lib/renewal-payment-evidence";
import { updateRenewalTask } from "@/lib/renewal-management";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRenewalCenterUser();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const task = await updateRenewalTask({ ...(body ?? {}), id, actor: user });
    return Response.json({ ok: true, task });
  } catch (error) {
    return Response.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to update renewal task" },
      { status: 400 }
    );
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRenewalCenterUser();
  if (user.operationsAdmin) return Response.json({ ok: false }, { status: 403 });
  const { id } = await params;
  const task = await prisma.renewalTask.findUnique({ where: { id } });
  if (!task) return Response.json({ ok: false }, { status: 404 });
  try {
    const query = new URL(req.url).searchParams;
    const input = { activatedPackageId: query.has("packageId") ? query.get("packageId") : task.activatedPackageId,
      contractId: query.has("contractId") ? query.get("contractId") : task.contractId };
    const entitlement = await getRenewalEntitlementEvidence(task, input);
    // Keep selectors available when a stale contract link needs explicit correction.
    let evidence = null;
    let paymentError = "";
    try { evidence = await getRenewalPaymentEvidence(task, input); }
    catch (error) { paymentError = error instanceof Error ? error.message : "Unable to load payment / 无法读取收款"; }
    return Response.json({ ok: true, evidence, entitlement, paymentError });
  } catch (error) {
    return Response.json({ ok: false, message: error instanceof Error ? error.message : "Unable to load evidence / 无法读取凭据" }, { status: 400 });
  }
}
