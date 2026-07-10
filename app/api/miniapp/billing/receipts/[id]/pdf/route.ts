import { buildParentReceiptPdfResponse, getParentReceiptPdfContext } from "@/lib/parent-billing-pdf";
import { bad, requireMiniappStudentAccess } from "../../../../_lib";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getParentReceiptPdfContext(id);
  if (!ctx) return bad("Receipt not found", 404);
  if (!ctx.financeReady) return bad("Receipt export requires finance approval", 403);

  const auth = await requireMiniappStudentAccess(req, ctx.receipt.studentId, "canViewFinance");
  if (!auth.ok) return auth.response;

  return buildParentReceiptPdfResponse(ctx.receipt, ctx.pkg, ctx.linkedInvoice);
}
