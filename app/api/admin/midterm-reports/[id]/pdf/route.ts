import { requireAdmin } from "@/lib/auth";
import { buildMidtermReportPdfResponse } from "@/lib/midterm-report-pdf";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  return buildMidtermReportPdfResponse(id);
}
