import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import {
  cleanTeacherPaymentProfile,
  formatPayNowType,
  formatPaymentProfileStatus,
  formatTeacherPaymentMethod,
  maskBankAccountNumber,
  maskPayNowValue,
} from "@/lib/teacher-payment-profile";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function savePaymentDetails(formData: FormData) {
  "use server";
  const { teacher } = await requireTeacherProfile();
  if (!teacher) redirect("/teacher");

  const cleaned = cleanTeacherPaymentProfile({
    paymentMethod: formData.get("paymentMethod"),
    payNowType: formData.get("payNowType"),
    payNowValue: formData.get("payNowValue"),
    payNowName: formData.get("payNowName"),
    payNowNote: formData.get("payNowNote"),
    wiseAccountName: formData.get("wiseAccountName"),
    wiseEmail: formData.get("wiseEmail"),
    wisePhone: formData.get("wisePhone"),
    wiseTag: formData.get("wiseTag"),
    wiseCountry: formData.get("wiseCountry"),
    wiseCurrency: formData.get("wiseCurrency"),
    wiseNote: formData.get("wiseNote"),
  });

  await prisma.teacher.update({
    where: { id: teacher.id },
    data: {
      paymentMethod: cleaned.paymentMethod,
      payNowType: cleaned.payNowType,
      payNowValue: cleaned.payNowValue,
      payNowName: cleaned.payNowName,
      payNowNote: cleaned.payNowNote,
      wiseAccountName: cleaned.wiseAccountName,
      wiseEmail: cleaned.wiseEmail,
      wisePhone: cleaned.wisePhone,
      wiseTag: cleaned.wiseTag,
      wiseCountry: cleaned.wiseCountry,
      wiseCurrency: cleaned.wiseCurrency,
      wiseNote: cleaned.wiseNote,
      paymentProfileStatus: "PENDING_REVIEW",
      paymentProfileVerifiedAt: null,
      paymentProfileVerifiedBy: null,
      paymentProfileRejectReason: null,
    },
  });
  revalidatePath("/teacher/payment-details");
  redirect("/teacher/payment-details?msg=saved");
}

export default async function TeacherPaymentDetailsPage({
  searchParams,
}: {
  searchParams?: Promise<{ msg?: string }>;
}) {
  const lang = await getLang();
  const { teacher } = await requireTeacherProfile();
  const sp = await searchParams;

  if (!teacher) {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <h2>{t(lang, "Payment Details", "收款资料")}</h2>
        <p>{t(lang, "Your account is not linked to a teacher profile yet.", "你的账号还没有绑定老师档案。")}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 760 }}>
      <section style={{ border: "1px solid #dbe4f0", borderRadius: 12, padding: 16, background: "#f8fafc" }}>
        <h2 style={{ marginTop: 0 }}>{t(lang, "Payment Details", "收款资料")}</h2>
        <div style={{ color: "#475569", lineHeight: 1.5 }}>
          {t(lang, "Tutor Code", "老师编号")}: <b>{teacher.tutorCode ?? "-"}</b>
        </div>
        <div style={{ color: "#475569", lineHeight: 1.5 }}>
          {t(lang, "Payment Method", "收款方式")}: <b>{formatTeacherPaymentMethod(teacher.paymentMethod) || "-"}</b>
        </div>
        <div style={{ color: "#475569", lineHeight: 1.5 }}>
          {t(lang, "Finance Review", "财务核验")}: <b>{formatPaymentProfileStatus(teacher.paymentProfileStatus) || "-"}</b>
        </div>
        <div style={{ color: "#475569", lineHeight: 1.5 }}>
          {t(lang, "Current PayNow", "当前 PayNow")}:{" "}
          <b>
            {formatPayNowType(teacher.payNowType) || "-"} {maskPayNowValue(teacher.payNowValue)}
          </b>
        </div>
        <div style={{ color: "#475569", lineHeight: 1.5 }}>
          {t(lang, "Current Wise", "当前 Wise")}:{" "}
          <b>{teacher.wiseEmail || teacher.wisePhone || teacher.wiseTag || "-"}</b>
        </div>
        <div style={{ color: "#475569", lineHeight: 1.5 }}>
          {t(lang, "Legacy Bank Account", "历史银行账号")}:{" "}
          <b>
            {teacher.bankName ?? "-"} {maskBankAccountNumber(teacher.bankAccountNumber)}
          </b>
        </div>
      </section>

      {sp?.msg === "saved" ? (
        <div style={{ border: "1px solid #86efac", borderRadius: 10, padding: 12, background: "#f0fdf4", color: "#166534" }}>
          {t(lang, "Saved.", "已保存。")}
        </div>
      ) : null}

      <form action={savePaymentDetails} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span>{t(lang, "Payment Method", "收款方式")}</span>
          <select name="paymentMethod" defaultValue={teacher.paymentMethod ?? ""}>
            <option value="">{t(lang, "Select", "请选择")}</option>
            <option value="PAYNOW">{t(lang, "PayNow", "PayNow")}</option>
            <option value="WISE">{t(lang, "Wise (overseas tutors)", "Wise（海外老师）")}</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>{t(lang, "PayNow Type", "PayNow 类型")}</span>
          <select name="payNowType" defaultValue={teacher.payNowType ?? ""}>
            <option value="">{t(lang, "Select", "请选择")}</option>
            <option value="MOBILE">{t(lang, "Mobile", "手机号")}</option>
            <option value="NRIC">{t(lang, "NRIC/FIN", "NRIC/FIN")}</option>
            <option value="UEN">{t(lang, "UEN", "UEN")}</option>
            <option value="OTHER">{t(lang, "Other", "其他")}</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>{t(lang, "PayNow ID / Mobile", "PayNow 账号 / 手机号")}</span>
          <input name="payNowValue" defaultValue={teacher.payNowValue ?? ""} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>{t(lang, "PayNow Name", "PayNow 收款名")}</span>
          <input name="payNowName" defaultValue={teacher.payNowName ?? ""} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>{t(lang, "Note", "备注")}</span>
          <textarea name="payNowNote" rows={3} defaultValue={teacher.payNowNote ?? ""} />
        </label>
        <div style={{ border: "1px solid #dbe4f0", borderRadius: 10, padding: 12, background: "#f8fafc", display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 700 }}>{t(lang, "Wise details for overseas tutors", "海外老师 Wise 资料")}</div>
          <label style={{ display: "grid", gap: 4 }}>
            <span>{t(lang, "Wise Account Holder Name", "Wise 户名")}</span>
            <input name="wiseAccountName" defaultValue={teacher.wiseAccountName ?? ""} />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span>{t(lang, "Wise Email", "Wise 邮箱")}</span>
            <input name="wiseEmail" defaultValue={teacher.wiseEmail ?? ""} />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span>{t(lang, "Wise Phone", "Wise 手机号")}</span>
            <input name="wisePhone" defaultValue={teacher.wisePhone ?? ""} />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span>{t(lang, "WiseTag / Wise Username", "WiseTag / Wise 用户名")}</span>
            <input name="wiseTag" defaultValue={teacher.wiseTag ?? ""} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 4 }}>
              <span>{t(lang, "Country", "国家")}</span>
              <input name="wiseCountry" defaultValue={teacher.wiseCountry ?? ""} />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span>{t(lang, "Currency", "币种")}</span>
              <input name="wiseCurrency" defaultValue={teacher.wiseCurrency ?? ""} />
            </label>
          </div>
          <label style={{ display: "grid", gap: 4 }}>
            <span>{t(lang, "Wise Note", "Wise 备注")}</span>
            <textarea name="wiseNote" rows={3} defaultValue={teacher.wiseNote ?? ""} />
          </label>
        </div>
        <div style={{ border: "1px dashed #cbd5e1", borderRadius: 10, padding: 12, background: "#fff", color: "#475569", lineHeight: 1.5 }}>
          <b>{t(lang, "Legacy bank transfer details are read-only.", "历史银行转账资料仅保留查看。")}</b>
          <div>{t(lang, "New payouts should use PayNow for local tutors and Wise for overseas tutors.", "新的老师付款请本地老师用 PayNow，海外老师用 Wise。")}</div>
          <div>
            {teacher.bankName ?? "-"} {teacher.bankAccountName ?? ""} {maskBankAccountNumber(teacher.bankAccountNumber)} {teacher.bankBranchCode ?? ""}
          </div>
        </div>
        <button type="submit" style={{ justifySelf: "start" }}>
          {t(lang, "Save Payment Details", "保存收款资料")}
        </button>
      </form>
    </div>
  );
}
