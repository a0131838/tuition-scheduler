import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import ContractSignaturePad from "@/app/contract/_components/ContractSignaturePad";
import {
  buildStudentContractSignPath,
  getStudentContractBySignToken,
  markStudentContractSignViewed,
  signStudentContract,
} from "@/lib/student-contract";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function stepPillStyle(state: "done" | "active" | "idle") {
  if (state === "done") {
    return {
      padding: "6px 10px",
      borderRadius: 999,
      background: "#ecfdf3",
      color: "#166534",
      fontWeight: 800,
      fontSize: 12,
    } as const;
  }
  if (state === "active") {
    return {
      padding: "6px 10px",
      borderRadius: 999,
      background: "#dbeafe",
      color: "#1d4ed8",
      fontWeight: 800,
      fontSize: 12,
    } as const;
  }
  return {
    padding: "6px 10px",
    borderRadius: 999,
    background: "#f1f5f9",
    color: "#475569",
    fontWeight: 700,
    fontSize: 12,
  } as const;
}

export default async function ContractSignPage({
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
  const contract = await getStudentContractBySignToken(token);

  if (!contract) {
    return (
      <div style={{ maxWidth: 960, margin: "40px auto", padding: "0 16px", display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0 }}>Contract Link Unavailable / 合同链接不可用</h1>
        <div style={{ color: "#475569" }}>
          This signing link is not available. Please contact the school team for a fresh contract link.
        </div>
      </div>
    );
  }

  if (contract.status === "EXPIRED") {
    return (
      <div style={{ maxWidth: 960, margin: "40px auto", padding: "0 16px", display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0 }}>Link Expired / 链接已过期</h1>
        <div style={{ color: "#475569" }}>
          This contract signing link has expired. Please ask the school team to resend it.
        </div>
      </div>
    );
  }

  if (contract.status === "VOID") {
    return (
      <div style={{ maxWidth: 960, margin: "40px auto", padding: "0 16px", display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0 }}>Contract Closed / 合同已关闭</h1>
        <div style={{ color: "#475569" }}>
          This contract is no longer active. Please contact the school team if a new one is needed.
        </div>
      </div>
    );
  }

  if (contract.status === "SIGNED" || contract.status === "INVOICE_CREATED") {
    return (
      <div style={{ maxWidth: 960, margin: "40px auto", padding: "0 16px", display: "grid", gap: 16 }}>
        <div style={{ ...cardStyle("#ecfdf3"), borderColor: "#86efac" }}>
          <h1 style={{ margin: 0 }}>Contract Signed / 合同已完成签署</h1>
          <div style={{ color: "#166534" }}>
            Thank you. The tuition agreement has been signed successfully and the invoice draft has been prepared for the school team.
            / 感谢您，学费协议已经签署完成，系统也已为校方准备好对应发票草稿。
          </div>
          {contract.invoiceNo ? <div style={{ color: "#166534" }}>Invoice / 发票: {contract.invoiceNo}</div> : null}
          <div
            style={{
              border: "1px solid #bbf7d0",
              borderRadius: 14,
              background: "#f0fdf4",
              padding: 14,
              display: "grid",
              gap: 8,
              maxWidth: 360,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#166534" }}>Signature / 签名</div>
            {contract.signatureImagePath ? (
              <img
                src={contract.signatureImagePath}
                alt="Contract signature"
                style={{ maxWidth: 240, maxHeight: 72, objectFit: "contain" }}
              />
            ) : (
              <div style={{ fontWeight: 800, fontSize: 22, color: "#1d4ed8", lineHeight: 1.1 }}>
                {contract.signerName || "Signature on file"}
              </div>
            )}
          </div>
          <div>
            <a href={`/api/exports/student-contract/${encodeURIComponent(contract.id)}?token=${encodeURIComponent(token)}&download=1`}>
              Download signed PDF / 下载已签署合同 PDF
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (contract.status !== "READY_TO_SIGN" || !contract.contractSnapshot) {
    return (
      <div style={{ maxWidth: 960, margin: "40px auto", padding: "0 16px", display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0 }}>Contract Not Ready / 合同尚未准备完成</h1>
        <div style={{ color: "#475569" }}>
          The school is still preparing the final contract. Please wait for the signing link after the lesson hours and fee details are confirmed.
        </div>
      </div>
    );
  }

  await markStudentContractSignViewed(contract.id);

  async function signAction(formData: FormData) {
    "use server";
    const tokenValue = String(formData.get("token") ?? "").trim();
    const signerName = String(formData.get("signerName") ?? "").trim();
    const signerEmail = String(formData.get("signerEmail") ?? "").trim();
    const signerPhone = String(formData.get("signerPhone") ?? "").trim();
    const signatureDataUrl = String(formData.get("signatureDataUrl") ?? "").trim();

    if (!tokenValue || !signerName) {
      redirect(`${buildStudentContractSignPath(token)}?err=missing`);
    }

    try {
      const next = await signStudentContract({
        token: tokenValue,
        signerName,
        signerEmail: signerEmail || null,
        signerPhone: signerPhone || null,
        signatureDataUrl,
        signerIp: null,
      });
      revalidatePath(buildStudentContractSignPath(tokenValue));
      revalidatePath(`/api/exports/student-contract/${next.id}`);
      redirect(`${buildStudentContractSignPath(tokenValue)}?msg=signed&contractId=${encodeURIComponent(next.id)}`);
    } catch (error) {
      if (isNextRedirectError(error)) throw error;
      const message = error instanceof Error ? error.message : "sign";
      redirect(`${buildStudentContractSignPath(tokenValue)}?err=${encodeURIComponent(message)}`);
    }
  }

  const parentInfo = contract.parentInfo;
  const snapshot = contract.contractSnapshot;

  return (
    <div style={{ maxWidth: 1040, margin: "32px auto 48px", padding: "0 16px", display: "grid", gap: 18 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 38, lineHeight: 1.05 }}>Tuition Agreement / 学费协议</h1>
        <div style={{ color: "#475569", fontSize: 16, lineHeight: 1.6 }}>
          Please review the agreement below and sign electronically if everything is correct. Once signed, the system will create the matching invoice draft automatically.
          / 请先阅读以下正式合同，确认无误后再进行电子签字。签字完成后，系统会自动生成对应发票草稿。
        </div>
      </div>

      <div style={{ ...cardStyle("#ffffff"), gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <div style={stepPillStyle("done")}>1. Parent profile / 家长资料</div>
        <div style={stepPillStyle("done")}>2. Contract prepared / 合同已准备</div>
        <div style={stepPillStyle("active")}>3. Parent signs / 家长签字</div>
      </div>

      {err ? (
        <div style={{ ...cardStyle("#fff7ed"), borderColor: "#fdba74", color: "#9a3412" }}>
          {err.toLowerCase().includes("signature")
            ? "请先完成手写签名，再提交正式合同。 / Please draw the handwritten signature before submitting the final contract."
            : "请补全签署资料并完成手写签名。 / Please complete the signing details and handwritten signature."}
        </div>
      ) : null}
      {msg === "ready" ? (
        <div style={{ ...cardStyle("#eff6ff"), borderColor: "#93c5fd", color: "#1d4ed8" }}>
          正式合同已准备完成，请核对后签署。签字完成后会自动生成发票草稿。 / The final contract is ready. Please review and sign. The invoice draft will be created automatically after signing.
        </div>
      ) : null}
      {msg === "signed" ? (
        <div style={{ ...cardStyle("#ecfdf3"), borderColor: "#86efac", color: "#166534" }}>
          签署已提交成功，系统正在显示最终结果。若下方还没有切换到已签状态，请刷新一次页面。 / Signature submitted successfully. The final signed result is loading now. If the status below has not switched yet, refresh once.
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
            <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Agreement date / 协议日期</div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{snapshot.agreementDateLabel}</div>
          </div>
        </div>
      </div>

      <details style={{ ...cardStyle("#ffffff"), gap: 16 }} open>
        <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: 18 }}>
          Agreement preview / 正式合同预览
        </summary>
        <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.6 }}>
          {`Summary first, full contract below. / 先看摘要，再展开阅读完整合同。`}
        </div>
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 22,
            background: "#fff",
            lineHeight: 1.7,
            color: "#0f172a",
          }}
          dangerouslySetInnerHTML={{ __html: snapshot.agreementHtml }}
        />
      </details>

      <form action={signAction} style={{ ...cardStyle("#ffffff"), gap: 16 }}>
        <input type="hidden" name="token" value={token} />
        <div style={{ fontWeight: 800, fontSize: 18 }}>Electronic Signature / 电子签字</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          <label style={fieldLabelStyle()}>
            Signer name / 签署人姓名 *
            <input name="signerName" defaultValue={parentInfo?.parentFullNameEn ?? ""} style={{ width: "100%", padding: "10px 12px" }} />
          </label>
          <label style={fieldLabelStyle()}>
            Email / 邮箱
            <input name="signerEmail" type="email" defaultValue={parentInfo?.email ?? ""} style={{ width: "100%", padding: "10px 12px" }} />
          </label>
          <label style={fieldLabelStyle()}>
            Mobile / 手机
            <input name="signerPhone" defaultValue={parentInfo?.phone ?? ""} style={{ width: "100%", padding: "10px 12px" }} />
          </label>
        </div>

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "#334155" }}>
          <input type="checkbox" name="agreementConfirm" value="yes" required />
          I have read and understood the tuition agreement and agree to sign it electronically.
          / 我已阅读并理解本学费协议，并同意以电子方式签署。
        </label>

        <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
          {`After signing / 签字后:`} {`The school team will receive a signed PDF and the matching invoice draft automatically. / 系统会自动生成已签 PDF，并给校方准备对应的发票草稿。`}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Signature / 签名 *</div>
          <ContractSignaturePad />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <a href={`/api/exports/student-contract/${encodeURIComponent(contract.id)}?token=${encodeURIComponent(token)}`}>
            Preview PDF / 预览 PDF
          </a>
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
            Sign contract / 签署合同
          </button>
        </div>
      </form>
    </div>
  );
}
