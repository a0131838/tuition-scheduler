import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ContractSignaturePad from "@/app/contract/_components/ContractSignaturePad";
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

function gradeLabel(item: { grade: string | null; equivalentLevel?: string | null }) {
  if (item.grade && item.equivalentLevel) return `${item.grade} (${item.equivalentLevel})`;
  return item.grade ?? item.equivalentLevel ?? null;
}

function isNextRedirectError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

const agreementSections = [
  {
    title: "3. Appointment and Scope / 委任及服务范围",
    paragraphs: [
      "The Parent appoints the Agency to provide school application support services for the student(s) listed in this Agreement only, and strictly within the number of schools and service scope specified above. / 家长委任机构仅就本协议列明之学生提供学校申请支持服务，且严格限于上文所列学校数量及服务范围。",
      "No services are included for any other child, school, programme, scholarship application, appeal, relocation matter, visa matter, pass application, guardianship matter, or immigration matter unless separately agreed in writing. / 除非双方另有书面约定，本协议不包括任何其他孩子、学校、课程、奖学金申请、申诉、搬迁事务、签证事务、准证申请、监护安排或移民事务。",
      "The Agency is an independent service provider engaged by the Parent to provide application support services. The Agency is not the school, is not part of the school, and does not have authority to make admissions decisions on behalf of any school. / 机构系由家长聘请之独立服务提供方，仅提供申请支持服务。机构并非学校本身，亦非学校组成部分，且无权代表任何学校作出录取决定。",
    ],
  },
  {
    title: "4. Services / 服务内容",
    paragraphs: [
      "Services may include preliminary consultation, application planning, timeline management, document checklist preparation, administrative review and formatting support, communication with schools, authorised submission support, reasonable progress follow-up, and where applicable, interview or assessment arrangement support. / 服务可包括初步咨询、申请规划、时间线管理、材料清单准备、行政审核及格式整理支持、与学校沟通、经授权之递交支持、合理进度跟进，以及在适用情况下之面试或评估安排支持。",
      "Unless otherwise agreed in writing, the service scope is limited to the number of schools and school names listed in this Agreement. Additional schools, appeals, urgent work, or new application rounds may be charged separately. / 除非双方另有书面约定，本服务范围仅限于本协议列明的学校数量及学校名单。额外学校、申诉、加急处理或新的申请轮次可另行收费。",
      "The Agency provides application support and coordination services only and does not provide legal, immigration, tax, medical, psychological assessment, or regulated educational counselling advice unless separately agreed in writing. / 机构仅提供申请支持及协调服务；除非另有书面约定，不提供法律、移民、税务、医疗、心理评估或受监管教育咨询意见。",
    ],
  },
  {
    title: "5. No Guarantee of Outcome / 不保证申请结果",
    paragraphs: [
      "All admissions decisions are made solely by the relevant school. The Agency does not guarantee admission, assessment opportunities, waitlist priority, school response time, or a successful application outcome. / 所有录取决定均由相关学校独立作出。机构不保证录取、评估机会、候补优先级、学校回复时间或申请成功结果。",
      "For refund purposes, an offer may still be regarded as a successful outcome even if it is conditional, deferred to the next intake, or made by way of a waitlist place. / 就退款政策而言，即使录取机会附有条件、安排至下一 intake，或以候补名单方式提供，仍可视为成功结果。",
    ],
  },
  {
    title: "6. Parent's Responsibilities / 家长责任",
    paragraphs: [
      "The Parent represents that the Parent is lawfully authorised to act for the student(s) and provide their personal data and application materials. / 家长声明其有合法权限代表学生行事，并有权提供相关个人资料及申请材料。",
      "The Parent shall provide complete, accurate, and truthful information and documents in a timely manner, and shall ensure that school records, identification documents, references, academic documents, and statements are authentic and not misleading. / 家长须及时提供完整、准确及真实的信息和文件，并确保在校记录、身份证明文件、推荐材料、学术文件及陈述真实且不具误导性。",
      "The Parent shall review and approve final application materials before submission unless written authority is given to the Agency to submit on the Parent's behalf. / 除非已书面授权机构代为递交，否则家长须在递交前审核并批准最终申请材料。",
      "The Parent shall comply with each school's requirements, deadlines, and policies, and shall pay all third-party charges unless expressly agreed otherwise in writing. / 家长须遵守各学校要求、截止日期及政策，并支付第三方费用，除非双方另有书面明确约定。",
    ],
  },
  {
    title: "7. Service Fee and Payment / 服务费及付款方式",
    paragraphs: [
      "The Service Fee and invoice total shall be the amounts stated in this Agreement. Unless otherwise stated in writing, the Service Fee is payable in full upfront upon signing. / 服务费及发票总额以本协议列明金额为准。除非另有书面说明，服务费须于签署本协议时一次性全额预付。",
      "Unless expressly stated otherwise, the Service Fee does not include school fees, testing fees, medical fees, translation fees, courier costs, notarisation charges, government charges, or third-party disbursements. / 除非另有明确说明，服务费不包括学校费用、考试费用、医疗费用、翻译费用、快递费用、公证费用、政府收费或第三方代垫费用。",
    ],
  },
  {
    title: "8. Refund Policy / 退款政策",
    paragraphs: [
      "The applicable refund policy is determined by the package selected and Appendix A. No refund is payable where an offer regarded as successful is obtained but rejected by the Parent or student. / 适用退款政策根据所选套餐及附录 A 确定。如已获得被视为成功的录取机会但家长或学生拒绝，机构无需退款。",
      "1 school / 1 pax and 2-3 schools / 1 pax packages are non-refundable. For 4-5 schools / 1 pax, 50% of the service fee is refundable only if all applications fail. / 1 所学校及 2-3 所学校套餐不退款。4-5 所学校套餐仅在全部申请失败时退还服务费的 50%。",
    ],
  },
  {
    title: "9. Additional Services and Scope Changes / 额外服务及范围变更",
    paragraphs: [
      "Any work outside the agreed scope shall be charged separately and carried out only if agreed in writing. / 超出本协议约定范围之工作均须另行收费，且仅在双方书面同意后进行。",
      "Additional chargeable work may include extra school applications, appeal letters, substantial rewriting, urgent work, translation or notarisation coordination, relocation support, visa or pass support, or additional meetings. / 额外收费项目可包括额外学校申请、申诉信、大幅重写、加急处理、翻译或公证协调、搬迁支持、签证或准证支持，或额外会议。",
    ],
  },
  {
    title: "10. Personal Data Protection and Confidentiality / 个人资料保护及保密",
    paragraphs: [
      "The Parent consents to the Agency collecting, using, disclosing, and processing personal data for providing the services, preparing and submitting applications, communicating with schools, and maintaining records. / 家长同意机构为提供服务、准备及提交申请、与学校沟通及保存记录之目的处理个人资料。",
      "The Agency shall make reasonable security arrangements to protect personal data, and the Parent acknowledges that service performance may require disclosure or transfer of data to schools, admissions systems, cloud platforms, email providers, and service providers. / 机构应采取合理安全措施保护个人资料；家长知悉服务履行可能需向学校、招生系统、云平台、邮件服务商及服务方披露或转移资料。",
      "Each Party shall keep confidential all non-public information received from the other Party except where disclosure is required for the services, by law, or with consent. / 除为履行服务、法律要求或经同意外，双方均应对对方非公开信息保密。",
    ],
  },
  {
    title: "11. Communications and Authority / 沟通及授权",
    paragraphs: [
      "The Parent authorises the Agency to communicate with relevant schools to clarify requirements, follow up submissions, and facilitate the application process. / 家长授权机构与相关学校沟通，以澄清申请要求、跟进递交情况并协助推进申请流程。",
      "The Agency shall not knowingly submit false, misleading, or materially inaccurate information. The Parent remains ultimately responsible for truthfulness, completeness, and final approval of application information and documents. / 机构不得明知而提交虚假、误导性或重大失实信息。申请信息及文件之真实性、完整性及最终批准责任仍由家长承担。",
    ],
  },
  {
    title: "12. Term and Termination / 协议期限及终止",
    paragraphs: [
      "This Agreement takes effect on signing and continues until completion of the services, expiry of the stated package scope, or termination under this Agreement. / 本协议自签署之日起生效，并持续至服务完成、套餐范围届满或依协议终止。",
      "Either Party may terminate by written notice if the other Party commits a material breach and fails to remedy it within 7 days. The Agency may suspend or terminate immediately for non-payment, false or materially incomplete information, abusive or unreasonable behaviour, or legal, regulatory, or reputational risk. / 如一方严重违约且 7 日内未补救，另一方可书面终止。若家长未付款、提供虚假或重大不完整信息、行为明显不合理，或继续履行可能带来法律、监管或声誉风险，机构可立即暂停或终止服务。",
    ],
  },
  {
    title: "13. Limitation of Liability / 责任限制",
    paragraphs: [
      "To the fullest extent permitted by law, the Agency shall not be liable for indirect, incidental, special, or consequential loss, including loss of opportunity, emotional distress, or reputational harm. / 在法律允许的最大范围内，机构不对间接性、附带性、特殊性或后果性损失承担责任，包括机会损失、精神困扰或声誉损害。",
      "The Agency shall not be liable for acts, omissions, decisions, delays, system failures, or policies of any school or third party. If liable, the Agency's total aggregate liability shall not exceed the Service Fee actually paid. / 机构不对学校或第三方行为、不作为、决定、延误、系统故障或政策承担责任。如机构被认定承担责任，责任总额以实际支付服务费为上限。",
    ],
  },
  {
    title: "14. Dispute Resolution, Governing Law, and General / 争议解决、适用法律及一般条款",
    paragraphs: [
      "The Parties shall first attempt in good faith to resolve disputes through discussion and negotiation. If unresolved, either Party may refer the matter to mediation in Singapore. / 双方应先诚信协商解决争议；如未能解决，任何一方可提交新加坡调解。",
      "This Agreement is governed by Singapore law, and the Parties submit to the non-exclusive jurisdiction of Singapore courts. / 本协议受新加坡法律管辖，双方接受新加坡法院非专属管辖。",
      "This Agreement constitutes the entire agreement. Amendments must be in writing and signed by both Parties. If any provision is invalid, the remaining provisions continue in force. / 本协议构成完整协议。任何修改须以书面作出并由双方签署。如任何条款无效，其余条款继续有效。",
      "In the event of inconsistency between English and Chinese versions, the English version shall prevail. / 如中英文版本有任何不一致之处，以英文版本为准。",
    ],
  },
];

async function signAction(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "").trim();
  const signerName = String(formData.get("signerName") ?? "").trim();
  const signerEmail = String(formData.get("signerEmail") ?? "").trim();
  const signerPhone = String(formData.get("signerPhone") ?? "").trim();
  const signatureDataUrl = String(formData.get("signatureDataUrl") ?? "").trim();
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  try {
    const next = await signSchoolApplication({
      signToken: token,
      signerName,
      signerEmail,
      signerPhone,
      signerIp: ip,
      signatureDataUrl,
    });
    redirect(`${buildSchoolApplicationSignPath(token)}?msg=signed&applicationId=${encodeURIComponent(next.id)}`);
  } catch (e) {
    if (isNextRedirectError(e)) throw e;
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
                    {["School", "Programme / School Grade / Intake", "Service Fee", "Official Fee", "Notes"].map((x) => (
                      <th key={x} style={{ border: "1px solid #dbeafe", padding: 8, textAlign: "left" }}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {snapshot.items.map((item, index) => (
                    <tr key={`${item.schoolName}-${index}`}>
                      <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>{item.schoolName}</td>
                      <td style={{ border: "1px solid #e5e7eb", padding: 8 }}>{[item.programme, gradeLabel(item), item.intake].filter(Boolean).join(" / ") || "-"}</td>
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
              {app.signatureImagePath ? (
                <div style={{ display: "grid", gap: 6, maxWidth: 340 }}>
                  <strong>Signature / 签名</strong>
                  <img src={app.signatureImagePath} alt="School application signature" style={{ maxWidth: 260, maxHeight: 90, objectFit: "contain", border: "1px solid #bbf7d0", borderRadius: 10, background: "#fff" }} />
                </div>
              ) : null}
              <a href={`/api/exports/school-application/${encodeURIComponent(app.id)}`} target="_blank" rel="noreferrer">Open signed PDF / 打开已签 PDF</a>
            </section>
          ) : expired ? (
            <section style={cardStyle("#fff1f2")}>
              <h2 style={{ margin: 0 }}>Link expired / 链接已过期</h2>
              <div>Please contact the school team for a fresh signing link.</div>
            </section>
          ) : (
            <>
            <section style={cardStyle()}>
              <h2 style={{ margin: 0 }}>Full Agreement / 完整合同</h2>
              <div style={{ color: "#475569", lineHeight: 1.6 }}>
                Please review the full service agreement before signing. / 请先阅读完整服务协议后再签署。
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {agreementSections.map((section) => (
                  <section key={section.title} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, display: "grid", gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 16 }}>{section.title}</h3>
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph} style={{ margin: 0, color: "#334155", lineHeight: 1.7 }}>{paragraph}</p>
                    ))}
                  </section>
                ))}
                {snapshot.note ? (
                  <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, display: "grid", gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 16 }}>Special Notes / 特别备注</h3>
                    <p style={{ margin: 0, color: "#334155", lineHeight: 1.7 }}>{snapshot.note}</p>
                  </section>
                ) : null}
              </div>
              <a href={`/api/exports/school-application/${encodeURIComponent(app.id)}`} target="_blank" rel="noreferrer">
                Preview agreement PDF / 预览合同 PDF
              </a>
            </section>

            <section style={cardStyle()}>
              <h2 style={{ margin: 0 }}>Electronic Signature / 电子签字</h2>
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
                  <span>I have read the full School Application Support Services Agreement above and agree to sign it electronically. / 我已阅读上方完整学校申请支持服务协议，并同意以电子方式签署。</span>
                </label>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 800 }}>Handwritten signature / 手写签名 *</div>
                  <ContractSignaturePad height={170} />
                </div>
                <button type="submit" style={{ padding: "11px 16px", borderRadius: 10, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", fontWeight: 900 }}>
                  Sign agreement / 签署协议
                </button>
              </form>
            </section>
            </>
          )}
        </>
      )}
    </main>
  );
}
