import { requireTeacherProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setPdfFont } from "@/lib/pdf-font";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

type PDFDoc = InstanceType<typeof PDFDocument>;

function streamPdf(doc: PDFDoc) {
  const stream = new PassThrough();
  doc.pipe(stream);
  doc.end();
  return stream;
}

function safeName(s: string) {
  return s.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

function teachingLanguageLabel(v?: "CHINESE" | "ENGLISH" | "BILINGUAL" | null, other?: string | null) {
  if (v === "CHINESE") return "中文";
  if (v === "ENGLISH") return "英文";
  if (v === "BILINGUAL") return "双语";
  if (other) return other;
  return "-";
}

function introLines(intro?: string | null) {
  return String(intro || "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function formatAlmaMater(text?: string | null) {
  const parts = String(text || "")
    .split(/[，,]/)
    .map((x) => x.trim())
    .filter(Boolean);
  return parts.length ? parts.join("\n") : "暂无";
}

function drawBadge(doc: PDFDoc, text: string, x: number, y: number) {
  const h = 35;
  doc.fontSize(16);
  const w = Math.max(141, doc.widthOfString(text) + 45);
  doc.save();
  doc.roundedRect(x, y, w, h, 12).fill("#f5b700");
  doc.fillColor("white").fontSize(16).text(text, x + 22, y + 10, { width: w - 44, align: "center" });
  doc.restore();
  return { w, h };
}

export async function GET() {
  const { teacher } = await requireTeacherProfile();
  if (!teacher) return new Response("Teacher profile not linked", { status: 400 });

  const teacherFull = await prisma.teacher.findUnique({
    where: { id: teacher.id },
    include: {
      subjects: { include: { course: true } },
      subjectCourse: { include: { course: true } },
    },
  });
  if (!teacherFull) return new Response("Teacher not found", { status: 404 });

  const subjectLabels = teacherFull.subjects.length
    ? teacherFull.subjects.map((s) => `${s.course.name}-${s.name}`)
    : teacherFull.subjectCourse
      ? [`${teacherFull.subjectCourse.course.name}-${teacherFull.subjectCourse.name}`]
      : [];

  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
  setPdfFont(doc);

  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const leftW = 248;

  doc.rect(0, 0, pageW, pageH).fill("#efefef");
  doc.rect(0, 0, leftW, pageH).fill("#f5b700");

  doc.fillColor("white").fontSize(42).text(teacherFull.name, 24, 58, { width: leftW - 42 });
  doc.fontSize(24).text("教授", 24, 122, { width: leftW - 42 });
  doc
    .fontSize(13)
    .text(subjectLabels.length ? subjectLabels.join("\n") : "课程", 24, 164, {
      width: leftW - 42,
      lineGap: 2,
    });

  doc.roundedRect(16, 316, leftW - 32, 52, 11).fill("#f2f2f2");
  doc.fillColor("#4b4b4b").fontSize(20).text("基本信息", 34, 333);

  doc.fillColor("white").fontSize(18);
  doc.text(`◆ 教学语言：${teachingLanguageLabel(teacherFull.teachingLanguage, teacherFull.teachingLanguageOther)}`, 28, 390, { width: leftW - 46 });
  doc.text(`◆ 国籍：${teacherFull.nationality || "-"}`, 28, 426, { width: leftW - 46 });
  doc.text(`◆ 教龄：${teacherFull.yearsExperience != null ? `${teacherFull.yearsExperience} 年` : "-"}`, 28, 462, {
    width: leftW - 46,
  });

  const rightX = leftW + 24;
  const rightW = pageW - rightX - 24;
  let y = 58;

  const eduBadge = drawBadge(doc, "教育背景", rightX, y);
  y += eduBadge.h + 14;
  const almaText = formatAlmaMater(teacherFull.almaMater);
  doc.fillColor("#1f1f1f").fontSize(20);
  const almaH = doc.heightOfString(almaText, { width: rightW, lineGap: 3 });
  doc.text(almaText, rightX + 4, y, { width: rightW, lineGap: 3 });
  y += almaH + 18;

  const introBadge = drawBadge(doc, "自我介绍", rightX, y);
  y += introBadge.h + 14;

  const lines = introLines(teacherFull.intro);
  if (lines.length === 0) {
    doc.fillColor("#666").fontSize(14).text("暂无介绍", rightX + 4, y);
  } else {
    doc.fillColor("#1f1f1f").fontSize(14);
    const maxY = pageH - 48;
    for (const line of lines) {
      const text = `◆ ${line}`;
      const h = doc.heightOfString(text, { width: rightW, lineGap: 2 });
      if (y + h > maxY) break;
      doc.text(text, rightX + 4, y, { width: rightW, lineGap: 2 });
      y += h + 8;
    }
  }

  const stream = streamPdf(doc);
  const fileName = `teacher-card-${safeName(teacherFull.name)}.pdf`;
  const fileNameAscii = fileName.replace(/[^\x20-\x7E]/g, "_");
  const fileNameUtf8 = encodeURIComponent(fileName);
  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileNameAscii}"; filename*=UTF-8''${fileNameUtf8}`,
    },
  });
}
