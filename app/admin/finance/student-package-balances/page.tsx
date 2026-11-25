import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { formatBusinessDateOnly } from "@/lib/date-only";
import { prepaidFamilyReport, summarizePrepaid, type PrepaidRow } from "@/lib/prepaid-family-report";
import { reasons, reportDate } from "@/lib/prepaid-family-calculation";
import "./report.css";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; month?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const tr = (en: string, zh: string) => t(lang, en, zh);
  const params = await searchParams;
  const today = formatBusinessDateOnly(new Date());
  const date = reportDate(
    params.date,
    params.month === today.slice(0, 7) && !params.date ? undefined : params.month,
    today,
  );
  const rows = date ? await prepaidFamilyReport(date) : [];
  const sum = summarizePrepaid(rows);
  const families = new Map<string, PrepaidRow[]>();
  for (const r of rows) {
    const family = families.get(r.familyId) ?? [];
    family.push(r);
    families.set(r.familyId, family);
  }
  const money = (c: number) =>
    "SGD " + (c / 100).toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const hours = (m: number) => Number((m / 60).toFixed(2)) + "h";
  return (
    <main className="prepaid-report">
      <a href="/admin/finance/workbench">{tr("Back to Finance", "返回财务工作台")}</a> ·{" "}
      <a href="/admin/finance/student-package-invoices">{tr("Student package invoices", "学生课包发票")}</a>
      <h1>{tr("Family prepaid tuition balances", "家庭预收学费余额")}</h1>
      <form method="get">
        <label>
          {tr("As of date (Singapore)", "截止日期（新加坡）")}{" "}
          <input type="date" name="date" defaultValue={date ?? today} required max={today} />
        </label>
        <button>{tr("Load report", "查询报表")}</button>
        {date && (
          <a href={"/api/exports/student-package-month-end-balance?date=" + date}>
            {tr("Export comparison CSV", "导出新旧对照 CSV")}
          </a>
        )}
      </form>
      {!date ? (
        <p role="alert">{tr("Select a valid date up to today.", "请选择今天或更早的有效日期。")}</p>
      ) : (
        <>
          <div className="prepaid-metrics">
            <div>
              {tr("Verified prepaid subtotal", "已核实预收学费小计")}
              <strong>{money(sum.verified)}</strong>
            </div>
            <div>
              {tr("Known remaining service hours", "已知剩余服务课时")}
              <strong>{hours(sum.minutes)}</strong>
            </div>
            <div>
              {tr("Packages needing review", "待核对课包")}
              <strong>
                {sum.pending} · {hours(sum.pendingMinutes)}
              </strong>
            </div>
            <div>
              {tr("Taught, awaiting settlement", "已上待结算")}
              <strong>{hours(sum.arrears)}</strong>
            </div>
          </div>
          <p>
            {date} · {families.size} {tr("billing groups", "个家庭或结算组")} · {rows.length}{" "}
            {tr("packages", "个课包")} · {tr("Legacy estimate", "旧报表估值")} {money(sum.legacy)} ·{" "}
            {tr("Hours undetermined", "小时待核")} {sum.unknownHours}
          </p>
          <p>
            {tr(
              "Uses posted hours, dated receipts and currently available evidence. Shared packages count once. Pending amounts are excluded from the verified subtotal.",
              "按截止日已入账课时、收据日期及现有凭证回算。共享课包只计一次；待核对金额不计入已核实小计。",
            )}
          </p>
          <p>
            {tr(
              "Expand a family for package evidence and review reasons. Families use shared billing or a unique finance-parent link; otherwise the student is shown separately.",
              "展开家庭可查课包依据和待核原因。按共享结算或明确的财务家长关联归集；缺少家庭关联时按学生单列。",
            )}
          </p>
          {[...families.entries()].map(([key, list]) => {
            const stats = summarizePrepaid(list);
            return (
              <details key={key}>
                <summary>
                  <b>{list[0].family}</b>
                  <span>
                    {hours(stats.minutes)}
                    {stats.unknownHours > 0 && " + ?"}
                  </span>
                  <span>
                    {stats.pending === list.length
                      ? tr("Amount pending", "金额待核")
                      : money(stats.verified) +
                        (stats.pending ? tr(" verified subtotal", " 已核实小计") : "")}
                  </span>
                  <span>
                    {stats.pending
                      ? tr("Review", "待核对") + " × " + stats.pending
                      : tr("Verified", "已核实")}
                  </span>
                </summary>
                {list.map((r) => (
                  <section key={r.id}>
                    <h3>
                      {r.course} · {r.id.slice(0, 8)}
                    </h3>
                    <p>
                      {tr("Hours", "课时")} {r.minutes === null ? "—" : hours(r.minutes)} ·{" "}
                      {tr("Legacy estimate", "旧估值")} {money(r.legacyCents)} ·{" "}
                      {tr("Verified prepaid", "已核实预收")}{" "}
                      {r.prepaidCents === null ? "—" : money(r.prepaidCents)}
                    </p>
                    {r.issues.map((i) => (
                      <div key={i}>{reasons[i]}</div>
                    ))}
                    {r.evidence.length > 0 && (
                      <small>
                        {tr("Evidence", "依据")} · {r.evidence.join(" · ")}
                      </small>
                    )}
                  </section>
                ))}
              </details>
            );
          })}
        </>
      )}
    </main>
  );
}
