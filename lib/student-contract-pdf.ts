import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import path from "path";
import { readFile } from "fs/promises";
import { setPdfBoldFont, setPdfFont } from "@/lib/pdf-font";
import type { ContractSnapshot } from "@/lib/student-contract-template";
import { stripContractHtmlForPdf } from "@/lib/student-contract-template";

type PDFDoc = InstanceType<typeof PDFDocument>;

const BRAND_BLUE = "#2563eb";
const DARK = "#0f172a";
const MUTED = "#475569";
const BORDER = "#cbd5e1";
const LOGO_PATH = path.join(process.cwd(), "public", "invoice-org.png");
const LOGO_FALLBACK_PATH = path.join(process.cwd(), "public", "logo.png");

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

function drawText(
  doc: PDFDoc,
  value: string,
  options: {
    x?: number;
    y?: number;
    width?: number;
    size?: number;
    color?: string;
    bold?: boolean;
    align?: "left" | "center" | "right";
    lineGap?: number;
  } = {}
) {
  if (options.bold) setPdfBoldFont(doc);
  else setPdfFont(doc);
  doc
    .fontSize(options.size ?? 10)
    .fillColor(options.color ?? DARK)
    .text(value, options.x ?? doc.x, options.y ?? doc.y, {
      width: options.width,
      align: options.align,
      lineGap: options.lineGap ?? 2,
    });
}

function measureTextHeight(
  doc: PDFDoc,
  value: string,
  options: {
    width?: number;
    size?: number;
    bold?: boolean;
    lineGap?: number;
  } = {}
) {
  if (options.bold) setPdfBoldFont(doc);
  else setPdfFont(doc);
  doc.fontSize(options.size ?? 10);
  return doc.heightOfString(value, {
    width: options.width,
    lineGap: options.lineGap ?? 2,
  });
}

function drawHeader(doc: PDFDoc, snapshot: ContractSnapshot) {
  const logoX = 40;
  const logoY = 36;
  const logoWidth = 120;
  const rightX = 310;
  const rightWidth = 240;
  const titleY = 42;
  try {
    doc.image(LOGO_PATH, logoX, logoY, { width: logoWidth });
  } catch {
    try {
      doc.image(LOGO_FALLBACK_PATH, logoX, logoY, { width: logoWidth });
    } catch {}
  }
  const titleHeight = measureTextHeight(doc, "Tuition Agreement / 学费协议", {
    width: rightWidth,
    size: 20,
    bold: true,
    lineGap: 1,
  });
  drawText(doc, "Tuition Agreement / 学费协议", {
    x: rightX,
    y: titleY,
    width: rightWidth,
    size: 20,
    color: BRAND_BLUE,
    bold: true,
    align: "right",
    lineGap: 1,
  });
  const brandY = titleY + titleHeight + 6;
  drawText(doc, snapshot.company.brandName, {
    x: rightX,
    y: brandY,
    width: rightWidth,
    size: 10,
    color: DARK,
    bold: true,
    align: "right",
  });
  const companyMeta = `${snapshot.company.legalName} · UEN ${snapshot.company.regNo}`;
  const metaY = brandY + measureTextHeight(doc, snapshot.company.brandName, {
    width: rightWidth,
    size: 10,
    bold: true,
  }) + 4;
  drawText(doc, `${snapshot.company.legalName} · UEN ${snapshot.company.regNo}`, {
    x: 280,
    y: metaY,
    width: 270,
    size: 9,
    color: MUTED,
    align: "right",
  });
  const metaHeight = measureTextHeight(doc, companyMeta, {
    width: 270,
    size: 9,
  });
  doc.y = Math.max(logoY + 72, metaY + metaHeight) + 18;
}

function drawSummaryBox(doc: PDFDoc, snapshot: ContractSnapshot) {
  const top = doc.y;
  const studentWidth = 168;
  const courseWidth = 152;
  const packageWidth = 114;
  const studentValueHeight = measureTextHeight(doc, snapshot.student.name, {
    width: studentWidth,
    size: 16,
    bold: true,
    lineGap: 1,
  });
  const courseValueHeight = measureTextHeight(doc, snapshot.package.courseName, {
    width: courseWidth,
    size: 13,
    bold: true,
    lineGap: 1,
  });
  const packageValueHeight = measureTextHeight(doc, snapshot.package.totalHoursLabel, {
    width: packageWidth,
    size: 13,
    bold: true,
    lineGap: 1,
  });
  const contentHeight = Math.max(studentValueHeight, courseValueHeight, packageValueHeight);
  const boxHeight = 14 + 16 + contentHeight + 18 + 18;
  doc.roundedRect(40, top, 515, boxHeight, 14).lineWidth(1).strokeColor(BORDER).fillAndStroke("#ffffff", BORDER);
  drawText(doc, "Student / 学生", { x: 56, y: top + 14, size: 10, color: MUTED, bold: true });
  drawText(doc, snapshot.student.name, { x: 56, y: top + 34, width: studentWidth, size: 16, bold: true, lineGap: 1 });
  drawText(doc, "Course / 课程", { x: 232, y: top + 14, size: 10, color: MUTED, bold: true });
  drawText(doc, snapshot.package.courseName, { x: 232, y: top + 34, width: courseWidth, size: 13, bold: true, lineGap: 1 });
  drawText(doc, "Package / 课包", { x: 420, y: top + 14, size: 10, color: MUTED, bold: true });
  drawText(doc, snapshot.package.totalHoursLabel, { x: 420, y: top + 34, width: packageWidth, size: 13, bold: true, align: "right", lineGap: 1 });
  drawText(doc, `Agreement date / 协议日期: ${snapshot.agreementDateLabel}`, {
    x: 56,
    y: top + 34 + contentHeight + 12,
    width: 478,
    size: 10,
    color: MUTED,
  });
  doc.y = top + boxHeight + 22;
}

async function drawSignatureBlock(doc: PDFDoc, options: {
  snapshot: ContractSnapshot;
  signerName?: string | null;
  signedAtLabel?: string | null;
  signerIp?: string | null;
  signatureImagePath?: string | null;
}) {
  const top = doc.y;
  doc.roundedRect(40, top, 515, 116, 14).lineWidth(1).strokeColor(BORDER).fillAndStroke("#f8fbff", BORDER);
  drawText(doc, "Electronic Acceptance / 电子确认", {
    x: 56,
    y: top + 14,
    size: 13,
    bold: true,
    color: BRAND_BLUE,
  });
  drawText(
    doc,
    "The applying parent confirms that he or she has read, understood, and agrees to be legally bound by this tuition agreement. / 申请家长确认已阅读、理解并同意受本学费协议约束。",
    {
      x: 56,
      y: top + 34,
      width: 488,
      size: 10,
      color: DARK,
    }
  );
  drawText(doc, `Signer / 签署人: ${options.signerName || options.snapshot.parent.parentFullNameEn}`, {
    x: 56,
    y: top + 72,
    size: 10,
    bold: true,
  });
  drawText(doc, `Signed at / 签署时间: ${options.signedAtLabel || "-"}`, {
    x: 56,
    y: top + 90,
    size: 10,
    color: MUTED,
  });
  if (options.signerIp) {
    drawText(doc, `IP: ${options.signerIp}`, {
      x: 250,
      y: top + 90,
      size: 10,
      color: MUTED,
    });
  }
  if (options.signatureImagePath) {
    try {
      const absPath = path.join(process.cwd(), "public", options.signatureImagePath.replace(/^\/+/, ""));
      const bytes = await readFile(absPath);
      doc.image(bytes, 390, top + 66, { fit: [140, 40], align: "right", valign: "center" });
    } catch {}
  } else {
    drawText(doc, options.signerName || options.snapshot.parent.parentFullNameEn, {
      x: 390,
      y: top + 70,
      width: 140,
      size: 16,
      color: BRAND_BLUE,
      bold: true,
      align: "right",
    });
  }
  doc.y = top + 132;
}

function writeAgreementPages(doc: PDFDoc, snapshot: ContractSnapshot) {
  const agreementText = stripContractHtmlForPdf(snapshot.agreementHtml);
  drawText(doc, "Agreement Terms / 协议条款", {
    size: 14,
    bold: true,
    color: BRAND_BLUE,
  });
  doc.moveDown(0.35);
  drawText(doc, agreementText, {
    width: 515,
    size: 10,
    color: DARK,
    lineGap: 3,
  });
}

async function buildContractDoc(input: {
  snapshot: ContractSnapshot;
  signed: boolean;
  signerName?: string | null;
  signedAtLabel?: string | null;
  signerIp?: string | null;
  signatureImagePath?: string | null;
}) {
  const doc = createDoc();
  drawHeader(doc, input.snapshot);
  drawSummaryBox(doc, input.snapshot);
  writeAgreementPages(doc, input.snapshot);
  if (input.signed) {
    if (doc.y > 620) doc.addPage();
    await drawSignatureBlock(doc, {
      snapshot: input.snapshot,
      signerName: input.signerName,
      signedAtLabel: input.signedAtLabel,
      signerIp: input.signerIp,
      signatureImagePath: input.signatureImagePath,
    });
  }
  return doc;
}

export async function generateUnsignedStudentContractPdfBuffer(snapshot: ContractSnapshot) {
  const doc = await buildContractDoc({ snapshot, signed: false });
  return docToBuffer(doc);
}

export async function generateSignedStudentContractPdfBuffer(input: {
  snapshot: ContractSnapshot;
  signerName: string;
  signedAtLabel: string;
  signerIp?: string | null;
  signatureImagePath?: string | null;
}) {
  const doc = await buildContractDoc({
    snapshot: input.snapshot,
    signed: true,
    signerName: input.signerName,
    signedAtLabel: input.signedAtLabel,
    signerIp: input.signerIp,
    signatureImagePath: input.signatureImagePath,
  });
  return docToBuffer(doc);
}
