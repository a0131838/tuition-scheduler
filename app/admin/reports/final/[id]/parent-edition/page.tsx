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
  return <div>
    <a style={{ marginBottom: 16 }} href={finalDeskReturnUrl(sp.returnTo)}>← {t(lang, 'Back to report', '返回报告记录')}</a>
    <ParentReportEditionPanel kind="FINAL" id={id} lang={lang} />
  </div>;
}
