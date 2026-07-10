import { buildParentInvoicePdfResponse, getParentInvoicePdfContext } from "@/lib/parent-billing-pdf";
import { bad, requireMiniappStudentAccess } from "../../../../_lib";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getParentInvoicePdfContext(id);
  if (!ctx) return bad("Invoice not found", 404);

  const auth = await requireMiniappStudentAccess(req, ctx.invoice.studentId, "canViewFinance");
  if (!auth.ok) return auth.response;

  return buildParentInvoicePdfResponse(ctx.invoice, ctx.pkg);
}
