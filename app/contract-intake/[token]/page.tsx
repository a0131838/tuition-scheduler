import { redirect } from "next/navigation";
import {
  buildStudentContractIntakePath,
  getStudentContractByIntakeToken,
  markStudentContractIntakeViewed,
  submitStudentContractIntake,
} from "@/lib/student-contract";

function isNextRedirectError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

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

export default async function ContractIntakePage({
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
  const contract = await getStudentContractByIntakeToken(token);

  if (!contract) {
    return (
      <div style={{ maxWidth: 860, margin: "40px auto", padding: "0 16px", display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0 }}>Contract Link Unavailable / 合同链接不可用</h1>
        <div style={{ color: "#475569" }}>
          This contract intake link is not available. Please contact the school team for a fresh link.
        </div>
      </div>
    );
  }

  if (contract.flowType === "RENEWAL") {
    return (
      <div style={{ maxWidth: 860, margin: "40px auto", padding: "0 16px", display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0 }}>No intake needed / 无需填写资料</h1>
        <div style={{ color: "#475569" }}>
          This renewal contract reuses the parent details already on file. Please use the formal contract link from the school team instead.
        </div>
      </div>
    );
  }

  if (contract.status === "EXPIRED") {
    return (
      <div style={{ maxWidth: 860, margin: "40px auto", padding: "0 16px", display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0 }}>Link Expired / 链接已过期</h1>
        <div style={{ color: "#475569" }}>
          This contract info link has expired. Please ask the school team to resend it.
        </div>
      </div>
    );
  }

  if (contract.status === "SIGNED") {
    return (
      <div style={{ maxWidth: 860, margin: "40px auto", padding: "0 16px", display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0 }}>Contract Already Signed / 合同已签署</h1>
        <div style={{ color: "#475569" }}>
          This contract has already been completed. If you need another copy, please contact the school team.
        </div>
      </div>
    );
  }

  if (contract.status === "INVOICE_CREATED") {
    return (
      <div style={{ maxWidth: 860, margin: "40px auto", padding: "0 16px", display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0 }}>Contract Already Completed / 合同已完成</h1>
        <div style={{ color: "#475569" }}>
          This contract has already been signed and the invoice draft has been created. If you need another copy, please contact the school team.
        </div>
      </div>
    );
  }

  if (contract.status === "VOID") {
    return (
      <div style={{ maxWidth: 860, margin: "40px auto", padding: "0 16px", display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0 }}>Contract Closed / 合同已关闭</h1>
        <div style={{ color: "#475569" }}>
          This contract request is no longer active. Please contact the school team if you need a new link.
        </div>
      </div>
    );
  }

  if (contract.status === "INTAKE_PENDING" || contract.status === "INFO_PENDING") {
    await markStudentContractIntakeViewed(contract.id);
  }

  async function submitAction(formData: FormData) {
    "use server";
    const tokenValue = String(formData.get("token") ?? "").trim();
    const parentFullNameEn = String(formData.get("parentFullNameEn") ?? "").trim();
    const parentFullNameZh = String(formData.get("parentFullNameZh") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const relationshipToStudent = String(formData.get("relationshipToStudent") ?? "").trim();
    const emergencyContactName = String(formData.get("emergencyContactName") ?? "").trim();
    const emergencyContactPhone = String(formData.get("emergencyContactPhone") ?? "").trim();
    const isLegalGuardian = String(formData.get("isLegalGuardian") ?? "") === "yes";

    if (!tokenValue) redirect(`${buildStudentContractIntakePath(token)}?err=missing`);
    if (!parentFullNameEn || !phone || !email || !address || !relationshipToStudent) {
      redirect(`${buildStudentContractIntakePath(tokenValue)}?err=missing`);
    }

    try {
      await submitStudentContractIntake({
        token: tokenValue,
        parentInfo: {
          parentFullNameEn,
          parentFullNameZh: parentFullNameZh || null,
          phone,
          email,
          address,
          relationshipToStudent,
          isLegalGuardian,
          emergencyContactName: emergencyContactName || null,
          emergencyContactPhone: emergencyContactPhone || null,
        },
        actorLabel: parentFullNameEn,
      });
      redirect(`${buildStudentContractIntakePath(tokenValue)}?msg=submitted`);
    } catch (error) {
      if (isNextRedirectError(error)) throw error;
      const message = error instanceof Error ? error.message : "submit";
      redirect(`${buildStudentContractIntakePath(tokenValue)}?err=${encodeURIComponent(message)}`);
    }
  }

  const defaultInfo = contract.parentInfo;
  const intakeAlreadySubmitted =
    contract.status === "INTAKE_SUBMITTED" ||
    contract.status === "INFO_SUBMITTED" ||
    contract.status === "CONTRACT_DRAFT" ||
    contract.status === "READY_TO_SIGN";

  if (intakeAlreadySubmitted) {
    return (
      <div style={{ maxWidth: 960, margin: "32px auto 48px", padding: "0 16px", display: "grid", gap: 18 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <h1 style={{ margin: 0, fontSize: 38, lineHeight: 1.05 }}>Parent information received / 家长资料已收到</h1>
          <div style={{ color: "#475569", fontSize: 16, lineHeight: 1.6 }}>
            The school team is now preparing the final contract. We will send the formal signing link after checking the lesson hours and fee details.
            / 校方正在准备正式合同，会在核对课时与费用后再发送正式签字链接。
          </div>
        </div>

        <div style={{ ...cardStyle("#f8fbff") }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Submitted details / 已提交资料</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <div>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Parent / 家长</div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{defaultInfo?.parentFullNameEn || "-"}</div>
            </div>
            <div>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Phone / 手机</div>
              <div style={{ fontWeight: 700 }}>{defaultInfo?.phone || "-"}</div>
            </div>
            <div>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Email / 邮箱</div>
              <div style={{ fontWeight: 700 }}>{defaultInfo?.email || "-"}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "32px auto 48px", padding: "0 16px", display: "grid", gap: 18 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 38, lineHeight: 1.05 }}>Contract Intake / 合同信息确认</h1>
        <div style={{ color: "#475569", fontSize: 16, lineHeight: 1.6 }}>
          Please confirm only the parent profile details below. The school team will prepare the lesson hours and fee information separately, then send the final contract for signature.
          / 请先确认家长基础资料。课时和费用会由校方另行补充，之后再发送正式合同供签署。
        </div>
      </div>

      {err ? (
        <div style={{ ...cardStyle("#fff7ed"), borderColor: "#fdba74", color: "#9a3412" }}>
          请补全必填资料，或联系校方重新发送链接。 / Please complete the required fields or ask the school team for a fresh link.
        </div>
      ) : null}
      {msg ? (
        <div style={{ ...cardStyle("#ecfdf3"), borderColor: "#86efac", color: "#166534" }}>
          家长资料已保存，校方会准备正式合同。 / Your information has been saved. The school team will prepare the final contract next.
        </div>
      ) : null}

      <div style={{ ...cardStyle("#f8fbff") }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Summary / 摘要</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div>
            <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Student / 学生</div>
            <div style={{ fontWeight: 800, fontSize: 22 }}>{contract.studentName}</div>
          </div>
          <div>
            <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Course / 课程</div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{contract.courseName}</div>
          </div>
          <div>
            <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Package / 课包</div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{contract.packageLabel}</div>
          </div>
        </div>
      </div>

      <form action={submitAction} style={{ ...cardStyle("#ffffff"), gap: 16 }}>
        <input type="hidden" name="token" value={token} />
        <div style={{ fontWeight: 800, fontSize: 18 }}>Parent Information / 家长资料</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          <label style={fieldLabelStyle()}>
            Parent full name (English) / 家长英文姓名 *
            <input name="parentFullNameEn" defaultValue={defaultInfo?.parentFullNameEn ?? ""} style={{ width: "100%", padding: "10px 12px" }} />
          </label>
          <label style={fieldLabelStyle()}>
            Parent full name (Chinese) / 家长中文姓名
            <input name="parentFullNameZh" defaultValue={defaultInfo?.parentFullNameZh ?? ""} style={{ width: "100%", padding: "10px 12px" }} />
          </label>
          <label style={fieldLabelStyle()}>
            Mobile / 手机 *
            <input name="phone" defaultValue={defaultInfo?.phone ?? ""} style={{ width: "100%", padding: "10px 12px" }} />
          </label>
          <label style={fieldLabelStyle()}>
            Email / 邮箱 *
            <input name="email" type="email" defaultValue={defaultInfo?.email ?? ""} style={{ width: "100%", padding: "10px 12px" }} />
          </label>
          <label style={{ ...fieldLabelStyle(), gridColumn: "1 / -1" }}>
            Address / 地址 *
            <input name="address" defaultValue={defaultInfo?.address ?? ""} style={{ width: "100%", padding: "10px 12px" }} />
          </label>
          <label style={fieldLabelStyle()}>
            Relationship to student / 与学生关系 *
            <input name="relationshipToStudent" defaultValue={defaultInfo?.relationshipToStudent ?? ""} style={{ width: "100%", padding: "10px 12px" }} />
          </label>
          <label style={fieldLabelStyle()}>
            Emergency contact name / 紧急联系人
            <input name="emergencyContactName" defaultValue={defaultInfo?.emergencyContactName ?? ""} style={{ width: "100%", padding: "10px 12px" }} />
          </label>
          <label style={fieldLabelStyle()}>
            Emergency contact phone / 紧急联系电话
            <input name="emergencyContactPhone" defaultValue={defaultInfo?.emergencyContactPhone ?? ""} style={{ width: "100%", padding: "10px 12px" }} />
          </label>
        </div>

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "#0f172a", fontWeight: 700 }}>
          <input type="checkbox" name="isLegalGuardian" value="yes" defaultChecked={defaultInfo?.isLegalGuardian ?? true} />
          I confirm that I am the parent or legal guardian for this student, or I am duly authorised to sign on the student's behalf.
          / 我确认我是该学生的家长、法定监护人，或已被正式授权代为签约。
        </label>

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "#334155" }}>
          <input type="checkbox" name="agreementConfirm" value="yes" required />
          I confirm the information above is accurate and may be used to generate the final tuition agreement.
          / 我确认以上信息准确无误，并同意系统据此生成正式学费合同。
        </label>

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
            Submit profile / 提交资料
          </button>
        </div>
      </form>
    </div>
  );
}
