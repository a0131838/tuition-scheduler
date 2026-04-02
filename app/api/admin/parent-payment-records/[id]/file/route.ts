import { requireAdmin } from "@/lib/auth";
import { getParentPaymentRecordById } from "@/lib/student-parent-billing";
import { buildStoredBusinessFileResponse, BUSINESS_UPLOAD_PREFIX } from "@/lib/business-file-storage";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();

  const { id } = await params;
  const record = await getParentPaymentRecordById(id);
  if (!record) return new Response("Not Found", { status: 404 });

  return buildStoredBusinessFileResponse(req, {
    allowedPrefix: BUSINESS_UPLOAD_PREFIX.paymentProofs,
    relativePath: record.relativePath,
    originalFileName: record.originalFileName,
    fallbackFileName: "payment-proof",
  });
}
