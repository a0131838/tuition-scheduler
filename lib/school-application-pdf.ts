import PDFDocument from "pdfkit";
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

function gradeLabel(item: SchoolApplicationSnapshotItem) {
  if (item.grade && item.equivalentLevel) return `${item.grade} (${item.equivalentLevel})`;
  return item.grade ?? item.equivalentLevel ?? null;
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

function buildDoc(input: SignedPdfInput, signed: boolean) {
  const { snapshot } = input;
  const doc = createDoc();
  text(doc, "GT Educational Institute Pte Ltd", { size: 15, bold: true, align: "center" });
  text(doc, "School Application Support Services Agreement / 学校申请支持服务协议", { size: 13, bold: true, align: "center", color: BLUE });
  doc.moveDown();

  sectionTitle(doc, "1. Parties and Basic Information / 双方及基本信息");
  row(doc, [
    { text: "Date / 日期", width: 130, bold: true },
    { text: snapshot.agreementDate, width: 385 },
  ]);
  row(doc, [
    { text: "Agency / 机构", width: 130, bold: true },
    { text: `${snapshot.agencyName}\n${snapshot.agencyDetails}`, width: 385 },
  ]);
  row(doc, [
    { text: "Parent / 家长", width: 130, bold: true },
    { text: `${snapshot.parentName}\n${snapshot.parentPhone ?? "-"} · ${snapshot.parentEmail ?? "-"}\n${snapshot.parentAddress ?? "-"}`, width: 385 },
  ]);
  row(doc, [
    { text: "Student / 学生", width: 130, bold: true },
    { text: `${snapshot.studentName}${snapshot.studentGrade ? ` · ${snapshot.studentGrade}` : ""}${snapshot.studentSchool ? ` · ${snapshot.studentSchool}` : ""}`, width: 385 },
  ]);

  sectionTitle(doc, "2. Application Schools and Fees / 申请学校及费用");
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

  sectionTitle(doc, "3. Appointment, Scope, and Parent Responsibilities / 委任、范围及家长责任");
  text(doc, "The Parent appoints the Agency to provide school application support services strictly for the student and school(s) listed in this Agreement. No other child, school, programme, appeal, visa, pass, guardianship, immigration, relocation, legal, tax, medical, or regulated counselling matter is included unless separately agreed in writing.", { width: 515 });
  text(doc, "家长委任机构仅就本协议列明之学生及学校提供申请支持服务。除非双方另有书面约定，本协议不包括其他孩子、学校、课程、申诉、签证、准证、监护、移民、搬迁、法律、税务、医疗或受监管咨询事项。", { width: 515 });
  doc.moveDown(0.5);
  text(doc, "The Parent shall provide complete, accurate, truthful, and timely information and documents, approve final application materials, and pay any third-party charges unless expressly stated otherwise.", { width: 515 });
  text(doc, "家长须及时提供完整、准确及真实资料，确认最终申请材料，并承担第三方费用，除非本协议另有明确说明。", { width: 515 });

  sectionTitle(doc, "4. No Guarantee of Outcome / 不保证申请结果");
  text(doc, "All admissions decisions are made solely by the relevant school. The Agency does not guarantee admission, assessment opportunities, waitlist priority, school response time, or successful application outcome.", { width: 515 });
  text(doc, "所有录取决定均由相关学校独立作出。机构不保证录取、评估机会、候补优先级、学校回复时间或申请成功结果。", { width: 515 });

  sectionTitle(doc, "5. Service Fee, Payment, and Refund Policy / 服务费、付款及退款");
  text(doc, `Service hours included: ${snapshot.serviceHours ?? "-"} hour(s). Bill to: ${snapshot.billTo}. Total amount: ${money(snapshot.totalAmount)}. Unless otherwise stated, the service fee is payable in full upfront upon signing.`, { width: 515 });
  text(doc, `包含服务时数：${snapshot.serviceHours ?? "-"} 小时。开票对象：${snapshot.billTo}。总金额：${money(snapshot.totalAmount)}。除非另有说明，服务费须于签署时一次性预付。`, { width: 515 });
  doc.moveDown(0.5);
  text(doc, `Refund policy: ${snapshot.refundPolicyLabel}`, { width: 515, bold: true });
  text(doc, "1-3 schools / 1 pax: no refund. 4-5 schools / 1 pax: 50% refund only if all applications fail. Any conditional offer, next-intake offer, or waitlist place counts as a successful offer for refund purposes. If the parent or student rejects a successful offer, no refund is payable.", { width: 515 });
  text(doc, "1-3 所学校 / 1 名学生：不退款。4-5 所学校 / 1 名学生：仅在全部申请失败时退还 50%。附条件录取、下一 intake 录取或候补名单均视为成功录取。如家长或学生拒绝成功录取机会，不退款。", { width: 515 });

  sectionTitle(doc, "6. Personal Data, Communications, Liability, and Law / 个人资料、沟通、责任及法律");
  text(doc, "The Parent consents to the Agency collecting, using, disclosing, and processing parent and student personal data for the services, including communications with schools and relevant service providers. The Agreement is governed by Singapore law. If the English and Chinese versions conflict, the English version prevails.", { width: 515 });
  text(doc, "家长同意机构为履行服务而收集、使用、披露及处理家长和学生个人资料，包括与学校及相关服务方沟通。本协议受新加坡法律管辖；如中英文不一致，以英文为准。", { width: 515 });

  if (snapshot.note) {
    sectionTitle(doc, "Special Notes / 特别备注");
    text(doc, snapshot.note, { width: 515 });
  }

  sectionTitle(doc, "7. Signatures / 签署");
  row(doc, [
    { text: "For and on behalf of GT Educational Institute Pte Ltd\n\nName: ______________________\nTitle: ______________________\nSignature: __________________\nDate: ______________________", width: 257 },
    { text: signed ? `Parent / 家长\n\nName: ${input.signerName ?? snapshot.parentName}\nSigned at: ${input.signedAtLabel ?? "-"}\nIP: ${input.signerIp ?? "-"}` : "Parent / 家长\n\nName: ______________________\nSignature: __________________\nDate: ______________________", width: 258 },
  ]);

  return doc;
}

export async function generateUnsignedSchoolApplicationPdfBuffer(snapshot: SchoolApplicationSnapshot) {
  return docToBuffer(buildDoc({ snapshot }, false));
}

export async function generateSignedSchoolApplicationPdfBuffer(input: SignedPdfInput) {
  return docToBuffer(buildDoc(input, true));
}
