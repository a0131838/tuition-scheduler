import { requireAdmin } from "@/lib/auth";
import { getBusinessMonthlyDocument } from "@/lib/business-accounts";
import { buildBusinessServiceReportPdf } from "@/lib/business-account-pdf";

function safeName(s: string) {
  return s.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const row = await getBusinessMonthlyDocument(id);
  if (!row) return new Response("Document not found", { status: 404 });
  const stream = buildBusinessServiceReportPdf(row.account, row.document);
  const filename = safeName(`${row.document.invoiceNo}-${row.account.legalNameEn}-service-report.pdf`);
  return new Response(stream as any, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
