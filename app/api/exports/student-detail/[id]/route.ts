import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import fs from "fs";
import path from "path";
import { getLang, type Lang } from "@/lib/i18n";
import { requireAdmin } from "@/lib/auth";

type PDFDoc = InstanceType<typeof PDFDocument>;

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

function setupFont(doc: PDFDoc) {
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

function setEnglishBoldFont(doc: PDFDoc) {
  if (fs.existsSync(EN_BOLD_FONT)) {
    doc.font(EN_BOLD_FONT);
    return;
  }
  doc.font("Helvetica");
}

function setChineseFont(doc: PDFDoc) {
  if (fs.existsSync(CH_FONT)) {
    doc.font(CH_FONT);
    return;
  }
  setupFont(doc);
}

function streamPdf(doc: PDFDoc) {
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

function shouldShowLogoByStudentTypeName(typeName?: string | null) {
  if (!typeName) return false;
  const normalized = typeName.toLowerCase();
  if (normalized.includes("\u81ea\u5df1\u5b66\u751f")) return true;
  return /(^|\s|-|_)(own|self)\s*student(s)?($|\s|-|_)/i.test(typeName);
}

function drawCompanyHeader(doc: PDFDoc, showBrand: boolean) {
  if (!showBrand) return;
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const top = doc.y;

  const logoW = 255;
  let logoH = 0;
  try {
    const logo = doc.openImage(LOGO_PATH);
    const scale = logoW / logo.width;
    logoH = logo.height * scale;
    doc.image(logo, left, top, { width: logoW });
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
  doc: PDFDoc,
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

function drawSectionTitle(doc: PDFDoc, lang: Lang, en: string, zh: string) {
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

function drawLabelValue(
  doc: PDFDoc,
  lang: Lang,
  labelEn: string,
  labelZh: string,
  value: string,
  x: number,
  y: number,
  width: number
) {
  const labelText = choose(lang, labelEn, labelZh);
  const valText = value || "-";
  const text = `${labelText}: ${valText}`;
  const h = doc.heightOfString(text, { width });
  doc.text(text, x, y, { width });
  return h;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await requireAdmin();
  const studentId = params.id;
  const lang = await getLang();

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { studentType: true },
  });
  if (!student) return new Response("Student not found", { status: 404 });
  const showBrand = shouldShowLogoByStudentTypeName(student.studentType?.name);
  const showTitle = showBrand;

  const [enrollments, packages, attendances] = await Promise.all([
    prisma.enrollment.findMany({
      where: { studentId },
      include: {
        class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
      },
      orderBy: { id: "asc" },
    }),
    prisma.coursePackage.findMany({
      where: { studentId },
      include: { course: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.attendance.findMany({
      where: { studentId },
      include: {
        session: { include: { class: { include: { course: true, subject: true, level: true, teacher: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
  ]);

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  setupFont(doc);
  doc.lineGap(2);

  drawHeader(doc, lang, "Student Report", "学生报告", showBrand, showTitle);

  doc.fontSize(10);
  const infoX = doc.page.margins.left;
  const infoW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  let y = doc.y;
  y += drawLabelValue(doc, lang, "Name", "姓名", student.name, infoX, y, infoW) + 2;
  if (student.school) {
    y +=
      drawLabelValue(doc, lang, "School", "学校", student.school, infoX, y, infoW) + 2;
  }
  if (student.grade) {
    y +=
      drawLabelValue(doc, lang, "Grade", "年级", student.grade, infoX, y, infoW) + 2;
  }
  if (student.birthDate) {
    y +=
      drawLabelValue(
        doc,
        lang,
        "Birth",
        "出生日期",
        formatDate(student.birthDate),
        infoX,
        y,
        infoW
      ) + 2;
  }
  if (student.note) {
    y +=
      drawLabelValue(doc, lang, "Note", "注意事项", student.note, infoX, y, infoW) + 2;
  }
  doc.y = y;

  doc.moveDown();
  drawSectionTitle(doc, lang, "Enrollments", "报名信息");
  doc.moveDown(0.3);
  if (enrollments.length === 0) {
    doc.fontSize(10).text(choose(lang, "No enrollments", "无报名记录"));
  } else {
    for (const e of enrollments) {
      doc.fontSize(10).text(
        `${e.class.course.name} / ${e.class.subject?.name ?? "-"} / ${e.class.level?.name ?? "-"} | ${e.class.teacher.name} | ${
          e.class.campus.name
        } | ${e.class.room?.name ?? choose(lang, "(none)", "（无）")}`
      );
    }
  }

  doc.moveDown();
  drawSectionTitle(doc, lang, "Packages", "课包信息");
  doc.moveDown(0.3);
  if (packages.length === 0) {
    doc.fontSize(10).text(choose(lang, "No packages", "无课包记录"));
  } else {
    for (const p of packages) {
      const remaining =
        p.type === "HOURS" && p.remainingMinutes != null ? fmtMinutes(p.remainingMinutes) : "-";
      const openText = choose(lang, "(open)", "（长期）");
      doc.fontSize(10).text(
        `${p.course?.name ?? "-"} (${(p.course as any)?.level ?? ""}) | ${
          p.type
        } | ${choose(lang, "Remaining", "剩余")}: ${remaining} | ${choose(
          lang,
          "Valid",
          "有效期"
        )}: ${formatDate(p.validFrom)} ~ ${p.validTo ? formatDate(p.validTo) : openText} | ${
          p.status
        }`
      );
    }
  }

  doc.moveDown();
  drawSectionTitle(doc, lang, "Attendance (Latest 200)", "点名记录");
  doc.moveDown(0.3);
  if (attendances.length === 0) {
    doc.fontSize(10).text(choose(lang, "No attendance records", "无点名记录"));
  } else {
    for (const a of attendances) {
      if (doc.y > 740) {
        doc.addPage();
        setupFont(doc);
        drawHeader(doc, lang, "Student Report", "学生报告", showBrand, showTitle);
        doc.moveDown(0.4);
        drawSectionTitle(doc, lang, "Attendance (Latest 200)", "点名记录");
        doc.moveDown(0.3);
      }
      const sess = a.session;
      const sessLine = `${formatDateTime(new Date(sess.startAt))} - ${new Date(
        sess.endAt
      ).toLocaleTimeString()} | ${sess.class.course.name} / ${sess.class.subject?.name ?? "-"} / ${
        sess.class.level?.name ?? "-"
      } | ${
        sess.class.teacher.name
      }`;
      const deductLine = `${choose(lang, "Status", "状态")}: ${a.status} | ${choose(
        lang,
        "Deduct",
        "扣减"
      )}: ${a.deductedCount} / ${a.deductedMinutes}m`;
      doc.fontSize(9).text(sessLine);
      doc.fontSize(9).text(deductLine);
      if (a.note) doc.fontSize(9).text(`${choose(lang, "Note", "备注")}: ${a.note}`);
      doc.moveDown(0.4);
    }
  }

  drawFooter();
  const stream = streamPdf(doc);
  const baseName =
    lang === "EN" ? "student-report" : lang === "ZH" ? "学生报告" : "student-report_学生报告";
  const fileName = `${baseName}_${safeName(student.name)}_${ym(new Date())}.pdf`;
  const fileNameAscii = `student-report_${safeName(student.name)}_${ym(new Date())}.pdf`.replace(
    /[^\x20-\x7E]/g,
    "_"
  );
  const fileNameUtf8 = encodeURIComponent(fileName);
  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"${fileNameAscii}\"; filename*=UTF-8''${fileNameUtf8}`,
    },
  });
}

