import { requireAdmin } from "@/lib/auth";
import { buildFinalReportPdfResponse } from "@/lib/final-report-pdf";
import { getLang } from "@/lib/i18n";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const lang = await getLang();
  const { id } = await params;
  return buildFinalReportPdfResponse(id, lang);
}
