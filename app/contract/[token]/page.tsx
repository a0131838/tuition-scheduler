import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Image from "next/image";
import ContractSignaturePad from "@/app/contract/_components/ContractSignaturePad";
import {
  buildStudentContractSignPath,
  getStudentContractBySignToken,
  markStudentContractSignViewed,
  signStudentContract,
} from "@/lib/student-contract";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Full Care Service Agreement | GT Educational Institute" };

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
    const includesCare = Boolean(contract.contractSnapshot?.care?.included);
    const snapshot = contract.contractSnapshot;
    const care = snapshot?.care;
    const totalFee = Number(snapshot?.package.feeAmount || 0);
    const packageHours = care?.packageHours ?? Number(snapshot?.package.totalMinutes || 0) / 60;
    const money = (value: unknown) => `SGD ${Number(value || 0).toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return (
      <main style={{ minHeight: "100vh", background: "linear-gradient(180deg, #f1f7f4 0, #f8faf9 360px, #fff 100%)", color: "#17211d", padding: "24px 16px 56px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 18 }}>
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <Image src="/logo.png" alt="GT Educational Institute" width={150} height={48} style={{ width: 150, height: "auto" }} priority />
            <div style={{ color: "#52605a", fontSize: 13, fontWeight: 700 }}>Secure signed record / 安全签署凭证</div>
          </header>

          <section style={{ border: "1px solid #b6d8c7", borderRadius: 20, background: "rgba(255,255,255,.94)", padding: "clamp(22px, 5vw, 42px)", boxShadow: "0 18px 50px rgba(30,70,52,.09)", display: "grid", gap: 22 }}>
            <div style={{ display: "grid", gap: 10 }}>
              <span style={{ width: "fit-content", borderRadius: 999, background: "#e7f5ed", color: "#12613f", padding: "7px 11px", fontSize: 12, fontWeight: 850 }}>✓ Signed and recorded / 已签署并留档</span>
              <h1 style={{ margin: 0, fontSize: "clamp(30px, 5vw, 44px)", lineHeight: 1.08, letterSpacing: "-.025em" }}>{includesCare ? "Full Care Service Agreement" : "Tuition Agreement"}</h1>
              <div style={{ color: "#52605a", fontSize: 17 }}>{includesCare ? "全程托管服务合同已签署" : "学费协议已签署"}</div>
              <p style={{ margin: 0, maxWidth: 720, color: "#425149", lineHeight: 1.65 }}>
                {includesCare
                  ? "Thank you for your trust. The signed agreement, service term, lesson entitlement and delivery rhythm are confirmed below. / 感谢您的信任。已签合同、服务周期、课时权益和交付节奏已在下方确认。"
                  : "Thank you. The signed agreement is now on record. / 感谢您，合同已完成签署并留档。"}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", borderTop: "1px solid #e0e8e4", borderBottom: "1px solid #e0e8e4" }}>
              <div style={{ padding: "18px 14px 18px 0", display: "grid", gap: 5 }}><span style={{ color: "#6b7771", fontSize: 12, fontWeight: 700 }}>Student / 学生</span><strong style={{ fontSize: 20 }}>{contract.studentName}</strong></div>
              <div style={{ padding: "18px 14px", display: "grid", gap: 5 }}><span style={{ color: "#6b7771", fontSize: 12, fontWeight: 700 }}>Signer / 签署人</span><strong style={{ fontSize: 20 }}>{contract.signerName || "Signature on file"}</strong></div>
              <div style={{ padding: "18px 0 18px 14px", display: "grid", gap: 5 }}><span style={{ color: "#6b7771", fontSize: 12, fontWeight: 700 }}>Invoice / 发票</span><strong style={{ fontSize: 18 }}>{contract.invoiceNo || "Being prepared / 准备中"}</strong></div>
            </div>

            {includesCare && snapshot && care ? <>
              <div style={{ display: "grid", gap: 12 }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>Your confirmed plan / 您已确认的方案</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
                  <div style={cardStyle("#f7faf8")}><span style={{ color: "#66736d", fontSize: 12, fontWeight: 700 }}>Full Care programme / 托管方案</span><strong>{care.programLabel || "Full Care / 全程托管"}</strong><span style={{ color: "#52605a", fontSize: 13 }}>{care.courseTier === "IB_AP" ? "IB/AP tuition tier / IB/AP课程价格档" : "Standard tuition tier / 标准课程价格档"}</span></div>
                  <div style={cardStyle("#f7faf8")}><span style={{ color: "#66736d", fontSize: 12, fontWeight: 700 }}>Lesson entitlement / 课时权益</span><strong style={{ fontSize: 25 }}>{packageHours} hours / 小时</strong><span style={{ color: "#52605a", fontSize: 13 }}>Tuition {money(care.tuitionFeeAmount)} · Care {money(care.careServiceFeeAmount)}</span></div>
                  <div style={{ ...cardStyle("#edf8f2"), borderColor: "#a8d6bf" }}><span style={{ color: "#12613f", fontSize: 12, fontWeight: 750 }}>One-time total / 一次性付款总额</span><strong style={{ color: "#0f553a", fontSize: 27 }}>{money(totalFee)}</strong>{Number(care.bundleSavingsAmount || 0) > 0 ? <span style={{ color: "#12613f", fontSize: 13 }}>Bundle savings / 整包优惠 {money(care.bundleSavingsAmount)}</span> : null}{Number(care.specialDiscountAmount || 0) > 0 ? <span style={{ color: "#12613f", fontSize: 13 }}>Approved additional discount / 获批额外优惠 {money(care.specialDiscountAmount)}</span> : null}</div>
                  <div style={cardStyle("#f7faf8")}><span style={{ color: "#66736d", fontSize: 12, fontWeight: 700 }}>Service period / 服务周期</span><strong>{care.serviceStartDateIso || "-"} — {care.serviceEndDateIso || "-"}</strong><span style={{ color: "#52605a", fontSize: 13 }}>{care.updateCadence || "Weekly service review / 每周服务复核"}<br />{care.reportCadence || "Monthly formal report / 每月正式报告"}</span></div>
                </div>
              </div>

              <div style={{ ...cardStyle("#fff"), padding: 20 }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>What happens next / 接下来会发生什么</h2>
                <div style={{ display: "grid", gap: 14 }}>
                  {["1. Your dedicated service team confirms the launch checklist and ownership. / 专属服务团队确认启动清单与负责人。", "2. Routine progress is shared through the parent miniapp and designated company WeChat. / 日常进展通过家长小程序及公司指定微信同步。", "3. A reviewed formal report is delivered monthly, with actions and risks followed through. / 每月交付经审核的正式报告，并闭环行动与风险。"].map((item) => <div key={item} style={{ display: "flex", gap: 11, alignItems: "flex-start", lineHeight: 1.55 }}><span style={{ width: 8, height: 8, flex: "0 0 auto", marginTop: 8, borderRadius: 999, background: "#146c4b" }} />{item}</div>)}
                </div>
              </div>
            </> : null}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
              <div style={{ color: "#52605a", fontSize: 13, lineHeight: 1.55 }}>Questions? Contact your designated company WeChat or service group. / 如有疑问，请联系公司指定微信或服务群。</div>
              <a href={`/api/exports/student-contract/${encodeURIComponent(contract.id)}?token=${encodeURIComponent(token)}&download=1`} style={{ display: "inline-flex", minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 8, background: "#146c4b", color: "#fff", padding: "11px 17px", fontWeight: 850, textDecoration: "none" }}>
                Download signed PDF / 下载已签合同
              </a>
            </div>
          </section>

          <div style={{ textAlign: "center", color: "#7a867f", fontSize: 12, lineHeight: 1.6 }}>This page contains personal contract information. Please do not forward the link. / 本页面含个人合同信息，请勿转发链接。</div>
        </div>
      </main>
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
        <h1 style={{ margin: 0, fontSize: 38, lineHeight: 1.05 }}>
          {snapshot.care?.included ? "Full Care Service Agreement / 全程托管服务合同" : "Tuition Agreement / 学费协议"}
        </h1>
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
          {snapshot.care?.included ? (
            <>
              <div>
                <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Full Care programme / 托管方案</div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{snapshot.care.programLabel || "Full Care / 全程托管"}</div>
              </div>
              <div>
                <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Fee split / 费用拆分</div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>
                  Tuition SGD {Number(snapshot.care.tuitionFeeAmount || 0).toFixed(2)} · Full Care SGD {Number(snapshot.care.careServiceFeeAmount || 0).toFixed(2)}
                </div>
              </div>
              {snapshot.care.pricingVersion ? (
                <div>
                  <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Hours and bundle discount / 课时与整包优惠</div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>
                    {snapshot.care.packageHours ?? Number(snapshot.package.totalMinutes || 0) / 60} hours · {Math.round(Number(snapshot.care.bundleDiscountRate || 0) * 100)}% off
                  </div>
                  <div style={{ color: "#475569", fontSize: 13 }}>
                    Published SGD {(Number(snapshot.care.tuitionListFeeAmount || 0) + Number(snapshot.care.careListFeeAmount || 0)).toFixed(2)} · Bundle savings SGD {Number(snapshot.care.bundleSavingsAmount || 0).toFixed(2)}
                  </div>
                </div>
              ) : null}
              {Number(snapshot.care.specialDiscountAmount || 0) > 0 ? (
                <div>
                  <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Additional approved discount / 额外批准优惠</div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>SGD {Number(snapshot.care.specialDiscountAmount || 0).toFixed(2)}</div>
                  <div style={{ color: "#475569", fontSize: 13 }}>Management approved / 管理层批准</div>
                </div>
              ) : null}
              <div>
                <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>One-time total / 一次性付款总额</div>
                <div style={{ fontWeight: 900, fontSize: 22 }}>SGD {Number(snapshot.package.feeAmount || 0).toFixed(2)}</div>
              </div>
            </>
          ) : null}
          <div>
            <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>
              {snapshot.care?.included ? "Tuition price tier / 课时价格档" : "Course / 课程"}
            </div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              {snapshot.care?.included ? snapshot.package.courseName : contract.courseName}
            </div>
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
          {snapshot.care?.included
            ? "I have read and understood the Full Care Service Agreement, including its tuition price tier, service scope, exclusions, fees, parent visibility, emergency limits, and data-use purposes, and agree to sign electronically. / 我已阅读并理解《全程托管服务合同》，包括课时价格档、服务范围、排除事项、费用、家长可见范围、紧急边界和资料使用目的，并同意电子签署。"
            : "I have read and understood the tuition agreement and agree to sign it electronically. / 我已阅读并理解本学费协议，并同意以电子方式签署。"}
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
