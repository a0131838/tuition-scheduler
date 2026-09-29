import { buildCareReportPdf } from "@/lib/care-report-pdf";
import { accessParentCareReport } from "@/lib/parent-care-reports";
import { PassThrough } from "stream";
import { bad, requireMiniappStudentAccess } from "../../../../../_lib";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ studentId: string; reportId: string }> }) {
  const { studentId, reportId } = await params;
  const auth = await requireMiniappStudentAccess(req, studentId, "canViewReports");
  if (!auth.ok) return auth.response;
  const access = await accessParentCareReport({ parentId: auth.parent.id, studentId, reportId, mode: "PDF" });
  if (!access) return bad("Report not found / 未找到报告", 404);
  const { report } = access;

  const { doc, fileName } = buildCareReportPdf(report);
  const stream = new PassThrough();
  doc.pipe(stream);
  doc.end();
  const ascii = fileName.replace(/[^\x20-\x7E]/g, "_");
  return new Response(stream as never, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
