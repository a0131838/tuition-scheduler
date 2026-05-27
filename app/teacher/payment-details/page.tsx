import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { cleanTeacherPaymentProfile, formatPayNowType, maskPayNowValue } from "@/lib/teacher-payment-profile";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function savePaymentDetails(formData: FormData) {
  "use server";
  const { teacher } = await requireTeacherProfile();
  if (!teacher) redirect("/teacher");

  const cleaned = cleanTeacherPaymentProfile({
    payNowType: formData.get("payNowType"),
    payNowValue: formData.get("payNowValue"),
    payNowName: formData.get("payNowName"),
    payNowNote: formData.get("payNowNote"),
  });

  await prisma.teacher.update({
    where: { id: teacher.id },
    data: {
      payNowType: cleaned.payNowType,
      payNowValue: cleaned.payNowValue,
      payNowName: cleaned.payNowName,
      payNowNote: cleaned.payNowNote,
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
          {t(lang, "Current PayNow", "当前 PayNow")}:{" "}
          <b>
            {formatPayNowType(teacher.payNowType) || "-"} {maskPayNowValue(teacher.payNowValue)}
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
        <button type="submit" style={{ justifySelf: "start" }}>
          {t(lang, "Save Payment Details", "保存收款资料")}
        </button>
      </form>
    </div>
  );
}
