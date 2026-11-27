import { prisma } from '@/lib/prisma';
import { finalReportNeedsAcademicReview, isLearningReportApprovedForDelivery } from '@/lib/learning-report-delivery';
import { requireAdmin } from '@/lib/auth';
import { getLang, t } from '@/lib/i18n';
import { finalDeskReturnUrl } from '@/lib/final-report-desk';
import ParentReportEditionPanel from '@/app/_components/ParentReportEditionPanel';
export default async function Page({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const { id } = await params, sp = await searchParams, lang = await getLang();
  const row = await prisma.finalReport.findUnique({ where: { id }, select: { reportPeriodId: true, reportJson: true } });
  const allowDownload = !!row && (!finalReportNeedsAcademicReview(row) || isLearningReportApprovedForDelivery(row.reportJson));
  return <div>
    <a style={{ marginBottom: 16 }} href={finalDeskReturnUrl(sp.returnTo)}>← {t(lang, 'Back to report', '返回报告记录')}</a>
    <ParentReportEditionPanel kind="FINAL" id={id} lang={lang} allowFinalDownload={allowDownload} />
  </div>;
}
