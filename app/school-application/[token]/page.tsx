import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  buildSchoolApplicationSignPath,
  getSchoolApplicationBySignToken,
  markSchoolApplicationSignViewed,
  signSchoolApplication,
} from "@/lib/school-application";

function money(value: number) {
  return `SGD ${Number(value || 0).toFixed(2)}`;
}

function cardStyle(bg = "#fff") {
  return { border: "1px solid #dbeafe", borderRadius: 16, background: bg, padding: 18, display: "grid", gap: 12 };
}

function inputStyle() {
  return { padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 10, width: "100%" };
}

async function signAction(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "").trim();
  const signerName = String(formData.get("signerName") ?? "").trim();
  const signerEmail = String(formData.get("signerEmail") ?? "").trim();
  const signerPhone = String(formData.get("signerPhone") ?? "").trim();
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  try {
    const next = await signSchoolApplication({
      signToken: token,
      signerName,
      signerEmail,
      signerPhone,
      signerIp: ip,
    });
    redirect(`${buildSchoolApplicationSignPath(token)}?msg=signed&applicationId=${encodeURIComponent(next.id)}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sign failed";
    redirect(`${buildSchoolApplicationSignPath(token)}?err=${encodeURIComponent(msg)}`);
  }
}

export default async function SchoolApplicationSignPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ msg?: string; err?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const app = await getSchoolApplicationBySignToken(token);
  if (!app) {
    return (
      <main style={{ padding: 32, maxWidth: 920, margin: "0 auto" }}>
        <div style={cardStyle("#fff1f2")}>
          <h1>School application sign link unavailable / 学校申请签字链接不可用</h1>
          <p>Please contact the school team for a fresh link.</p>
        </div>
      </main>
    );
  }
  if (app.status === "READY_TO_SIGN") await markSchoolApplicationSignViewed(app.id);
  const snapshot = app.contractSnapshot;
  const signed = app.status === "INVOICE_CREATED" || app.status === "SIGNED";
  const expired = app.signExpiresAt ? app.signExpiresAt.getTime() < Date.now() : false;

  return (
    <main style={{ padding: 24, maxWidth: 980, margin: "0 auto", display: "grid", gap: 16 }}>
      <div style={cardStyle("#f8fbff")}>
        <div style={{ color: "#2563eb", fontWeight: 800, fontSize: 13 }}>GT Educational Institute Pte Ltd</div>
        <h1 style={{ margin: 0, fontSize: 30 }}>School Application Support Services Agreement</h1>
        <div style={{ color: "#475569" }}>学校申请支持服务协议</div>
        {sp?.msg === "signed" ? <div style={{ color: "#166534", fontWeight: 800 }}>Signed successfully / 已签署完成</div> : null}
        {sp?.err ? <div style={{ color: "#b91c1c", fontWeight: 800 }}>{decodeURIComponent(sp.err)}</div> : null}
      </div>

      {!snapshot ? (
        <div style={cardStyle("#fff7ed")}>This agreement is not ready yet. Please contact the school team.</div>
      ) : (
        <>
          <section style={cardStyle()}>
            <h2 style={{ margin: 0 }}>Parent and Student / 家长与学生</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <div><strong>Parent / 家长</strong><br />{snapshot.parentName}</div>
              <div><strong>Student / 学生</strong><br />{snapshot.studentName}</div>
              <div><strong>Date / 日期</strong><br />{snapshot.agreementDate}</div>
              <div><strong>Total / 总额</strong><br />{money(snapshot.totalAmount)}</div>
            </div>
          </section>

          <section style={cardStyle()}>
            <h2 style={{ margin: 0 }}>Application Schools and Fees / 申请学校及费用</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#eff6ff" }}>
                    {["School", "Programme / Grade / Intake", "Service Fee", "Official Fee", "Notes"].map((x) => (
                      <th key={x} style={{ border: "1px solid #dbeafe", padding: 8, textAlign: "left" }}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {snapshot.items.map((item, index) => (
                    <tr key={`${item.schoolName}-${index}`}>
                      <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>{item.schoolName}</td>
                      <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>{[item.programme, item.grade, item.intake].filter(Boolean).join(" / ") || "-"}</td>
                      <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>{money(item.serviceFee)}</td>
                      <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>{money(item.officialFee)}<br />{item.officialFeeMode ?? ""}</td>
                      <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>{item.notes ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={cardStyle("#fff7ed")}>
            <h2 style={{ margin: 0 }}>Important Terms / 重要条款</h2>
            <ul style={{ margin: "0 0 0 20px", lineHeight: 1.7 }}>
              <li>The Agency provides application support only and does not guarantee admission or school response time.</li>
              <li>1-3 schools / 1 pax: no refund.</li>
              <li>4-5 schools / 1 pax: 50% refund only if all applications fail.</li>
              <li>Conditional offer, next-intake offer, and waitlist place count as successful offers for refund purposes.</li>
              <li>家长须提供真实、完整、及时的资料，并确认最终申请材料。</li>
            </ul>
          </section>

          {signed ? (
            <section style={cardStyle("#f0fdf4")}>
              <h2 style={{ margin: 0 }}>Signed / 已签署</h2>
              <div>Invoice / 发票: {app.invoiceNo ?? "-"}</div>
              <a href={`/api/exports/school-application/${encodeURIComponent(app.id)}`} target="_blank" rel="noreferrer">Open signed PDF / 打开已签 PDF</a>
            </section>
          ) : expired ? (
            <section style={cardStyle("#fff1f2")}>
              <h2 style={{ margin: 0 }}>Link expired / 链接已过期</h2>
              <div>Please contact the school team for a fresh signing link.</div>
            </section>
          ) : (
            <section style={cardStyle()}>
              <h2 style={{ margin: 0 }}>Sign / 签署</h2>
              <form action={signAction} style={{ display: "grid", gap: 12 }}>
                <input type="hidden" name="token" value={token} />
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 800 }}>Signer name / 签署人姓名</span>
                  <input name="signerName" defaultValue={snapshot.parentName} required style={inputStyle()} />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 800 }}>Email / 邮箱</span>
                  <input name="signerEmail" defaultValue={snapshot.parentEmail ?? ""} style={inputStyle()} />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 800 }}>Phone / 电话</span>
                  <input name="signerPhone" defaultValue={snapshot.parentPhone ?? ""} style={inputStyle()} />
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <input type="checkbox" required />
                  <span>I have read and agree to this School Application Support Services Agreement. / 我已阅读并同意本学校申请支持服务协议。</span>
                </label>
                <button type="submit" style={{ padding: "11px 16px", borderRadius: 10, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", fontWeight: 900 }}>
                  Sign agreement / 签署协议
                </button>
              </form>
            </section>
          )}
        </>
      )}
    </main>
  );
}
