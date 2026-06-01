import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getLang, t, type Lang } from "@/lib/i18n";
import {
  createBusinessAccount,
  createBusinessMonthlyDocument,
  deleteDraftBusinessMonthlyDocument,
  issueBusinessMonthlyDocument,
  listBusinessAccounts,
  recordBusinessMonthlyPayment,
  updateBusinessAccount,
  voidBusinessMonthlyDocument,
  type BusinessAccount,
  type BusinessMonthlyDocumentStatus,
} from "@/lib/business-accounts";
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

type BusinessTab = "documents" | "create" | "account" | "new-account";

function parseTab(value: string | null | undefined): BusinessTab {
  if (value === "create" || value === "account" || value === "new-account") return value;
  return "documents";
}

function redirectWith(accountId: string | null, params: Record<string, string>) {
  const sp = new URLSearchParams();
  if (accountId) sp.set("accountId", accountId);
  for (const [key, value] of Object.entries(params)) sp.set(key, value);
  redirect(`/admin/finance/business-accounts?${sp.toString()}`);
}

function statusLabel(lang: Lang, status: BusinessMonthlyDocumentStatus) {
  switch (status) {
    case "DRAFT":
      return t(lang, "Draft", "草稿");
    case "ISSUED":
      return t(lang, "Issued", "已开票");
    case "PAID":
      return t(lang, "Paid", "已收款");
    case "VOID":
      return t(lang, "Voided", "已作废");
    default:
      return status;
  }
}

function statusStyle(status: BusinessMonthlyDocumentStatus): React.CSSProperties {
  const colors: Record<BusinessMonthlyDocumentStatus, { bg: string; border: string; color: string }> = {
    DRAFT: { bg: "#f8fafc", border: "#cbd5e1", color: "#334155" },
    ISSUED: { bg: "#eff6ff", border: "#93c5fd", color: "#1d4ed8" },
    PAID: { bg: "#ecfdf5", border: "#86efac", color: "#15803d" },
    VOID: { bg: "#fef2f2", border: "#fecaca", color: "#991b1b" },
  };
  const c = colors[status];
  return { display: "inline-block", border: `1px solid ${c.border}`, background: c.bg, color: c.color, borderRadius: 999, padding: "3px 8px", fontWeight: 800, fontSize: 12 };
}

function fieldStyle(): React.CSSProperties {
  return { width: "100%", minHeight: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 10px" };
}

function buttonStyle(kind: "primary" | "secondary" | "danger" | "success" = "secondary"): React.CSSProperties {
  const styles = {
    primary: { background: "#2563eb", color: "#fff", border: "#1d4ed8" },
    secondary: { background: "#eef2ff", color: "#1e1b4b", border: "#c7d2fe" },
    danger: { background: "#fff1f2", color: "#9f1239", border: "#fecdd3" },
    success: { background: "#ecfdf5", color: "#166534", border: "#bbf7d0" },
  }[kind];
  return { background: styles.background, color: styles.color, border: `1px solid ${styles.border}`, borderRadius: 8, padding: "8px 12px", fontWeight: 800, cursor: "pointer" };
}

async function createAccountAction(formData: FormData) {
  "use server";
  const actor = await requireAdmin();
  let nextAccountId: string | null = null;
  let nextParams: Record<string, string> = {};
  try {
    const account = await createBusinessAccount({
      type: String(formData.get("type") ?? "CORPORATE_CLIENT") as any,
      legalNameEn: String(formData.get("legalNameEn") ?? "").trim(),
      legalNameZh: String(formData.get("legalNameZh") ?? "").trim(),
      registrationNo: String(formData.get("registrationNo") ?? "").trim(),
      registeredAddress: String(formData.get("registeredAddress") ?? "").trim(),
      contactName: String(formData.get("contactName") ?? "").trim(),
      contactEmail: String(formData.get("contactEmail") ?? "").trim(),
      fixedMonthlyFee: Number(formData.get("fixedMonthlyFee") ?? 0),
      agreementType: String(formData.get("agreementType") ?? "CUSTOM_INVOICE") as any,
      agreementTitle: String(formData.get("agreementTitle") ?? "").trim(),
      agreementDate: String(formData.get("agreementDate") ?? "").trim(),
      paymentMethod: String(formData.get("paymentMethod") ?? "BANK_TRANSFER") as any,
      paymentTerms: String(formData.get("paymentTerms") ?? "").trim(),
      payeeName: String(formData.get("payeeName") ?? "").trim(),
      bankName: String(formData.get("bankName") ?? "").trim(),
      bankAddress: String(formData.get("bankAddress") ?? "").trim(),
      bankAccountNo: String(formData.get("bankAccountNo") ?? "").trim(),
      bankSwiftCode: String(formData.get("bankSwiftCode") ?? "").trim(),
      bankCode: String(formData.get("bankCode") ?? "").trim(),
      bankBranchCode: String(formData.get("bankBranchCode") ?? "").trim(),
      paymentReferencePrefix: String(formData.get("paymentReferencePrefix") ?? "").trim(),
      paymentInstructions: String(formData.get("paymentInstructions") ?? "").trim(),
      note: String(formData.get("note") ?? "").trim(),
      actor,
    });
    revalidatePath("/admin/finance/business-accounts");
    nextAccountId = account.id;
    nextParams = { msg: "account-created" };
  } catch (error: any) {
    nextParams = { err: error?.message ?? "Create account failed" };
  }
  redirectWith(nextAccountId, nextParams);
}

async function updateAccountAction(formData: FormData) {
  "use server";
  const actor = await requireAdmin();
  const accountId = String(formData.get("accountId") ?? "").trim();
  let nextParams: Record<string, string> = {};
  try {
    await updateBusinessAccount({
      accountId,
      type: String(formData.get("type") ?? "CORPORATE_CLIENT") as any,
      legalNameEn: String(formData.get("legalNameEn") ?? "").trim(),
      legalNameZh: String(formData.get("legalNameZh") ?? "").trim(),
      registrationNo: String(formData.get("registrationNo") ?? "").trim(),
      registeredAddress: String(formData.get("registeredAddress") ?? "").trim(),
      contactName: String(formData.get("contactName") ?? "").trim(),
      contactEmail: String(formData.get("contactEmail") ?? "").trim(),
      fixedMonthlyFee: Number(formData.get("fixedMonthlyFee") ?? 0),
      agreementType: String(formData.get("agreementType") ?? "CUSTOM_INVOICE") as any,
      agreementTitle: String(formData.get("agreementTitle") ?? "").trim(),
      agreementDate: String(formData.get("agreementDate") ?? "").trim(),
      paymentMethod: String(formData.get("paymentMethod") ?? "BANK_TRANSFER") as any,
      paymentTerms: String(formData.get("paymentTerms") ?? "").trim(),
      payeeName: String(formData.get("payeeName") ?? "").trim(),
      bankName: String(formData.get("bankName") ?? "").trim(),
      bankAddress: String(formData.get("bankAddress") ?? "").trim(),
      bankAccountNo: String(formData.get("bankAccountNo") ?? "").trim(),
      bankSwiftCode: String(formData.get("bankSwiftCode") ?? "").trim(),
      bankCode: String(formData.get("bankCode") ?? "").trim(),
      bankBranchCode: String(formData.get("bankBranchCode") ?? "").trim(),
      paymentReferencePrefix: String(formData.get("paymentReferencePrefix") ?? "").trim(),
      paymentInstructions: String(formData.get("paymentInstructions") ?? "").trim(),
      note: String(formData.get("note") ?? "").trim(),
      actor,
    });
    revalidatePath("/admin/finance/business-accounts");
    nextParams = { msg: "account-updated" };
  } catch (error: any) {
    nextParams = { err: error?.message ?? "Update account failed" };
  }
  redirectWith(accountId, nextParams);
}

async function createMonthlyDocumentAction(formData: FormData) {
  "use server";
  const actor = await requireAdmin();
  const accountId = String(formData.get("accountId") ?? "").trim();
  let nextParams: Record<string, string> = {};
  try {
    await createBusinessMonthlyDocument({
      accountId,
      monthKey: String(formData.get("monthKey") ?? "").trim(),
      issueDate: String(formData.get("issueDate") ?? "").trim(),
      dueDate: String(formData.get("dueDate") ?? "").trim(),
      variableTutorFee: Number(formData.get("variableTutorFee") ?? 0),
      serviceSummary: String(formData.get("serviceSummary") ?? "").trim(),
      platformsUsed: String(formData.get("platformsUsed") ?? "").trim(),
      personnelInvolved: String(formData.get("personnelInvolved") ?? "").trim(),
      benefitSummary: String(formData.get("benefitSummary") ?? "").trim(),
      tutorCostSummary: String(formData.get("tutorCostSummary") ?? "").trim(),
      note: String(formData.get("note") ?? "").trim(),
      actor,
    });
    revalidatePath("/admin/finance/business-accounts");
    nextParams = { msg: "document-created" };
  } catch (error: any) {
    nextParams = { err: error?.message ?? "Create document failed" };
  }
  redirectWith(accountId, nextParams);
}

async function issueDocumentAction(formData: FormData) {
  "use server";
  const actor = await requireAdmin();
  const accountId = String(formData.get("accountId") ?? "").trim();
  let nextParams: Record<string, string> = {};
  try {
    await issueBusinessMonthlyDocument({ documentId: String(formData.get("documentId") ?? ""), actor });
    revalidatePath("/admin/finance/business-accounts");
    nextParams = { msg: "document-issued" };
  } catch (error: any) {
    nextParams = { err: error?.message ?? "Issue failed" };
  }
  redirectWith(accountId, nextParams);
}

async function deleteDraftDocumentAction(formData: FormData) {
  "use server";
  const actor = await requireAdmin();
  const accountId = String(formData.get("accountId") ?? "").trim();
  let nextParams: Record<string, string> = {};
  try {
    await deleteDraftBusinessMonthlyDocument({ documentId: String(formData.get("documentId") ?? ""), actor });
    revalidatePath("/admin/finance/business-accounts");
    nextParams = { msg: "draft-deleted" };
  } catch (error: any) {
    nextParams = { err: error?.message ?? "Delete failed" };
  }
  redirectWith(accountId, nextParams);
}

async function voidDocumentAction(formData: FormData) {
  "use server";
  const actor = await requireAdmin();
  const accountId = String(formData.get("accountId") ?? "").trim();
  let nextParams: Record<string, string> = {};
  try {
    await voidBusinessMonthlyDocument({
      documentId: String(formData.get("documentId") ?? ""),
      reason: String(formData.get("voidReason") ?? "").trim(),
      actor,
    });
    revalidatePath("/admin/finance/business-accounts");
    nextParams = { msg: "document-voided" };
  } catch (error: any) {
    nextParams = { err: error?.message ?? "Void failed" };
  }
  redirectWith(accountId, nextParams);
}

async function recordPaymentAction(formData: FormData) {
  "use server";
  const actor = await requireAdmin();
  const accountId = String(formData.get("accountId") ?? "").trim();
  let nextParams: Record<string, string> = {};
  try {
    await recordBusinessMonthlyPayment({
      documentId: String(formData.get("documentId") ?? ""),
      receiptNo: String(formData.get("receiptNo") ?? "").trim(),
      receivedFrom: String(formData.get("receivedFrom") ?? "").trim(),
      paidDate: String(formData.get("paidDate") ?? "").trim(),
      paidAmount: Number(formData.get("paidAmount") ?? 0),
      paymentMethod: String(formData.get("paymentMethod") ?? "").trim(),
      paymentReference: String(formData.get("paymentReference") ?? "").trim(),
      paymentNote: String(formData.get("paymentNote") ?? "").trim(),
      actor,
    });
    revalidatePath("/admin/finance/business-accounts");
    nextParams = { msg: "payment-recorded" };
  } catch (error: any) {
    nextParams = { err: error?.message ?? "Record payment failed" };
  }
  redirectWith(accountId, nextParams);
}

function accountOptions(account: BusinessAccount) {
  return (
    <>
      <option value="INTERCOMPANY">Intercompany / 关联公司</option>
      <option value="SALES_AGENT">Sales Agent / 销售代理</option>
      <option value="CHANNEL_PARTNER">Channel Partner / 渠道方</option>
      <option value="EDUCATION_PARTNER">Education Partner / 教育合作方</option>
      <option value="CORPORATE_CLIENT">Corporate Client / 企业客户</option>
    </>
  );
}

function AccountForm({ account, lang }: { account: BusinessAccount; lang: Lang }) {
  return (
    <form action={updateAccountAction} style={{ display: "grid", gap: 12 }}>
      <input type="hidden" name="accountId" value={account.id} />
      <input type="hidden" name="tab" value="account" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
        <label>{t(lang, "Account type", "账户类型")}<select name="type" defaultValue={account.type} style={fieldStyle()}>{accountOptions(account)}</select></label>
        <label>{t(lang, "Agreement type", "协议类型")}<select name="agreementType" defaultValue={account.agreementType} style={fieldStyle()}>
          <option value="FIXED_PLUS_VARIABLE_TUTOR">Fixed fee + variable tutor cost</option>
          <option value="COMMISSION_BY_SALES">Commission by sales amount</option>
          <option value="REFERRAL_FEE_PER_STUDENT">Referral fee per student</option>
          <option value="CUSTOM_INVOICE">Custom invoice only</option>
        </select></label>
        <label>{t(lang, "Fixed monthly fee", "固定月费")}<input name="fixedMonthlyFee" type="number" min="0" step="0.01" defaultValue={account.fixedMonthlyFee} style={fieldStyle()} /></label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
        <label>{t(lang, "English legal name", "英文公司名")}<input name="legalNameEn" required defaultValue={account.legalNameEn} style={fieldStyle()} /></label>
        <label>{t(lang, "Chinese legal name", "中文公司名")}<input name="legalNameZh" defaultValue={account.legalNameZh} style={fieldStyle()} /></label>
        <label>{t(lang, "Registration/UEN/USCC", "注册号/UEN/统一信用代码")}<input name="registrationNo" defaultValue={account.registrationNo} style={fieldStyle()} /></label>
      </div>
      <label>{t(lang, "Registered address", "注册地址")}<input name="registeredAddress" defaultValue={account.registeredAddress ?? ""} style={fieldStyle()} /></label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
        <label>{t(lang, "Contact name", "联系人")}<input name="contactName" defaultValue={account.contactName ?? ""} style={fieldStyle()} /></label>
        <label>{t(lang, "Contact email", "联系人邮箱")}<input name="contactEmail" type="email" defaultValue={account.contactEmail ?? ""} style={fieldStyle()} /></label>
        <label>{t(lang, "Agreement title", "协议名称")}<input name="agreementTitle" defaultValue={account.agreementTitle ?? ""} style={fieldStyle()} /></label>
        <label>{t(lang, "Agreement date", "协议日期")}<input name="agreementDate" type="date" defaultValue={account.agreementDate ?? ""} style={fieldStyle()} /></label>
      </div>
      <div style={{ border: "1px solid #dbeafe", background: "#f8fbff", borderRadius: 10, padding: 12, display: "grid", gap: 10 }}>
        <b>{t(lang, "Our receiving account for company transfers", "我方公司收款账户")}</b>
        <div style={{ color: "#64748b", fontSize: 12 }}>
          {t(
            lang,
            "This is GT Educational's receiving account shown on invoices. Other companies transfer money to this account.",
            "这里是 GT Educational 的收款账户，会显示在发票上；其他公司向这个账户付款。"
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
          <label>{t(lang, "Payment method", "付款方式")}<select name="paymentMethod" defaultValue={account.paymentMethod} style={fieldStyle()}>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="PAYNOW">PayNow</option>
            <option value="OTHER">Other</option>
          </select></label>
          <label>{t(lang, "Payment terms", "付款期限")}<input name="paymentTerms" defaultValue={account.paymentTerms} style={fieldStyle()} /></label>
          <label>{t(lang, "Payee name (our company)", "收款方名称（我方公司）")}<input name="payeeName" defaultValue={account.payeeName ?? ""} style={fieldStyle()} /></label>
          <label>{t(lang, "Receiving bank", "收款银行")}<input name="bankName" defaultValue={account.bankName ?? ""} style={fieldStyle()} /></label>
          <label>{t(lang, "Receiving account no.", "收款账号")}<input name="bankAccountNo" defaultValue={account.bankAccountNo ?? ""} style={fieldStyle()} /></label>
          <label>SWIFT<input name="bankSwiftCode" defaultValue={account.bankSwiftCode ?? ""} style={fieldStyle()} /></label>
          <label>{t(lang, "Bank code", "银行代码")}<input name="bankCode" defaultValue={account.bankCode ?? ""} style={fieldStyle()} /></label>
          <label>{t(lang, "Branch code", "分行代码")}<input name="bankBranchCode" defaultValue={account.bankBranchCode ?? ""} style={fieldStyle()} /></label>
          <label>{t(lang, "Payment reference prefix", "付款备注前缀")}<input name="paymentReferencePrefix" defaultValue={account.paymentReferencePrefix ?? ""} style={fieldStyle()} /></label>
        </div>
        <label>{t(lang, "Receiving bank address", "收款银行地址")}<input name="bankAddress" defaultValue={account.bankAddress ?? ""} style={fieldStyle()} /></label>
        <label>{t(lang, "Payment instructions", "付款说明")}<textarea name="paymentInstructions" rows={2} defaultValue={account.paymentInstructions ?? ""} style={fieldStyle()} /></label>
      </div>
      <label>{t(lang, "Internal note", "内部备注")}<textarea name="note" rows={2} defaultValue={account.note ?? ""} style={fieldStyle()} /></label>
      <button style={{ ...buttonStyle("primary"), justifySelf: "start" }}>{t(lang, "Save account profile", "保存企业资料")}</button>
    </form>
  );
}

export default async function BusinessAccountsPage({
  searchParams,
}: {
  searchParams?: Promise<{ msg?: string; err?: string; accountId?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const tab = parseTab((sp as any)?.tab);
  const store = await listBusinessAccounts();
  const selected = store.accounts.find((x) => x.id === sp?.accountId) ?? store.accounts.find((x) => x.id === "shanghai-xin-zhuo-si") ?? store.accounts[0];
  const docs = store.monthlyDocuments.filter((x) => x.accountId === selected.id);
  const month = currentMonth();
  const issueDate = formatBusinessDateOnly(new Date());
  const dueDate = addDays(issueDate, 14);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={workbenchHeroStyle("blue")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8" }}>{t(lang, "Business Accounts", "企业账户")}</div>
          <h2 style={{ margin: 0 }}>{t(lang, "Business Accounts / Company Billing", "企业账户 / 公司级开票")}</h2>
          <div style={{ color: "#475569", maxWidth: 980 }}>
            {t(
              lang,
              "Create company accounts, maintain bank-transfer instructions, issue monthly business invoices, record payments, and download business receipts. This workspace is separate from New Oriental partner settlement and parent invoices.",
              "创建企业账户、维护公司转账信息、开具月度企业发票、记录收款并下载企业收据。这里与新东方合作方结算和家长账单相互独立。"
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
            <div style={workbenchMetricValueStyle("emerald")}>{store.monthlyDocuments.length}</div>
          </div>
          <div style={workbenchMetricCardStyle("amber")}>
            <div style={workbenchMetricLabelStyle("amber")}>{t(lang, "Selected fixed fee", "当前固定月费")}</div>
            <div style={{ ...workbenchMetricValueStyle("amber"), fontSize: 22 }}>{money(selected.fixedMonthlyFee)}</div>
          </div>
        </div>
      </section>

      {sp?.err ? <div style={{ border: "1px solid #fecaca", background: "#fef2f2", padding: 10, borderRadius: 8, color: "#991b1b" }}>{decodeURIComponent(sp.err)}</div> : null}
      {sp?.msg ? <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", padding: 10, borderRadius: 8, color: "#166534" }}>{t(lang, "Saved.", "已保存。")}</div> : null}

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#fff", display: "grid", gap: 12 }}>
        <h3 style={{ marginTop: 0 }}>{t(lang, "Select Business Account", "选择企业账户")}</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {store.accounts.map((account) => (
            <a
              key={account.id}
              href={`/admin/finance/business-accounts?accountId=${encodeURIComponent(account.id)}`}
              style={{
                border: account.id === selected.id ? "1px solid #2563eb" : "1px solid #cbd5e1",
                background: account.id === selected.id ? "#eff6ff" : "#fff",
                borderRadius: 999,
                padding: "7px 11px",
                textDecoration: "none",
                color: account.id === selected.id ? "#1d4ed8" : "#334155",
                fontWeight: 800,
              }}
            >
              {account.legalNameZh || account.legalNameEn}
            </a>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
          {[
            ["documents", t(lang, "Documents & payment", "单据与收款")],
            ["create", t(lang, "Create invoice", "创建发票")],
            ["account", t(lang, "Company profile", "公司资料")],
            ["new-account", t(lang, "Add company", "新增公司")],
          ].map(([key, label]) => (
            <a
              key={key}
              href={`/admin/finance/business-accounts?accountId=${encodeURIComponent(selected.id)}&tab=${key}`}
              style={{
                border: tab === key ? "1px solid #2563eb" : "1px solid #cbd5e1",
                background: tab === key ? "#eff6ff" : "#fff",
                borderRadius: 8,
                padding: "8px 12px",
                textDecoration: "none",
                color: tab === key ? "#1d4ed8" : "#334155",
                fontWeight: 900,
              }}
            >
              {label}
            </a>
          ))}
        </div>
      </section>

      {tab === "new-account" ? <section style={{ border: "1px solid #dbeafe", background: "#f8fbff", borderRadius: 12, padding: 14 }}>
        <h3 style={{ marginTop: 0 }}>{t(lang, "Add new business account", "新增企业账户")}</h3>
        <form action={createAccountAction} style={{ display: "grid", gap: 10, marginTop: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
            <label>{t(lang, "Account type", "账户类型")}<select name="type" defaultValue="CORPORATE_CLIENT" style={fieldStyle()}>{accountOptions(selected)}</select></label>
            <label>{t(lang, "Agreement type", "协议类型")}<select name="agreementType" defaultValue="CUSTOM_INVOICE" style={fieldStyle()}>
              <option value="FIXED_PLUS_VARIABLE_TUTOR">Fixed fee + variable tutor cost</option>
              <option value="COMMISSION_BY_SALES">Commission by sales amount</option>
              <option value="REFERRAL_FEE_PER_STUDENT">Referral fee per student</option>
              <option value="CUSTOM_INVOICE">Custom invoice only</option>
            </select></label>
            <label>{t(lang, "Fixed monthly fee", "固定月费")}<input name="fixedMonthlyFee" type="number" min="0" step="0.01" defaultValue="0" style={fieldStyle()} /></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
            <label>{t(lang, "English legal name", "英文公司名")}<input name="legalNameEn" required style={fieldStyle()} /></label>
            <label>{t(lang, "Chinese legal name", "中文公司名")}<input name="legalNameZh" style={fieldStyle()} /></label>
            <label>{t(lang, "Registration/UEN/USCC", "注册号/UEN/统一信用代码")}<input name="registrationNo" style={fieldStyle()} /></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
            <label>{t(lang, "Payee name (our company)", "收款方名称（我方公司）")}<input name="payeeName" defaultValue="GT Educational Institute Pte. Ltd." style={fieldStyle()} /></label>
            <label>{t(lang, "Receiving bank", "收款银行")}<input name="bankName" defaultValue="OCBC Bank Singapore" style={fieldStyle()} /></label>
            <label>{t(lang, "Receiving account no.", "收款账号")}<input name="bankAccountNo" defaultValue="595214891001" style={fieldStyle()} /></label>
            <label>{t(lang, "Payment terms", "付款期限")}<input name="paymentTerms" defaultValue="Due within 14 days" style={fieldStyle()} /></label>
          </div>
          <button style={{ ...buttonStyle("primary"), justifySelf: "start" }}>{t(lang, "Create account", "创建企业账户")}</button>
        </form>
      </section> : null}

      {tab === "account" ? <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>{t(lang, "Business Account Profile", "企业账户资料")}: {selected.legalNameZh || selected.legalNameEn}</h3>
        <AccountForm account={selected} lang={lang} />
      </section> : null}

      {tab === "create" ? <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>{t(lang, "Create Monthly Service Invoice", "创建月度服务发票")}</h3>
        <form action={createMonthlyDocumentAction} style={{ display: "grid", gap: 12 }}>
          <input type="hidden" name="accountId" value={selected.id} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <label>{t(lang, "Billing month", "结算月份")}<input name="monthKey" type="month" defaultValue={month} required style={fieldStyle()} /></label>
            <label>{t(lang, "Issue date", "发票日期")}<input name="issueDate" type="date" defaultValue={issueDate} required style={fieldStyle()} /></label>
            <label>{t(lang, "Due date", "到期日")}<input name="dueDate" type="date" defaultValue={dueDate} required style={fieldStyle()} /></label>
            <label>{t(lang, "Variable tutor fee", "浮动老师费用")}<input name="variableTutorFee" type="number" min="0" step="0.01" defaultValue="0" style={fieldStyle()} /></label>
          </div>
          <label>{t(lang, "Services performed", "已提供服务")}<textarea name="serviceSummary" rows={3} defaultValue="Singapore marketing support, student pipeline development, curriculum support, academic advisory support, tutor coordination, and management coordination support." style={fieldStyle()} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
            <label>{t(lang, "Platforms / tools", "平台 / 工具")}<textarea name="platformsUsed" rows={2} defaultValue="SGT Manage, email, online collaboration tools, video calls." style={fieldStyle()} /></label>
            <label>{t(lang, "Personnel involved", "参与人员")}<textarea name="personnelInvolved" rows={2} placeholder="Cena, finance, academic team..." style={fieldStyle()} /></label>
          </div>
          <label>{t(lang, "Benefit to recipient", "受益说明")}<textarea name="benefitSummary" rows={2} defaultValue="Operational, market, academic, and tutor coordination support for the reporting period." style={fieldStyle()} /></label>
          <label>{t(lang, "Tutor cost summary", "老师成本汇总")}<textarea name="tutorCostSummary" rows={2} placeholder="Tutor fees and directly attributable tutor support costs..." style={fieldStyle()} /></label>
          <label>{t(lang, "Internal note", "内部备注")}<input name="note" style={fieldStyle()} /></label>
          <button style={{ ...buttonStyle("primary"), justifySelf: "start" }}>{t(lang, "Create draft documents", "创建草稿单据")}</button>
        </form>
      </section> : null}

      {tab === "documents" ? <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>{t(lang, "Monthly Documents", "月度单据")}</h3>
        <div style={{ border: "1px solid #dbeafe", background: "#eff6ff", borderRadius: 10, padding: 12, marginBottom: 12, display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 900 }}>{t(lang, "Our receiving account for company transfers", "我方公司收款账户")}</div>
          <div style={{ color: "#334155", fontSize: 13 }}>
            {t(lang, "Payee", "收款方")}: <b>{selected.payeeName ?? "-"}</b> | {t(lang, "Bank", "银行")}: <b>{selected.bankName ?? "-"}</b> | {t(lang, "Account", "账号")}: <b>{selected.bankAccountNo ?? "-"}</b> | SWIFT: <b>{selected.bankSwiftCode ?? "-"}</b>
          </div>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            {t(lang, "This is our GT Educational receiving account, not the customer's bank account. Edit it in Company profile if finance updates the remittance details.", "这是我方 GT Educational 的收款账户，不是客户公司的银行账户。如财务更新收款信息，可在公司资料中维护。")}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ textAlign: "left", padding: 8 }}>Status / 状态</th>
                <th style={{ textAlign: "left", padding: 8 }}>Month / 月份</th>
                <th style={{ textAlign: "left", padding: 8 }}>Invoice / 发票</th>
                <th style={{ textAlign: "right", padding: 8 }}>Total / 合计</th>
                <th style={{ textAlign: "left", padding: 8 }}>Payment / 收款</th>
                <th style={{ textAlign: "left", padding: 8, minWidth: 360 }}>Action / 操作</th>
              </tr>
            </thead>
            <tbody>
              {docs.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 10, color: "#64748b" }}>{t(lang, "No monthly documents yet.", "暂无月度单据。")}</td></tr>
              ) : docs.map((doc) => (
                <tr key={doc.id}>
                  <td style={{ padding: 8, borderTop: "1px solid #e2e8f0" }}><span style={statusStyle(doc.status)}>{statusLabel(lang, doc.status)}</span></td>
                  <td style={{ padding: 8, borderTop: "1px solid #e2e8f0" }}>{doc.monthKey}</td>
                  <td style={{ padding: 8, borderTop: "1px solid #e2e8f0" }}>{doc.invoiceNo}</td>
                  <td style={{ padding: 8, borderTop: "1px solid #e2e8f0", textAlign: "right", fontWeight: 800 }}>
                    {money(doc.totalAmount)}
                    <div style={{ color: "#64748b", fontWeight: 400, fontSize: 12 }}>{money(doc.fixedMonthlyFee)} + {money(doc.variableTutorFee)}</div>
                  </td>
                  <td style={{ padding: 8, borderTop: "1px solid #e2e8f0" }}>
                    {doc.status === "PAID" ? (
                      <div>
                        <b>{money(doc.paidAmount ?? doc.totalAmount)}</b>
                        <div style={{ color: "#64748b", fontSize: 12 }}>{doc.receivedFrom ?? selected.legalNameEn}</div>
                        <div style={{ color: "#64748b", fontSize: 12 }}>{doc.paidDate} / {doc.paymentMethod ?? "Bank transfer"} {doc.paymentReference ? ` / ${doc.paymentReference}` : ""}</div>
                      </div>
                    ) : "-"}
                  </td>
                  <td style={{ padding: 8, borderTop: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <a href={`/api/exports/business-accounts/${doc.id}/invoice`}>Invoice PDF</a>
                      <a href={`/api/exports/business-accounts/${doc.id}/service-report`}>Service Report PDF</a>
                      {doc.status === "PAID" ? <a href={`/api/exports/business-accounts/${doc.id}/receipt`}>Receipt PDF</a> : null}
                      {doc.status === "DRAFT" ? (
                        <>
                          <form action={issueDocumentAction}>
                            <input type="hidden" name="accountId" value={selected.id} />
                            <input type="hidden" name="documentId" value={doc.id} />
                            <button style={buttonStyle("success")}>Issue</button>
                          </form>
                          <form action={deleteDraftDocumentAction}>
                            <input type="hidden" name="accountId" value={selected.id} />
                            <input type="hidden" name="documentId" value={doc.id} />
                            <button style={buttonStyle("danger")}>Delete Draft</button>
                          </form>
                        </>
                      ) : null}
                    </div>
                    {doc.status !== "VOID" && doc.status !== "PAID" ? (
                      <details style={{ marginTop: 8 }}>
                        <summary style={{ cursor: "pointer", fontWeight: 800 }}>{t(lang, "Record receipt/payment", "记录收据/收款")}</summary>
                        <form action={recordPaymentAction} style={{ display: "grid", gap: 8, marginTop: 8, maxWidth: 520 }}>
                          <input type="hidden" name="accountId" value={selected.id} />
                          <input type="hidden" name="documentId" value={doc.id} />
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                            <input name="receiptNo" placeholder={`${doc.invoiceNo}-RC`} style={fieldStyle()} />
                            <input name="receivedFrom" defaultValue={selected.legalNameEn} placeholder="Received From" style={fieldStyle()} />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                            <input name="paidDate" type="date" defaultValue={issueDate} style={fieldStyle()} />
                            <input name="paidAmount" type="number" min="0" step="0.01" defaultValue={doc.totalAmount} style={fieldStyle()} />
                            <select name="paymentMethod" defaultValue="Bank transfer" style={fieldStyle()}>
                              <option value="Paynow">Paynow</option>
                              <option value="Cash">Cash</option>
                              <option value="Bank transfer">{t(lang, "Bank transfer", "银行转账")}</option>
                            </select>
                          </div>
                          <input name="paymentReference" placeholder="Payment reference" style={fieldStyle()} />
                          <input name="paymentNote" placeholder="Payment note" style={fieldStyle()} />
                          <button style={{ ...buttonStyle("success"), justifySelf: "start" }}>Save Payment</button>
                        </form>
                      </details>
                    ) : null}
                    {doc.status !== "VOID" ? (
                      <details style={{ marginTop: 8 }}>
                        <summary style={{ cursor: "pointer", color: "#9f1239", fontWeight: 800 }}>{t(lang, "Void invoice", "作废单据")}</summary>
                        <form action={voidDocumentAction} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                          <input type="hidden" name="accountId" value={selected.id} />
                          <input type="hidden" name="documentId" value={doc.id} />
                          <input name="voidReason" placeholder="Reason" style={{ ...fieldStyle(), maxWidth: 320 }} />
                          <button style={buttonStyle("danger")}>Void</button>
                        </form>
                      </details>
                    ) : doc.voidReason ? <div style={{ color: "#991b1b", marginTop: 6, fontSize: 12 }}>Void reason: {doc.voidReason}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section> : null}
    </div>
  );
}
