import { requireAdmin } from "@/lib/auth";
import { getBusinessMonthlyDocument } from "@/lib/business-accounts";
import { buildBusinessReceiptPdf } from "@/lib/business-account-pdf";

function safeName(s: string) {
  return s.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const row = await getBusinessMonthlyDocument(id);
  if (!row) return new Response("Document not found", { status: 404 });
  if (row.document.status !== "PAID") return new Response("Receipt is available only after payment is recorded", { status: 409 });
  const stream = buildBusinessReceiptPdf(row.account, row.document);
  const filename = safeName(`${row.document.receiptNo ?? row.document.invoiceNo}-business-receipt.pdf`);
  return new Response(stream as any, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
