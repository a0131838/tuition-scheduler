import { redirect } from "next/navigation";
import {
  buildStudentParentIntakePath,
  getStudentParentIntakeByToken,
  submitStudentParentIntake,
} from "@/lib/student-parent-intake";

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

function isNextRedirectError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

export default async function StudentIntakePage({
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
  const intake = await getStudentParentIntakeByToken(token);

  if (!intake) {
    return (
      <div style={{ maxWidth: 860, margin: "40px auto", padding: "0 16px", display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0 }}>Student Intake Link Unavailable / 学生资料链接不可用</h1>
        <div style={{ color: "#475569" }}>
          This intake link is not available. Please contact the school team for a fresh link.
        </div>
      </div>
    );
  }

  if (intake.status === "VOID") {
    return (
      <div style={{ maxWidth: 860, margin: "40px auto", padding: "0 16px", display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0 }}>Link Closed / 链接已关闭</h1>
        <div style={{ color: "#475569" }}>
          This intake link is no longer active. Please contact the school team if you still need to submit the student details.
        </div>
      </div>
    );
  }

  if (intake.status === "SUBMITTED" || intake.status === "CONTRACT_READY" || intake.status === "SIGNED") {
    const payload = intake.payload;
    return (
      <div style={{ maxWidth: 960, margin: "32px auto 48px", padding: "0 16px", display: "grid", gap: 18 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <h1 style={{ margin: 0, fontSize: 38, lineHeight: 1.05 }}>Information Received / 资料已收到</h1>
          <div style={{ color: "#475569", fontSize: 16, lineHeight: 1.6 }}>
            The school team has received the parent and student details. We will prepare the first purchase setup and send the formal contract link next.
            / 校方已经收到家长和学生资料，接下来会由教务准备首购信息并发送正式合同链接。
          </div>
        </div>
        <div style={{ ...cardStyle("#f8fbff") }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Submitted details / 已提交资料</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <div>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Student / 学生</div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>{payload?.studentName || intake.studentName || "-"}</div>
            </div>
            <div>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Parent / 家长</div>
              <div style={{ fontWeight: 700 }}>{payload?.parentFullNameEn || "-"}</div>
            </div>
            <div>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Phone / 手机</div>
              <div style={{ fontWeight: 700 }}>{payload?.phone || "-"}</div>
            </div>
            <div>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Email / 邮箱</div>
              <div style={{ fontWeight: 700 }}>{payload?.email || "-"}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  async function submitAction(formData: FormData) {
    "use server";
    const tokenValue = String(formData.get("token") ?? "").trim();
    const studentName = String(formData.get("studentName") ?? "").trim();
    const studentEnglishName = String(formData.get("studentEnglishName") ?? "").trim();
    const school = String(formData.get("school") ?? "").trim();
    const grade = String(formData.get("grade") ?? "").trim();
    const birthDate = String(formData.get("birthDate") ?? "").trim();
    const parentFullNameEn = String(formData.get("parentFullNameEn") ?? "").trim();
    const parentFullNameZh = String(formData.get("parentFullNameZh") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const relationshipToStudent = String(formData.get("relationshipToStudent") ?? "").trim();
    const courseInterest = String(formData.get("courseInterest") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();
    const isLegalGuardian = String(formData.get("isLegalGuardian") ?? "") === "yes";

    if (!tokenValue || !studentName || !parentFullNameEn || !phone || !email || !relationshipToStudent) {
      redirect(`${buildStudentParentIntakePath(token)}?err=missing`);
    }

    try {
      await submitStudentParentIntake({
        token: tokenValue,
        payload: {
          studentName,
          studentEnglishName: studentEnglishName || null,
          school: school || null,
          grade: grade || null,
          birthDate: birthDate || null,
          parentFullNameEn,
          parentFullNameZh: parentFullNameZh || null,
          phone,
          email,
          address,
          relationshipToStudent,
          isLegalGuardian,
          courseInterest: courseInterest || null,
          note: note || null,
        },
        actorLabel: parentFullNameEn,
      });
      redirect(`${buildStudentParentIntakePath(tokenValue)}?msg=submitted`);
    } catch (error) {
      if (isNextRedirectError(error)) throw error;
      const message = error instanceof Error ? error.message : "submit";
      redirect(`${buildStudentParentIntakePath(tokenValue)}?err=${encodeURIComponent(message)}`);
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: "32px auto 48px", padding: "0 16px", display: "grid", gap: 18 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 38, lineHeight: 1.05 }}>Student Intake / 新生资料填写</h1>
        <div style={{ color: "#475569", fontSize: 16, lineHeight: 1.6 }}>
          Please fill only the key student and parent details below. The school team will prepare the lesson hours, fee details, and the formal contract afterwards.
          / 请先填写学生和家长的基础资料。课时数量、费用和正式合同会由校方后续准备。
        </div>
      </div>

      {err ? (
        <div style={{ ...cardStyle("#fff7ed"), borderColor: "#fdba74", color: "#9a3412" }}>
          请补全必填资料。 / Please complete the required fields.
        </div>
      ) : null}
      {msg ? (
        <div style={{ ...cardStyle("#ecfdf3"), borderColor: "#86efac", color: "#166534" }}>
          资料已提交成功，教务会继续准备首购信息和正式合同。 / The information has been submitted successfully. The school team will prepare the first purchase setup and the formal contract next.
        </div>
      ) : null}

      <form action={submitAction} style={{ ...cardStyle("#ffffff"), gap: 16 }}>
        <input type="hidden" name="token" value={token} />
        <div style={{ fontWeight: 800, fontSize: 18 }}>Student / 学生</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          <label style={fieldLabelStyle()}>
            Student full name / 学生姓名 *
            <input name="studentName" style={{ width: "100%", padding: "10px 12px" }} />
          </label>
          <label style={fieldLabelStyle()}>
            Student English name / 学生英文名
            <input name="studentEnglishName" style={{ width: "100%", padding: "10px 12px" }} />
          </label>
          <label style={fieldLabelStyle()}>
            School / 学校
            <input name="school" style={{ width: "100%", padding: "10px 12px" }} />
          </label>
          <label style={fieldLabelStyle()}>
            Grade / 年级
            <input name="grade" style={{ width: "100%", padding: "10px 12px" }} />
          </label>
          <label style={fieldLabelStyle()}>
            Birth date / 出生日期
            <input name="birthDate" type="date" style={{ width: "100%", padding: "10px 12px" }} />
          </label>
          <label style={fieldLabelStyle()}>
            Course interest / 课程意向
            <input name="courseInterest" style={{ width: "100%", padding: "10px 12px" }} />
          </label>
        </div>

        <div style={{ fontWeight: 800, fontSize: 18 }}>Parent / 家长</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          <label style={fieldLabelStyle()}>
            Parent full name (English) / 家长英文姓名 *
            <input name="parentFullNameEn" style={{ width: "100%", padding: "10px 12px" }} />
          </label>
          <label style={fieldLabelStyle()}>
            Parent full name (Chinese) / 家长中文姓名
            <input name="parentFullNameZh" style={{ width: "100%", padding: "10px 12px" }} />
          </label>
          <label style={fieldLabelStyle()}>
            Mobile / 手机 *
            <input name="phone" style={{ width: "100%", padding: "10px 12px" }} />
          </label>
          <label style={fieldLabelStyle()}>
            Email / 邮箱 *
            <input name="email" type="email" style={{ width: "100%", padding: "10px 12px" }} />
          </label>
          <label style={fieldLabelStyle()}>
            Relationship to student / 与学生关系 *
            <input name="relationshipToStudent" style={{ width: "100%", padding: "10px 12px" }} />
          </label>
          <label style={{ ...fieldLabelStyle(), gridColumn: "1 / -1" }}>
            Address / 地址（选填）
            <textarea name="address" rows={3} style={{ width: "100%", padding: "10px 12px" }} />
          </label>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, color: "#334155" }}>
            <input type="checkbox" name="isLegalGuardian" value="yes" />
            I am the legal guardian / 我是法定监护人
          </label>
          <label style={{ ...fieldLabelStyle(), gridColumn: "1 / -1" }}>
            Notes / 备注
            <textarea name="note" rows={3} style={{ width: "100%", padding: "10px 12px" }} />
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
            Submit student info / 提交学生资料
          </button>
        </div>
      </form>
    </div>
  );
}
