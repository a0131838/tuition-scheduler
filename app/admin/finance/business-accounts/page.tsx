import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { createBusinessMonthlyDocument, listBusinessAccounts } from "@/lib/business-accounts";
import { formatBusinessDateOnly } from "@/lib/date-only";
import {
  workbenchHeroStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
  workbenchMetricValueStyle,
} from "@/app/admin/_components/workbenchStyles";

function money(v: number) {
  return `SGD ${Number(v || 0).toFixed(2)}`;
}

function addDays(dateOnly: string, days: number) {
  const d = new Date(`${dateOnly}T00:00:00+08:00`);
  d.setDate(d.getDate() + days);
  return formatBusinessDateOnly(d);
}

function currentMonth() {
  return formatBusinessDateOnly(new Date()).slice(0, 7);
}

async function createMonthlyDocumentAction(formData: FormData) {
  "use server";
  const actor = await requireAdmin();
  const accountId = String(formData.get("accountId") ?? "").trim();
  const monthKey = String(formData.get("monthKey") ?? "").trim();
  const issueDate = String(formData.get("issueDate") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const variableTutorFee = Number(formData.get("variableTutorFee") ?? 0);
  const serviceSummary = String(formData.get("serviceSummary") ?? "").trim();
  const platformsUsed = String(formData.get("platformsUsed") ?? "").trim();
  const personnelInvolved = String(formData.get("personnelInvolved") ?? "").trim();
  const benefitSummary = String(formData.get("benefitSummary") ?? "").trim();
  const tutorCostSummary = String(formData.get("tutorCostSummary") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  try {
    await createBusinessMonthlyDocument({
      accountId,
      monthKey,
      issueDate,
      dueDate,
      variableTutorFee,
      serviceSummary,
      platformsUsed,
      personnelInvolved,
      benefitSummary,
      tutorCostSummary,
      note,
      actor,
    });
  } catch (error: any) {
    redirect(`/admin/finance/business-accounts?err=${encodeURIComponent(error?.message ?? "Create failed")}`);
  }
  revalidatePath("/admin/finance/business-accounts");
  redirect("/admin/finance/business-accounts?msg=created");
}

export default async function BusinessAccountsPage({
  searchParams,
}: {
  searchParams?: Promise<{ msg?: string; err?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const store = await listBusinessAccounts();
  const shanghai = store.accounts.find((x) => x.id === "shanghai-xin-zhuo-si") ?? store.accounts[0];
  const docs = store.monthlyDocuments.filter((x) => x.accountId === shanghai.id);
  const month = currentMonth();
  const issueDate = formatBusinessDateOnly(new Date());
  const dueDate = addDays(issueDate, 14);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={workbenchHeroStyle("blue")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8" }}>
            {t(lang, "Business Accounts", "企业账户")}
          </div>
          <h2 style={{ margin: 0 }}>{t(lang, "Business Accounts / Company Billing", "企业账户 / 公司级开票")}</h2>
          <div style={{ color: "#475569", maxWidth: 940 }}>
            {t(
              lang,
              "Use this page for company-level invoicing such as Shanghai Xin Zhuo Si. It is separate from New Oriental partner settlement and student package billing.",
              "这里用于上海新卓思这类公司级开票；与新东方合作方结算、学生课包账单相互独立。"
            )}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <div style={workbenchMetricCardStyle("blue")}>
            <div style={workbenchMetricLabelStyle("blue")}>{t(lang, "Accounts", "企业账户")}</div>
            <div style={workbenchMetricValueStyle("blue")}>{store.accounts.length}</div>
          </div>
          <div style={workbenchMetricCardStyle("emerald")}>
            <div style={workbenchMetricLabelStyle("emerald")}>{t(lang, "Monthly documents", "月度单据")}</div>
            <div style={workbenchMetricValueStyle("emerald")}>{docs.length}</div>
          </div>
          <div style={workbenchMetricCardStyle("amber")}>
            <div style={workbenchMetricLabelStyle("amber")}>{t(lang, "Default fixed fee", "默认固定月费")}</div>
            <div style={{ ...workbenchMetricValueStyle("amber"), fontSize: 22 }}>{money(shanghai.fixedMonthlyFee)}</div>
          </div>
        </div>
      </section>

      {sp?.err ? <div style={{ border: "1px solid #fecaca", background: "#fef2f2", padding: 10, borderRadius: 8, color: "#991b1b" }}>{decodeURIComponent(sp.err)}</div> : null}
      {sp?.msg ? <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", padding: 10, borderRadius: 8, color: "#166534" }}>{t(lang, "Saved.", "已保存。")}</div> : null}

      <section style={{ border: "1px solid #dbeafe", background: "#f8fbff", borderRadius: 12, padding: 14 }}>
        <h3 style={{ marginTop: 0 }}>{shanghai.legalNameZh}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, fontSize: 13 }}>
          <div><b>{t(lang, "English name", "英文名称")}:</b><br />{shanghai.legalNameEn}</div>
          <div><b>{t(lang, "Unified Social Credit Code", "统一社会信用代码")}:</b><br />{shanghai.registrationNo}</div>
          <div><b>{t(lang, "Type", "类型")}:</b><br />Intercompany / 关联公司</div>
          <div><b>{t(lang, "Note", "备注")}:</b><br />{shanghai.note}</div>
        </div>
      </section>

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>{t(lang, "Create Monthly Service Invoice", "创建月度服务发票")}</h3>
        <form action={createMonthlyDocumentAction} style={{ display: "grid", gap: 12 }}>
          <input type="hidden" name="accountId" value={shanghai.id} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <label>{t(lang, "Billing month", "结算月份")}<input name="monthKey" type="month" defaultValue={month} required style={{ width: "100%" }} /></label>
            <label>{t(lang, "Issue date", "发票日期")}<input name="issueDate" type="date" defaultValue={issueDate} required style={{ width: "100%" }} /></label>
            <label>{t(lang, "Due date", "到期日")}<input name="dueDate" type="date" defaultValue={dueDate} required style={{ width: "100%" }} /></label>
            <label>{t(lang, "Variable tutor fee", "浮动老师费用")}<input name="variableTutorFee" type="number" min="0" step="0.01" defaultValue="0" style={{ width: "100%" }} /></label>
          </div>
          <label>{t(lang, "Services performed", "已提供服务")}<textarea name="serviceSummary" rows={3} defaultValue="Singapore marketing support, student pipeline development, curriculum support, academic advisory support, tutor coordination, and management coordination support." style={{ width: "100%" }} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
            <label>{t(lang, "Platforms / tools", "平台 / 工具")}<textarea name="platformsUsed" rows={2} defaultValue="SGT Manage, email, online collaboration tools, video calls." style={{ width: "100%" }} /></label>
            <label>{t(lang, "Personnel involved", "参与人员")}<textarea name="personnelInvolved" rows={2} placeholder="Cena, finance, academic team..." style={{ width: "100%" }} /></label>
          </div>
          <label>{t(lang, "Benefit to recipient", "受益说明")}<textarea name="benefitSummary" rows={2} defaultValue="Operational, market, academic, and tutor coordination support for the reporting period." style={{ width: "100%" }} /></label>
          <label>{t(lang, "Tutor cost summary", "老师成本汇总")}<textarea name="tutorCostSummary" rows={2} placeholder="Tutor fees and directly attributable tutor support costs..." style={{ width: "100%" }} /></label>
          <label>{t(lang, "Internal note", "内部备注")}<input name="note" style={{ width: "100%" }} /></label>
          <button style={{ justifySelf: "start", background: "#2563eb", color: "#fff", border: "1px solid #1d4ed8", borderRadius: 8, padding: "9px 14px", fontWeight: 800 }}>
            {t(lang, "Create documents", "创建单据")}
          </button>
        </form>
      </section>

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>{t(lang, "Monthly Documents", "月度单据")}</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ textAlign: "left", padding: 8 }}>Month / 月份</th>
                <th style={{ textAlign: "left", padding: 8 }}>Invoice / 发票</th>
                <th style={{ textAlign: "right", padding: 8 }}>Fixed / 固定</th>
                <th style={{ textAlign: "right", padding: 8 }}>Variable / 浮动</th>
                <th style={{ textAlign: "right", padding: 8 }}>Total / 合计</th>
                <th style={{ textAlign: "left", padding: 8 }}>Action / 操作</th>
              </tr>
            </thead>
            <tbody>
              {docs.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 10, color: "#64748b" }}>{t(lang, "No monthly documents yet.", "暂无月度单据。")}</td></tr>
              ) : docs.map((doc) => (
                <tr key={doc.id}>
                  <td style={{ padding: 8, borderTop: "1px solid #e2e8f0" }}>{doc.monthKey}</td>
                  <td style={{ padding: 8, borderTop: "1px solid #e2e8f0" }}>{doc.invoiceNo}</td>
                  <td style={{ padding: 8, borderTop: "1px solid #e2e8f0", textAlign: "right" }}>{money(doc.fixedMonthlyFee)}</td>
                  <td style={{ padding: 8, borderTop: "1px solid #e2e8f0", textAlign: "right" }}>{money(doc.variableTutorFee)}</td>
                  <td style={{ padding: 8, borderTop: "1px solid #e2e8f0", textAlign: "right", fontWeight: 800 }}>{money(doc.totalAmount)}</td>
                  <td style={{ padding: 8, borderTop: "1px solid #e2e8f0" }}>
                    <a href={`/api/exports/business-accounts/${doc.id}/invoice`} style={{ marginRight: 10 }}>Invoice PDF</a>
                    <a href={`/api/exports/business-accounts/${doc.id}/service-report`}>Service Report PDF</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
