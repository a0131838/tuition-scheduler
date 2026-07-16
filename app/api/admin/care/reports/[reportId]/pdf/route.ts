import { requireCareEngagementAccess } from "@/lib/care-access";
import { buildCareReportPdf } from "@/lib/care-report-pdf";
import { prisma } from "@/lib/prisma";
import { PassThrough } from "stream";

export async function GET(_: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const report = await prisma.careReport.findUnique({
    where: { id: reportId },
    include: {
      student: { select: { name: true, school: true, grade: true } },
      preparedBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
    },
  });
  if (!report) return new Response("Report not found", { status: 404 });
  await requireCareEngagementAccess(report.engagementId);
  if (report.status !== "APPROVED" && report.status !== "PUBLISHED") {
    return new Response("Only approved reports can be exported", { status: 409 });
  }
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
