import { redirect } from "next/navigation";
import {
  buildSchoolApplicationParentInfoPath,
  getSchoolApplicationByParentInfoToken,
  getSchoolApplicationParentInfoDefaults,
  markSchoolApplicationParentInfoViewed,
  submitSchoolApplicationParentInfo,
} from "@/lib/school-application";

function cardStyle(background: string) {
  return {
    border: "1px solid #dbe4f0",
    borderRadius: 18,
    background,
    padding: 18,
    display: "grid",
    gap: 10,
  } as const;
}

function fieldLabelStyle() {
  return {
    display: "grid",
    gap: 6,
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
  } as const;
}

function inputStyle() {
  return { width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 10 } as const;
}

function isNextRedirectError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

export default async function SchoolApplicationInfoPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ err?: string; msg?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const err = String(sp?.err ?? "").trim();
  const msg = String(sp?.msg ?? "").trim();
  const app = await getSchoolApplicationByParentInfoToken(token);

  if (!app) {
    return (
      <div style={{ maxWidth: 860, margin: "40px auto", padding: "0 16px", display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0 }}>School Application Link Unavailable / 学校申请资料链接不可用</h1>
        <div style={{ color: "#475569" }}>This link is not available. Please contact the school team for a fresh link.</div>
      </div>
    );
  }

  if (app.status === "VOID" || app.status === "INVOICE_CREATED") {
    return (
      <div style={{ maxWidth: 860, margin: "40px auto", padding: "0 16px", display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0 }}>Link Closed / 链接已关闭</h1>
        <div style={{ color: "#475569" }}>This school application request has already been closed. Please contact the school team if changes are needed.</div>
      </div>
    );
  }

  if (app.parentInfoExpiresAt && app.parentInfoExpiresAt.getTime() < Date.now()) {
    return (
      <div style={{ maxWidth: 860, margin: "40px auto", padding: "0 16px", display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0 }}>Link Expired / 链接已过期</h1>
        <div style={{ color: "#475569" }}>This school application information link has expired. Please ask the school team to resend it.</div>
      </div>
    );
  }

  if (!app.parentInfoSubmittedAt) {
    await markSchoolApplicationParentInfoViewed(app.id);
  }
  const defaults = await getSchoolApplicationParentInfoDefaults(app.id);

  async function submitAction(formData: FormData) {
    "use server";
    const tokenValue = String(formData.get("token") ?? "").trim();
    const parentName = String(formData.get("parentName") ?? "").trim();
    const parentIdNo = String(formData.get("parentIdNo") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const relationshipToStudent = String(formData.get("relationshipToStudent") ?? "").trim();
    const studentSchool = String(formData.get("studentSchool") ?? "").trim();
    const studentGrade = String(formData.get("studentGrade") ?? "").trim();
    const applicationNote = String(formData.get("applicationNote") ?? "").trim();
    const isLegalGuardian = String(formData.get("isLegalGuardian") ?? "") === "yes";

    if (!tokenValue || !parentName || !phone || !email) {
      redirect(`${buildSchoolApplicationParentInfoPath(tokenValue || token)}?err=missing`);
    }

    try {
      await submitSchoolApplicationParentInfo({
        parentInfoToken: tokenValue,
        parentInfo: {
          parentName,
          parentIdNo: parentIdNo || null,
          phone,
          email,
          address: address || null,
          relationshipToStudent: relationshipToStudent || null,
          isLegalGuardian,
          studentSchool: studentSchool || null,
          studentGrade: studentGrade || null,
          applicationNote: applicationNote || null,
        },
        actorLabel: parentName,
      });
      redirect(`${buildSchoolApplicationParentInfoPath(tokenValue)}?msg=submitted`);
    } catch (error) {
      if (isNextRedirectError(error)) throw error;
      const message = error instanceof Error ? error.message : "submit";
      redirect(`${buildSchoolApplicationParentInfoPath(tokenValue)}?err=${encodeURIComponent(message)}`);
    }
  }

  if (msg || app.parentInfoSubmittedAt) {
    return (
      <div style={{ maxWidth: 960, margin: "32px auto 48px", padding: "0 16px", display: "grid", gap: 18 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <h1 style={{ margin: 0, fontSize: 38, lineHeight: 1.05 }}>Information Received / 资料已收到</h1>
          <div style={{ color: "#475569", fontSize: 16, lineHeight: 1.6 }}>
            The school team has received the parent and student details. We will check the application items and fee details before sending the formal signing link.
            / 校方已经收到家长和学生资料。我们会先核对申请学校和费用，再发送正式签字链接。
          </div>
        </div>
        <div style={{ ...cardStyle("#f8fbff") }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Submitted details / 已提交资料</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <div>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Student / 学生</div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{app.studentName}</div>
            </div>
            <div>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Parent / 家长</div>
              <div style={{ fontWeight: 700 }}>{defaults.parentName || app.parentInfo?.parentName || "-"}</div>
            </div>
            <div>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Phone / 手机</div>
              <div style={{ fontWeight: 700 }}>{defaults.phone || app.parentInfo?.phone || "-"}</div>
            </div>
            <div>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Email / 邮箱</div>
              <div style={{ fontWeight: 700 }}>{defaults.email || app.parentInfo?.email || "-"}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "32px auto 48px", padding: "0 16px", display: "grid", gap: 18 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 38, lineHeight: 1.05 }}>School Application Details / 学校申请资料确认</h1>
        <div style={{ color: "#475569", fontSize: 16, lineHeight: 1.6 }}>
          Please confirm the parent contact details and the student's current school information. The school team will prepare the final school list, fees, and formal contract separately.
          / 请确认家长联系方式和学生当前学校信息。申请学校列表、费用和正式合同会由校方后续核对并发送。
        </div>
      </div>

      {err ? (
        <div style={{ ...cardStyle("#fff7ed"), borderColor: "#fdba74", color: "#9a3412" }}>
          请补全家长姓名、电话和邮箱。 / Please complete the parent name, phone, and email.
        </div>
      ) : null}

      <form action={submitAction} style={{ ...cardStyle("#ffffff"), gap: 16 }}>
        <input type="hidden" name="token" value={token} />
        <div style={{ ...cardStyle("#f8fbff"), gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div>
            <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Student / 学生</div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>{app.studentName}</div>
          </div>
          <div>
            <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Current service / 当前服务</div>
            <div style={{ fontWeight: 700 }}>{app.items.length || 0} school(s) · SGD {app.totalAmount.toFixed(2)}</div>
          </div>
        </div>

        <div style={{ fontWeight: 800, fontSize: 18 }}>Parent / 家长</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          <label style={fieldLabelStyle()}>
            Parent full name / 家长姓名 *
            <input name="parentName" defaultValue={defaults.parentName} style={inputStyle()} />
          </label>
          <label style={fieldLabelStyle()}>
            Parent ID / 证件号
            <input name="parentIdNo" defaultValue={defaults.parentIdNo ?? ""} style={inputStyle()} />
          </label>
          <label style={fieldLabelStyle()}>
            Mobile / 手机 *
            <input name="phone" defaultValue={defaults.phone ?? ""} style={inputStyle()} />
          </label>
          <label style={fieldLabelStyle()}>
            Email / 邮箱 *
            <input name="email" type="email" defaultValue={defaults.email ?? ""} style={inputStyle()} />
          </label>
          <label style={fieldLabelStyle()}>
            Relationship to student / 与学生关系
            <input name="relationshipToStudent" defaultValue={defaults.relationshipToStudent ?? ""} style={inputStyle()} />
          </label>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, color: "#334155", paddingTop: 24 }}>
            <input type="checkbox" name="isLegalGuardian" value="yes" defaultChecked={Boolean(defaults.isLegalGuardian)} />
            I am the legal guardian / 我是法定监护人
          </label>
          <label style={{ ...fieldLabelStyle(), gridColumn: "1 / -1" }}>
            Address / 地址
            <textarea name="address" rows={3} defaultValue={defaults.address ?? ""} style={inputStyle()} />
          </label>
        </div>

        <div style={{ fontWeight: 800, fontSize: 18 }}>Student school profile / 学生学校信息</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          <label style={fieldLabelStyle()}>
            Current school / 当前学校
            <input name="studentSchool" defaultValue={defaults.studentSchool ?? ""} style={inputStyle()} />
          </label>
          <label style={fieldLabelStyle()}>
            Current grade / 当前年级
            <input name="studentGrade" defaultValue={defaults.studentGrade ?? ""} style={inputStyle()} />
          </label>
          <label style={{ ...fieldLabelStyle(), gridColumn: "1 / -1" }}>
            Application notes / 申请备注
            <textarea name="applicationNote" rows={3} defaultValue={defaults.applicationNote ?? ""} style={inputStyle()} />
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            style={{
              borderRadius: 999,
              border: "1px solid #2563eb",
              background: "#2563eb",
              color: "#fff",
              padding: "10px 18px",
              fontWeight: 800,
            }}
          >
            Submit details / 提交资料
          </button>
        </div>
      </form>
    </div>
  );
}
