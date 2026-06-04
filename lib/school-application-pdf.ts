import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { PassThrough } from "stream";
import { setPdfBoldFont, setPdfFont } from "@/lib/pdf-font";

type PDFDoc = InstanceType<typeof PDFDocument>;

export type SchoolApplicationSnapshotItem = {
  schoolName: string;
  programme: string | null;
  grade: string | null;
  equivalentLevel: string | null;
  intake: string | null;
  serviceFee: number;
  officialFee: number;
  officialFeeMode: string | null;
  notes: string | null;
};

export type SchoolApplicationSnapshot = {
  applicationId: string;
  generatedAtIso: string;
  agreementDate: string;
  agencyName: string;
  agencyDetails: string;
  parentName: string;
  parentIdNo: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
  parentAddress: string | null;
  studentName: string;
  studentGrade: string | null;
  studentSchool: string | null;
  items: SchoolApplicationSnapshotItem[];
  serviceHours: number | null;
  serviceFeeAmount: number;
  officialFeeAmount: number;
  addOnFeeAmount: number;
  totalAmount: number;
  billTo: string;
  note: string | null;
  refundPolicyLabel: string;
};

type SignedPdfInput = {
  snapshot: SchoolApplicationSnapshot;
  signerName?: string | null;
  signedAtLabel?: string | null;
  signerIp?: string | null;
  companySeal?: boolean;
};

const DARK = "#0f172a";
const MUTED = "#475569";
const BORDER = "#cbd5e1";
const BLUE = "#2563eb";

function createDoc() {
  return new PDFDocument({ size: "A4", margin: 40 });
}

function streamPdf(doc: PDFDoc) {
  const stream = new PassThrough();
  doc.pipe(stream);
  doc.end();
  return stream;
}

function docToBuffer(doc: PDFDoc) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = streamPdf(doc);
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

function text(doc: PDFDoc, value: string, options: { size?: number; bold?: boolean; color?: string; width?: number; align?: "left" | "center" | "right"; lineGap?: number } = {}) {
  if (options.bold) setPdfBoldFont(doc);
  else setPdfFont(doc);
  doc.fontSize(options.size ?? 9).fillColor(options.color ?? DARK).text(value, {
    width: options.width,
    align: options.align,
    lineGap: options.lineGap ?? 2,
  });
}

function money(value: number) {
  return `SGD ${Number(value || 0).toFixed(2)}`;
}

function valueOrBlank(value: string | number | null | undefined) {
  const textValue = String(value ?? "").trim();
  return textValue || "____________________________";
}

function gradeLabel(item: SchoolApplicationSnapshotItem) {
  if (item.grade && item.equivalentLevel) return `${item.grade} (${item.equivalentLevel})`;
  return item.grade ?? item.equivalentLevel ?? null;
}

function schoolNames(snapshot: SchoolApplicationSnapshot) {
  return snapshot.items.map((item) => item.schoolName).join(", ");
}

function ensureSpace(doc: PDFDoc, height: number) {
  if (doc.y + height > doc.page.height - 48) doc.addPage();
}

function row(doc: PDFDoc, cells: Array<{ text: string; width: number; bold?: boolean }>, y?: number) {
  const startX = doc.x;
  const startY = y ?? doc.y;
  let x = startX;
  const heights = cells.map((cell) => {
    if (cell.bold) setPdfBoldFont(doc);
    else setPdfFont(doc);
    doc.fontSize(8);
    return doc.heightOfString(cell.text, { width: cell.width - 8, lineGap: 1 }) + 10;
  });
  const h = Math.max(22, ...heights);
  cells.forEach((cell) => {
    doc.rect(x, startY, cell.width, h).strokeColor(BORDER).stroke();
    doc.x = x + 4;
    doc.y = startY + 5;
    text(doc, cell.text, { size: 8, bold: cell.bold, width: cell.width - 8, lineGap: 1 });
    x += cell.width;
  });
  doc.x = startX;
  doc.y = startY + h;
}

function sectionTitle(doc: PDFDoc, value: string) {
  ensureSpace(doc, 32);
  doc.moveDown(0.6);
  text(doc, value, { size: 12, bold: true, color: BLUE });
  doc.moveDown(0.25);
}

function para(doc: PDFDoc, english: string, chinese: string) {
  ensureSpace(doc, 42);
  text(doc, english, { width: 515 });
  text(doc, chinese, { width: 515 });
  doc.moveDown(0.35);
}

function drawCompanySeal(doc: PDFDoc, x: number, y: number) {
  const sealPath = path.join(process.cwd(), "public", "gt_edu_seal.png");
  if (!fs.existsSync(sealPath)) return;
  doc.image(sealPath, x, y, { fit: [92, 92], align: "center", valign: "center" });
}

function buildDoc(input: SignedPdfInput, signed: boolean) {
  const { snapshot } = input;
  const doc = createDoc();
  text(doc, "GT Educational Institute Pte Ltd", { size: 15, bold: true, align: "center" });
  text(doc, "SCHOOL APPLICATION SUPPORT SERVICES AGREEMENT", { size: 13, bold: true, align: "center", color: BLUE });
  text(doc, "学校申请支持服务协议", { size: 12, bold: true, align: "center", color: BLUE });
  doc.moveDown();

  sectionTitle(doc, "1. Parties and Basic Information / 双方及基本信息");
  row(doc, [
    { text: "Field / 项目", width: 150, bold: true },
    { text: "Details / 内容", width: 365, bold: true },
  ]);
  row(doc, [
    { text: "Date / 日期", width: 150, bold: true },
    { text: snapshot.agreementDate, width: 365 },
  ]);
  row(doc, [
    { text: "Agency / 机构", width: 150, bold: true },
    { text: `${snapshot.agencyName}\n${snapshot.agencyDetails}`, width: 365 },
  ]);
  row(doc, [
    { text: "Parent's Full Name / 家长姓名", width: 150, bold: true },
    { text: valueOrBlank(snapshot.parentName), width: 365 },
  ]);
  row(doc, [
    { text: "Passport / ID No. / 护照或证件号", width: 150, bold: true },
    { text: valueOrBlank(snapshot.parentIdNo), width: 365 },
  ]);
  row(doc, [
    { text: "Contact Number / 联系电话", width: 150, bold: true },
    { text: valueOrBlank(snapshot.parentPhone), width: 365 },
  ]);
  row(doc, [
    { text: "Email / 电邮", width: 150, bold: true },
    { text: valueOrBlank(snapshot.parentEmail), width: 365 },
  ]);
  row(doc, [
    { text: "Address / 地址", width: 150, bold: true },
    { text: valueOrBlank(snapshot.parentAddress), width: 365 },
  ]);

  sectionTitle(doc, "2. Student and Service Scope / 学生及服务范围");
  row(doc, [
    { text: "Field / 项目", width: 150, bold: true },
    { text: "Details / 内容", width: 365, bold: true },
  ]);
  row(doc, [
    { text: "Student 1 / 学生 1", width: 150, bold: true },
    { text: `Name / 姓名: ${snapshot.studentName}\nGrade / 年级: ${snapshot.studentGrade ?? "-"}\nCurrent school / 目前学校: ${snapshot.studentSchool ?? "-"}`, width: 365 },
  ]);
  row(doc, [
    { text: "Number of Schools / 学校数量", width: 150, bold: true },
    { text: `${snapshot.items.length} school(s)`, width: 365 },
  ]);
  row(doc, [
    { text: "School Names / 学校名称", width: 150, bold: true },
    { text: schoolNames(snapshot), width: 365 },
  ]);
  row(doc, [
    { text: "Service Fee / 服务费", width: 150, bold: true },
    { text: `${money(snapshot.serviceFeeAmount)}\nInvoice total / 发票总额: ${money(snapshot.totalAmount)}\nBill to / 开票对象: ${snapshot.billTo}`, width: 365 },
  ]);

  sectionTitle(doc, "Application School Details / 申请学校明细");
  row(doc, [
    { text: "No.", width: 34, bold: true },
    { text: "School / 学校", width: 120, bold: true },
    { text: "Programme / School Grade / Intake", width: 132, bold: true },
    { text: "Service Fee", width: 78, bold: true },
    { text: "Official Fee", width: 78, bold: true },
    { text: "Notes / 备注", width: 73, bold: true },
  ]);
  snapshot.items.forEach((item, index) => {
    ensureSpace(doc, 40);
    row(doc, [
      { text: String(index + 1), width: 34 },
      { text: item.schoolName, width: 120 },
      { text: [item.programme, gradeLabel(item), item.intake].filter(Boolean).join(" / ") || "-", width: 132 },
      { text: money(item.serviceFee), width: 78 },
      { text: `${money(item.officialFee)}${item.officialFeeMode ? `\n${item.officialFeeMode}` : ""}`, width: 78 },
      { text: item.notes ?? "-", width: 73 },
    ]);
  });
  row(doc, [
    { text: "Total / 合计", width: 286, bold: true },
    { text: money(snapshot.serviceFeeAmount), width: 78, bold: true },
    { text: money(snapshot.officialFeeAmount), width: 78, bold: true },
    { text: `Add-on: ${money(snapshot.addOnFeeAmount)}\nInvoice total: ${money(snapshot.totalAmount)}`, width: 73, bold: true },
  ]);

  sectionTitle(doc, "3. Appointment and Scope / 委任及服务范围");
  para(
    doc,
    "The Parent appoints the Agency to provide school application support services for the student(s) listed in this Agreement only, and strictly within the number of schools and service scope specified above.",
    "家长委任机构仅就本协议列明之学生提供学校申请支持服务，且严格限于上文所列学校数量及服务范围。"
  );
  para(
    doc,
    "No services are included for any other child, school, programme, scholarship application, appeal, relocation matter, visa matter, pass application, guardianship matter, or immigration matter unless separately agreed in writing.",
    "除非双方另有书面约定，本协议不包括任何其他孩子、学校、课程、奖学金申请、申诉、搬迁事务、签证事务、准证申请、监护安排或移民事务。"
  );
  para(
    doc,
    "The Agency is an independent service provider engaged by the Parent to provide application support services. The Agency is not the school, is not part of the school, and does not have authority to make admissions decisions on behalf of any school.",
    "机构系由家长聘请之独立服务提供方，仅提供申请支持服务。机构并非学校本身，亦非学校组成部分，且无权代表任何学校作出录取决定。"
  );

  sectionTitle(doc, "4. Services / 服务内容");
  para(
    doc,
    "Subject to timely cooperation from the Parent, the Agency shall provide services that may include preliminary consultation, application planning, timeline management, document checklist preparation, administrative review and formatting support, communication with schools, authorised submission support, reasonable progress follow-up, and where applicable, interview or assessment arrangement support.",
    "在家长及时配合的前提下，机构将提供之服务可包括初步咨询、申请规划、时间线管理、材料清单准备、行政审核及格式整理支持、与学校沟通、经授权之递交支持、合理进度跟进，以及在适用情况下之面试或评估安排支持。"
  );
  para(
    doc,
    "Unless otherwise agreed in writing, the service scope is limited to the number of schools and school names listed in this Agreement. Additional schools, appeals, urgent work, or new application rounds may be charged separately at the Agency's prevailing rate.",
    "除非双方另有书面约定，本服务范围仅限于本协议列明的学校数量及学校名单。额外学校、申诉、加急处理或新的申请轮次，机构可按其当时适用收费标准另行收费。"
  );
  para(
    doc,
    "The Agency provides application support and coordination services only. The Agency does not provide legal advice, immigration advice, tax advice, medical advice, psychological assessment advice, or regulated educational counselling unless separately agreed in writing.",
    "机构仅提供申请支持及协调服务。除非双方另有书面约定，机构不提供法律意见、移民意见、税务意见、医疗意见、心理评估意见或受监管的教育咨询服务。"
  );

  sectionTitle(doc, "5. No Guarantee of Outcome / 不保证申请结果");
  para(
    doc,
    "All admissions decisions are made solely by the relevant school. The Agency does not guarantee admission, assessment opportunities, waitlist priority, school response time, or a successful application outcome.",
    "所有录取决定均由相关学校独立作出。机构不保证录取、评估机会、候补优先级、学校回复时间或申请成功结果。"
  );
  para(
    doc,
    "For the purposes of the Agency's refund policy, an offer may still be regarded as a successful outcome even if it is conditional, deferred to the next intake, or made by way of a waitlist place, as further stated in Appendix A.",
    "就机构退款政策而言，即使录取机会附有条件、安排至下一 intake，或以候补名单方式提供，仍可视为成功结果，详见附录 A。"
  );

  sectionTitle(doc, "6. Parent's Responsibilities / 家长责任");
  para(
    doc,
    "The Parent represents and warrants that the Parent is lawfully authorised to act for the student(s) under this Agreement and to provide their personal data and application materials for the purposes contemplated by this Agreement.",
    "家长声明并保证，其有合法权限代表本协议项下学生行事，并有权为本协议目的提供其个人资料及申请材料。"
  );
  para(
    doc,
    "The Parent shall provide complete, accurate, and truthful information and documents in a timely manner, and shall ensure that all school records, identification documents, references, academic documents, and statements are authentic and not misleading.",
    "家长须及时提供完整、准确及真实的信息和文件，并确保所有在校记录、身份证明文件、推荐材料、学术文件及陈述真实且不具误导性。"
  );
  para(
    doc,
    "The Parent shall review and approve all final application materials before submission, unless written authority is given to the Agency to submit on the Parent's behalf, and shall respond promptly to requests for information, clarifications, approvals, or payment.",
    "除非已书面授权机构代为递交，否则家长须在递交前审核并批准所有最终申请材料，并应及时回应有关信息、澄清、批准或付款之请求。"
  );
  para(
    doc,
    "The Parent shall comply with each school's requirements, deadlines, and policies, and shall pay all third-party charges including school fees, testing fees, translation fees, courier fees, notarisation fees, and government charges unless expressly agreed otherwise in writing.",
    "家长须遵守各学校的要求、截止日期及相关政策，并支付所有第三方费用，包括学校费用、考试费用、翻译费用、快递费用、公证费用及政府收费，除非双方另有书面明确约定。"
  );

  sectionTitle(doc, "7. Service Fee and Payment / 服务费及付款方式");
  para(
    doc,
    `The Service Fee shall be the amount stated in this Agreement. Bill to: ${snapshot.billTo}. Total amount: ${money(snapshot.totalAmount)}.`,
    `服务费以本协议列明金额为准。开票对象：${snapshot.billTo}。总金额：${money(snapshot.totalAmount)}。`
  );
  para(
    doc,
    "Unless otherwise stated in writing, the Service Fee is payable in full upfront upon signing this Agreement, and the Agency has no obligation to commence work unless full payment has been received in cleared funds.",
    "除非另有书面说明，服务费须于签署本协议时一次性全额预付。在机构实际收到全额到账款项前，机构无义务开始工作。"
  );
  para(
    doc,
    "Unless expressly stated otherwise, the Service Fee does not include school fees, testing fees, medical fees, translation fees, courier costs, notarisation charges, government charges, or third-party disbursements.",
    "除非另有明确说明，服务费不包括学校费用、考试费用、医疗费用、翻译费用、快递费用、公证费用、政府收费或第三方代垫费用。"
  );

  sectionTitle(doc, "8. Refund Policy / 退款政策");
  para(
    doc,
    "The Parties agree that the applicable refund policy shall be determined in accordance with the package selected and Appendix A attached to this Agreement.",
    "双方同意，适用之退款政策应根据所选套餐及本协议所附附录 A 予以确定。"
  );
  para(
    doc,
    `Current package refund position: ${snapshot.refundPolicyLabel}`,
    `当前套餐退款安排：${snapshot.refundPolicyLabel}`
  );
  para(
    doc,
    "No refund shall be payable where an offer regarded as successful under Appendix A is obtained but rejected by the Parent or student.",
    "如已获得附录 A 所界定之成功录取机会，但家长或学生予以拒绝，机构无需退款。"
  );

  sectionTitle(doc, "9. Additional Services and Scope Changes / 额外服务及范围变更");
  para(
    doc,
    "Any work outside the agreed scope of this Agreement shall be charged separately and will only be carried out if agreed in writing.",
    "超出本协议约定范围之工作，均须另行收费，且仅在双方书面同意后方会进行。"
  );
  para(
    doc,
    "Additional chargeable work may include additional school applications, appeal letters, substantial rewriting, urgent work, translation or notarisation coordination, relocation support, visa or pass support, or additional meetings outside the agreed application scope.",
    "额外收费项目可包括额外学校申请、申诉信、大幅重写、加急处理、翻译或公证协调、搬迁支持、签证或准证支持，或超出约定申请范围的额外会议。"
  );

  sectionTitle(doc, "10. Personal Data Protection and Confidentiality / 个人资料保护及保密");
  para(
    doc,
    "The Parent consents to the Agency collecting, using, disclosing, and processing the personal data of the Parent and the student(s) for the purpose of providing the services, preparing and submitting application materials, communicating with schools and relevant service providers, and maintaining relevant records.",
    "家长同意机构为提供服务、准备及提交申请材料、与学校及相关服务提供方沟通，以及保存相关记录之目的，收集、使用、披露及处理家长及学生之个人资料。"
  );
  para(
    doc,
    "The Agency shall make reasonable security arrangements to protect personal data in its possession or control and shall handle such data in a manner consistent with applicable Singapore personal data protection requirements.",
    "机构应采取合理安全措施保护其持有或控制下之个人资料，并依照适用之新加坡个人资料保护要求处理该等资料。"
  );
  para(
    doc,
    "The Parent acknowledges that the services may require disclosure or transfer of personal data outside Singapore, including to school systems, admissions systems, cloud platforms, email providers, and related service providers, to the extent reasonably necessary for the performance of the services.",
    "家长知悉，机构在合理必要范围内履行服务时，可能需向新加坡境外披露或转移个人资料，包括学校系统、招生系统、云端平台、电子邮件服务提供者及相关服务方。"
  );
  para(
    doc,
    "Each Party shall keep confidential all non-public information received from the other Party in connection with this Agreement, except where disclosure is required for the services, by law, or with the other Party's consent.",
    "除为履行服务所需、法律要求或经另一方同意外，双方均应对因本协议而获悉之对方非公开信息予以保密。"
  );

  sectionTitle(doc, "11. Communications and Authority / 沟通及授权");
  para(
    doc,
    "The Parent authorises the Agency to communicate with the relevant school(s) for the purpose of clarifying requirements, following up on submissions, and facilitating the application process.",
    "家长授权机构与相关学校沟通，以澄清申请要求、跟进递交情况并协助推进申请流程。"
  );
  para(
    doc,
    "The Agency shall not knowingly submit false, misleading, or materially inaccurate information on behalf of the Parent. The Parent remains ultimately responsible for the truthfulness, completeness, and final approval of all application information and documents.",
    "机构不得明知而代表家长提交虚假、误导性或重大失实的信息。所有申请信息及文件之真实性、完整性及最终批准责任，最终仍由家长承担。"
  );

  sectionTitle(doc, "12. Term and Termination / 协议期限及终止");
  para(
    doc,
    "This Agreement takes effect on the date of signing and continues until the earlier of completion of the services, expiry of the stated package scope, or termination under this Agreement.",
    "本协议自签署之日起生效，并持续有效，直至服务完成、所列套餐范围届满，或依本协议约定终止之较早发生者。"
  );
  para(
    doc,
    "Either Party may terminate this Agreement by written notice if the other Party commits a material breach and fails to remedy it within 7 days after written notice.",
    "如一方严重违反本协议，且在收到书面通知后 7 日内仍未补救，另一方可书面通知终止本协议。"
  );
  para(
    doc,
    "The Agency may suspend or terminate the services immediately if the Parent fails to pay, provides false or materially incomplete information, behaves abusively or unreasonably, or if continued performance may expose the Agency to legal, regulatory, or reputational risk.",
    "如家长未付款、提供虚假或重大不完整信息、对机构作出辱骂或明显不合理行为，或继续履行可能使机构面临法律、监管或声誉风险，机构可立即暂停或终止服务。"
  );

  sectionTitle(doc, "13. Limitation of Liability / 责任限制");
  para(
    doc,
    "To the fullest extent permitted by law, the Agency shall not be liable for indirect, incidental, special, or consequential loss, including loss of opportunity, loss of chance, emotional distress, or reputational harm.",
    "在法律允许的最大范围内，机构不对任何间接性、附带性、特殊性或后果性损失承担责任，包括机会损失、成功可能性损失、精神困扰或声誉损害。"
  );
  para(
    doc,
    "The Agency shall not be liable for the acts, omissions, decisions, delays, system failures, or policies of any school or third party.",
    "机构不对学校或任何第三方之行为、不作为、决定、延误、系统故障或政策承担责任。"
  );
  para(
    doc,
    "If the Agency is found liable for any claim arising out of or in connection with this Agreement, its total aggregate liability shall not exceed the Service Fee actually paid by the Parent under this Agreement.",
    "如机构就因本协议引起或与本协议有关之任何索赔被认定承担责任，其责任总额以家长根据本协议实际支付之服务费金额为上限。"
  );
  para(
    doc,
    "Nothing in this Agreement limits or excludes any liability, right, or remedy that cannot lawfully be limited or excluded under Singapore law.",
    "本协议任何条款均不限制或排除依据新加坡法律不得被限制或排除之任何责任、权利或救济。"
  );

  sectionTitle(doc, "14. Dispute Resolution, Governing Law, and General / 争议解决、适用法律及一般条款");
  para(
    doc,
    "The Parties shall first attempt in good faith to resolve any dispute through discussion and negotiation. If unresolved, either Party may refer the matter to mediation in Singapore.",
    "双方应先以诚信方式通过协商解决争议。如未能解决，任何一方可将争议提交新加坡调解。"
  );
  para(
    doc,
    "This Agreement shall be governed by and construed in accordance with the laws of Singapore, and the Parties submit to the non-exclusive jurisdiction of the courts of Singapore.",
    "本协议受新加坡法律管辖并依其解释，双方接受新加坡法院之非专属管辖。"
  );
  para(
    doc,
    "This Agreement constitutes the entire agreement between the Parties in relation to its subject matter and supersedes all prior discussions, proposals, understandings, or representations relating to that subject matter. No amendment shall be effective unless made in writing and signed by both Parties.",
    "本协议构成双方就本协议事项之完整协议，并取代此前与该事项有关之一切讨论、提议、理解或陈述。对本协议之任何修改，除非以书面作出并由双方签署，否则不生效。"
  );
  para(
    doc,
    "If any provision of this Agreement is held to be illegal, invalid, or unenforceable, the remaining provisions shall continue in full force and effect. A person who is not a Party to this Agreement shall have no right under the Contracts (Rights of Third Parties) Act 2001 to enforce any term of this Agreement.",
    "如本协议任何条款被认定为违法、无效或不可执行，其余条款仍继续完全有效。非本协议一方之任何人士，无权依据《2001年合同（第三方权利）法》执行本协议任何条款。"
  );
  para(
    doc,
    "In the event of any inconsistency between the English and Chinese versions, the English version shall prevail.",
    "如中英文版本有任何不一致之处，以英文版本为准。"
  );

  if (snapshot.note) {
    sectionTitle(doc, "Special Notes / 特别备注");
    text(doc, snapshot.note, { width: 515 });
  }

  ensureSpace(doc, 205);
  sectionTitle(doc, "15. Signatures / 签署");
  const signatureY = doc.y;
  row(doc, [
    { text: "For and on behalf of GT Educational Institute Pte Ltd\n代表 GT Educational Institute Pte Ltd 签署\n\nName / 姓名: ______________________\nTitle / 职务: ______________________\nSignature / 签名: __________________\nDate / 日期: ______________________", width: 257 },
    { text: signed ? `Parent / 家长\n\nName / 姓名: ${input.signerName ?? snapshot.parentName}\nSigned at / 签署时间: ${input.signedAtLabel ?? "-"}\nIP: ${input.signerIp ?? "-"}` : "Parent / 家长\n\nName / 姓名: ______________________\nSignature / 签名: __________________\nDate / 日期: ______________________", width: 258 },
  ]);
  if (signed && input.companySeal) {
    drawCompanySeal(doc, 174, signatureY + 28);
  }

  doc.addPage();
  sectionTitle(doc, "APPENDIX A - REFUND POLICY / 附录 A - 退款政策");
  para(
    doc,
    "This Appendix forms part of the Agreement and should be read together with the main service terms.",
    "本附录构成协议的一部分，应与主协议条款一并阅读。"
  );
  row(doc, [
    { text: "Package / 套餐", width: 150, bold: true },
    { text: "Outcome / 结果", width: 170, bold: true },
    { text: "Refund Position / 退款安排", width: 195, bold: true },
  ]);
  row(doc, [
    { text: "1 school / 1 pax", width: 150 },
    { text: "Any outcome", width: 170 },
    { text: "No refund. / 不退款。", width: 195 },
  ]);
  row(doc, [
    { text: "2-3 schools / 1 pax", width: 150 },
    { text: "Any outcome", width: 170 },
    { text: "No refund. / 不退款。", width: 195 },
  ]);
  row(doc, [
    { text: "4-5 schools / 1 pax", width: 150 },
    { text: "Fail", width: 170 },
    { text: "50% refund if all applications fail. / 如全部申请失败，可退还 50%。", width: 195 },
  ]);
  row(doc, [
    { text: "Any package", width: 150 },
    { text: "Successful but reject offer", width: 170 },
    { text: "No refund. / 如已成功获得录取机会但家长或学生拒绝录取，不退款。", width: 195 },
  ]);
  row(doc, [
    { text: "Meaning of offer", width: 150 },
    { text: "Conditional offer, next intake, or waitlist", width: 170 },
    { text: "These are treated as a successful offer for refund purposes. / 就退款政策而言，附条件录取、下一个 intake 的录取机会及候补名单均视为成功录取机会。", width: 195 },
  ]);
  doc.moveDown(0.5);
  text(doc, "Notes / 备注", { size: 10, bold: true, color: BLUE });
  text(doc, "Any package not expressly listed above should be confirmed in writing before engagement.", { width: 515 });
  text(doc, "凡未在上表明确列明的套餐，应于委托前以书面确认。", { width: 515 });

  return doc;
}

export async function generateUnsignedSchoolApplicationPdfBuffer(snapshot: SchoolApplicationSnapshot) {
  return docToBuffer(buildDoc({ snapshot }, false));
}

export async function generateSignedSchoolApplicationPdfBuffer(input: SignedPdfInput) {
  return docToBuffer(buildDoc(input, true));
}
