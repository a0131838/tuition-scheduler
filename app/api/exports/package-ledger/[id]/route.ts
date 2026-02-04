import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import fs from "fs";
import path from "path";
import { getLang, type Lang } from "@/lib/i18n";

const LOGO_PATH = path.join(process.cwd(), "public", "logo.png");
const COMPANY_LINES = [
  "Company: Reshape Great Thinkers Pte. Ltd",
  "150 Orchard Road, Orchard Plaza, #08-15/16, S238841",
  "Phone: (65) 80421572",
  "Email: contact.greatthinkers@gmail.com",
  "Company Reg No. 202303312G",
];
const ORANGE = "#d97706";
const EN_BOLD_FONT = "C:\\Windows\\Fonts\\arialbd.ttf";
const CH_FONT = "C:\\Windows\\Fonts\\simhei.ttf";

function fmtMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.abs(min % 60);
  if (h == 0) return `${min}m`;
  if (m == 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateTime(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

function setupFont(doc: PDFDocument) {
  const candidates = [
    "C:\\Windows\\Fonts\\simhei.ttf",
    "C:\\Windows\\Fonts\\simsunb.ttf",
    "C:\\Windows\\Fonts\\arial.ttf",
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (found) {
    doc.font(found);
    return;
  }
  doc.font("Helvetica");
}

function setEnglishBoldFont(doc: PDFDocument) {
  if (fs.existsSync(EN_BOLD_FONT)) {
    doc.font(EN_BOLD_FONT);
    return;
  }
  doc.font("Helvetica");
}

function setChineseFont(doc: PDFDocument) {
  if (fs.existsSync(CH_FONT)) {
    doc.font(CH_FONT);
    return;
  }
  setupFont(doc);
}

function streamPdf(doc: PDFDocument) {
  const stream = new PassThrough();
  doc.pipe(stream);
  doc.end();
  return stream;
}

function safeName(s: string) {
  return s.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

function ym(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function choose(lang: Lang, en: string, zh: string) {
  if (lang === "EN") return en;
  if (lang === "ZH") return zh;
  return `${en} / ${zh}`;
}

function labelLines(lang: Lang, en: string, zh: string) {
  if (lang === "EN") return en;
  if (lang === "ZH") return zh;
  return `${en}\n${zh}`;
}

function drawCompanyHeader(doc: PDFDocument, showBrand: boolean) {
  if (!showBrand) return;
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const top = doc.y;

  let logoH = 0;
  const logoW = 255;
  try {
    const img = doc.openImage(LOGO_PATH);
    const scale = logoW / img.width;
    logoH = img.height * scale;
    doc.image(img, left, top, { width: logoW });
  } catch {}

  const textX = left;
  const textW = Math.max(40, right - textX);
  doc.fontSize(9);
  let textY = top + logoH + 6;
  COMPANY_LINES.forEach((line) => {
    doc.text(line, textX, textY, { width: textW });
    textY += doc.currentLineHeight() + 2;
  });

  const headerH = Math.max(logoH, textY - top);
  doc.y = top + headerH + 6;
  doc.moveTo(left, doc.y).lineTo(right, doc.y).stroke();
  doc.moveDown(0.5);
}

function drawHeader(
  doc: PDFDocument,
  lang: Lang,
  titleEn: string,
  titleZh: string,
  showBrand: boolean,
  showTitle: boolean
) {
  drawCompanyHeader(doc, showBrand);
  if (showTitle) {
    doc.fillColor(ORANGE);
    if (lang === "EN") {
      setEnglishBoldFont(doc);
      doc.fontSize(16).text(titleEn);
    } else if (lang === "ZH") {
      setChineseFont(doc);
      doc.fontSize(16).text(titleZh);
    } else {
      setEnglishBoldFont(doc);
      doc.fontSize(16).text(titleEn);
      setChineseFont(doc);
      doc.fontSize(12).text(titleZh);
    }
    doc.fillColor("black");
    setupFont(doc);
    const dateLabel = choose(lang, "Issued Date", "出具日期");
    doc.fontSize(9).text(`${dateLabel}: ${formatDate(new Date())}`);
    doc.moveDown(0.4);
  }
}

function drawFooter() {
  // No footer (per request)
}

function drawSectionTitle(doc: PDFDocument, lang: Lang, en: string, zh: string) {
  doc.fillColor(ORANGE);
  if (lang === "EN") {
    setEnglishBoldFont(doc);
    doc.fontSize(12).text(en);
  } else if (lang === "ZH") {
    setChineseFont(doc);
    doc.fontSize(12).text(zh);
  } else {
    setEnglishBoldFont(doc);
    doc.fontSize(12).text(en);
    setChineseFont(doc);
    doc.fontSize(11).text(zh);
  }
  doc.fillColor("black");
  setupFont(doc);
}

type InfoItem = {
  en: string;
  zh: string;
  value: string;
};

function drawInfoGrid(
  doc: PDFDocument,
  lang: Lang,
  items: InfoItem[],
  columns: number,
  x: number,
  width: number
) {
  const colW = width / columns;
  const rowGap = 6;

  for (let i = 0; i < items.length; i += columns) {
    const rowItems = items.slice(i, i + columns);
    const rowY = doc.y;
    const heights = rowItems.map((item) => {
      const labelText = labelLines(lang, item.en, item.zh);
      const valueText = item.value || "-";
      const labelH = doc.heightOfString(labelText, { width: colW - 6 });
      const valueH = doc.heightOfString(valueText, { width: colW - 6 });
      return labelH + 2 + valueH;
    });
    const rowH = Math.max(22, ...heights);

    rowItems.forEach((item, idx) => {
      const cellX = x + idx * colW;
      const labelText = labelLines(lang, item.en, item.zh);
      const valueText = item.value || "-";
      const labelH = doc.heightOfString(labelText, { width: colW - 6 });
      doc.text(labelText, cellX, rowY, { width: colW - 6 });
      doc.text(valueText, cellX, rowY + labelH + 2, { width: colW - 6 });
    });

    doc.y = rowY + rowH + rowGap;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const packageId = params.id;
  const lang = await getLang();

  const pkg = await prisma.coursePackage.findUnique({
    where: { id: packageId },
    include: { student: { include: { studentType: true } }, course: true },
  });

  if (!pkg) {
    return new Response("Package not found", { status: 404 });
  }

  const txns = await prisma.packageTxn.findMany({
    where: { packageId },
    orderBy: { createdAt: "asc" },
  });

  const sessionIds = txns.map((t) => t.sessionId).filter(Boolean) as string[];
  const sessions = sessionIds.length
    ? await prisma.session.findMany({
        where: { id: { in: sessionIds } },
        include: { class: { include: { course: true, subject: true, level: true, teacher: true } } },
      })
    : [];
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  let running = 0;
  const rows = txns.map((t) => {
    running += t.deltaMinutes;
    const sess = t.sessionId ? sessionMap.get(t.sessionId) : null;
    return { txn: t, running, sess };
  });

  const openingBalance =
    txns.length > 0 ? rows[0].running - rows[0].txn.deltaMinutes : 0;
  const closingBalance = rows.length ? rows[rows.length - 1].running : openingBalance;

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  setupFont(doc);
  doc.lineGap(2);

  const hideLogo = pkg.student?.studentType?.name === "B";
  const showBrand = !hideLogo;
  const showTitle = !hideLogo;
  drawHeader(doc, lang, "Package Ledger", "课包对账单", showBrand, showTitle);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const leftX = doc.page.margins.left;
  const infoWidth = Math.floor(pageWidth * 0.65);
  const infoLeft = leftX;

  doc.fontSize(10);
  const openText = choose(lang, "(open)", "（长期）");
  const infoItems: InfoItem[] = [
    { en: "Student", zh: "学生", value: pkg.student?.name ?? "-" },
    {
      en: "Course",
      zh: "课程",
      value: `${pkg.course?.name ?? "-"} ${(pkg.course as any)?.level ?? ""}`.trim(),
    },
    { en: "Package Type", zh: "课包类型", value: pkg.type },
    { en: "Status", zh: "状态", value: pkg.status },
    {
      en: "Valid",
      zh: "有效期",
      value: `${formatDate(pkg.validFrom)} ~ ${pkg.validTo ? formatDate(pkg.validTo) : openText}`,
    },
    { en: "Opening Balance", zh: "期初余额", value: fmtMinutes(openingBalance) },
    { en: "Closing Balance", zh: "期末余额", value: fmtMinutes(closingBalance) },
    {
      en: "Current Remaining",
      zh: "当前余额",
      value: pkg.remainingMinutes != null ? fmtMinutes(pkg.remainingMinutes) : "-",
    },
  ];
  drawInfoGrid(doc, lang, infoItems, 4, infoLeft, infoWidth);

  doc.y += 6;
  doc.moveTo(leftX, doc.y).lineTo(leftX + pageWidth, doc.y).stroke();
  doc.moveDown(0.5);

  drawSectionTitle(doc, lang, "Transactions", "交易流水");
  doc.moveDown(0.4);

  const col = [120, 60, 60, 70, pageWidth - 310];

  function drawTableHeader() {
    const rowY = doc.y;
    const rowH = lang === "BILINGUAL" ? 24 : 16;
    doc.save();
    doc.rect(leftX, rowY, pageWidth, rowH).fill("#f0f0f0");
    doc.fillColor(ORANGE);
    setEnglishBoldFont(doc);
    doc.fontSize(9);
    if (lang === "ZH") {
      setChineseFont(doc);
      doc.text("时间", leftX + 2, rowY + 3, { width: col[0] - 4 });
      doc.text("类型", leftX + col[0] + 2, rowY + 3, { width: col[1] - 4 });
      doc.text("变动", leftX + col[0] + col[1] + 2, rowY + 3, { width: col[2] - 4 });
      doc.text("余额", leftX + col[0] + col[1] + col[2] + 2, rowY + 3, {
        width: col[3] - 4,
      });
      doc.text("课程备注", leftX + col[0] + col[1] + col[2] + col[3] + 2, rowY + 3, {
        width: col[4] - 4,
      });
    } else if (lang === "EN") {
      doc.text("Time", leftX + 2, rowY + 3, { width: col[0] - 4 });
      doc.text("Type", leftX + col[0] + 2, rowY + 3, { width: col[1] - 4 });
      doc.text("Delta", leftX + col[0] + col[1] + 2, rowY + 3, { width: col[2] - 4 });
      doc.text("Balance", leftX + col[0] + col[1] + col[2] + 2, rowY + 3, {
        width: col[3] - 4,
      });
      doc.text("Session / Note", leftX + col[0] + col[1] + col[2] + col[3] + 2, rowY + 3, {
        width: col[4] - 4,
      });
    } else {
      doc.text("Time", leftX + 2, rowY + 3, { width: col[0] - 4 });
      doc.text("Type", leftX + col[0] + 2, rowY + 3, { width: col[1] - 4 });
      doc.text("Delta", leftX + col[0] + col[1] + 2, rowY + 3, { width: col[2] - 4 });
      doc.text("Balance", leftX + col[0] + col[1] + col[2] + 2, rowY + 3, {
        width: col[3] - 4,
      });
      doc.text("Session / Note", leftX + col[0] + col[1] + col[2] + col[3] + 2, rowY + 3, {
        width: col[4] - 4,
      });
      setChineseFont(doc);
      doc.fontSize(9);
      doc.text("时间", leftX + 2, rowY + 13, { width: col[0] - 4 });
      doc.text("类型", leftX + col[0] + 2, rowY + 13, { width: col[1] - 4 });
      doc.text("变动", leftX + col[0] + col[1] + 2, rowY + 13, { width: col[2] - 4 });
      doc.text("余额", leftX + col[0] + col[1] + col[2] + 2, rowY + 13, {
        width: col[3] - 4,
      });
      doc.text("课程备注", leftX + col[0] + col[1] + col[2] + col[3] + 2, rowY + 13, {
        width: col[4] - 4,
      });
    }
    doc.restore();
    doc.fillColor("black");
    setupFont(doc);
    doc.y = rowY + rowH + 4;
    doc.moveTo(leftX, doc.y).lineTo(leftX + pageWidth, doc.y).stroke();
    doc.moveDown(0.2);
  }

  drawTableHeader();

  doc.fontSize(9);
  for (const r of rows) {
    if (doc.y > 740) {
      doc.addPage();
      setupFont(doc);
      drawHeader(doc, lang, "Package Ledger", "课包对账单", showBrand, showTitle);
      doc.moveDown(0.4);
      drawSectionTitle(doc, lang, "Transactions", "交易流水");
      doc.moveDown(0.4);
      drawTableHeader();
    }

    const time = formatDateTime(new Date(r.txn.createdAt));
    const delta = fmtMinutes(r.txn.deltaMinutes);
    const balance = fmtMinutes(r.running);
    const sess = r.sess
      ? `${formatDateTime(new Date(r.sess.startAt))} - ${new Date(
          r.sess.endAt
        ).toLocaleTimeString()} | ${r.sess.class.course.name} / ${r.sess.class.subject?.name ?? "-"} / ${
          r.sess.class.level?.name ?? "-"
        } | ${
          r.sess.class.teacher.name
        }`
      : "-";
    const noteRaw = r.txn.note ?? "";
    const cleanedNote = noteRaw
      .replace(/studentId=\\S+/g, "")
      .replace(/studentId:\\s*\\S+/g, "")
      .replace(/\\s{2,}/g, " ")
      .trim();
    const detail = cleanedNote ? `${sess}\n${cleanedNote}` : sess;

    const rowY = doc.y;
    const h = Math.max(
      doc.heightOfString(time, { width: col[0] }),
      doc.heightOfString(r.txn.kind, { width: col[1] }),
      doc.heightOfString(delta, { width: col[2] }),
      doc.heightOfString(balance, { width: col[3] }),
      doc.heightOfString(detail, { width: col[4] })
    );

    doc.text(time, leftX, rowY, { width: col[0] });
    doc.text(r.txn.kind, leftX + col[0], rowY, { width: col[1] });
    doc.text(delta, leftX + col[0] + col[1], rowY, { width: col[2] });
    doc.text(balance, leftX + col[0] + col[1] + col[2], rowY, { width: col[3] });
    doc.text(detail, leftX + col[0] + col[1] + col[2] + col[3], rowY, {
      width: col[4],
    });

    doc.y = rowY + h + 4;
    doc.moveTo(leftX, doc.y).lineTo(leftX + pageWidth, doc.y).stroke();
    doc.moveDown(0.2);
  }

  drawFooter();
  const stream = streamPdf(doc);
  const baseName =
    lang === "EN" ? "package-ledger" : lang === "ZH" ? "课包对账单" : "package-ledger_课包对账单";
  const fileName = `${baseName}_${safeName(pkg.student?.name ?? "学生")}_${safeName(
    pkg.course?.name ?? "课程"
  )}_${safeName(pkg.student?.grade ?? "年级")}_${ym(new Date())}.pdf`;
  const fileNameAscii = `package-ledger_${safeName(
    pkg.student?.name ?? "student"
  )}_${safeName(pkg.course?.name ?? "course")}_${safeName(
    pkg.student?.grade ?? "grade"
  )}_${ym(new Date())}.pdf`.replace(/[^\x20-\x7E]/g, "_");
  const fileNameUtf8 = encodeURIComponent(fileName);
  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"${fileNameAscii}\"; filename*=UTF-8''${fileNameUtf8}`,
    },
  });
}
