import { requireAdmin } from "@/lib/auth";
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

function asciiName(s: string) {
  return safeName(s).replace(/[^\x20-\x7E]/g, "_");
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
}

function drawTeacherCardPage(doc: PDFDoc, teacher: any) {
  setPdfFont(doc);
  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const leftW = 248;
  const subjectLabels = teacher.subjects.length
    ? teacher.subjects.map((s: any) => `${s.course.name}-${s.name}`)
    : teacher.subjectCourse
      ? [`${teacher.subjectCourse.course.name}-${teacher.subjectCourse.name}`]
      : [];

  doc.rect(0, 0, pageW, pageH).fill("#efefef");
  doc.rect(0, 0, leftW, pageH).fill("#f5b700");

  doc.fillColor("white").fontSize(42).text(teacher.name, 24, 58, { width: leftW - 42 });
  doc.fontSize(24).text("教授", 24, 122, { width: leftW - 42 });
  doc.fontSize(13).text(subjectLabels.length ? subjectLabels.join("\n") : "课程", 24, 164, {
    width: leftW - 42,
    lineGap: 2,
  });

  doc.roundedRect(16, 316, leftW - 32, 52, 11).fill("#f2f2f2");
  doc.fillColor("#4b4b4b").fontSize(20).text("基本信息", 34, 333);

  doc.fillColor("white").fontSize(18);
  doc.text(`◆ 教学语言：${teachingLanguageLabel(teacher.teachingLanguage, teacher.teachingLanguageOther)}`, 28, 390, { width: leftW - 46 });
  doc.text(`◆ 国籍：${teacher.nationality || "-"}`, 28, 426, { width: leftW - 46 });
  doc.text(`◆ 教龄：${teacher.yearsExperience != null ? `${teacher.yearsExperience} 年` : "-"}`, 28, 462, {
    width: leftW - 46,
  });

  const rightX = leftW + 24;
  let y = 58;

  drawBadge(doc, "教育背景", rightX, y);
  y += 52;
  doc.fillColor("#1f1f1f").fontSize(24).text(formatAlmaMater(teacher.almaMater), rightX + 4, y, {
    width: pageW - rightX - 24,
  });

  y += 62;
  drawBadge(doc, "自我介绍", rightX, y);
  y += 52;

  const lines = introLines(teacher.intro);
  if (lines.length === 0) {
    doc.fillColor("#666").fontSize(14).text("暂无介绍", rightX + 4, y);
  } else {
    doc.fillColor("#1f1f1f").fontSize(16);
    for (const line of lines) {
      const text = `◆ ${line}`;
      const h = doc.heightOfString(text, { width: pageW - rightX - 24, lineGap: 2 });
      doc.text(text, rightX + 4, y, { width: pageW - rightX - 24, lineGap: 2 });
      y += h + 8;
      if (y > pageH - 60) break;
    }
  }

  const sh = !!teacher.offlineShanghai;
  const sg = !!teacher.offlineSingapore;
  const mark = sh && sg ? "both" : sh ? "sh" : sg ? "sg" : "none";
  const baseX = pageW - 34;
  const baseY = 24;
  const dot = (x: number, y: number, color: string, active: boolean) => {
    doc.save();
    doc.fillColor(color).opacity(active ? 1 : 0.15);
    doc.circle(x, y, 5).fill();
    doc.restore();
  };
  // light background plate
  doc.save();
  doc.fillColor("#ffffff").opacity(0.7);
  doc.roundedRect(baseX - 18, baseY - 16, 32, 32, 6).fill();
  doc.restore();
  // 2x2 matrix: right-top=SH, left-bottom=SG, right-bottom=both; online is default (no highlight)
  dot(baseX - 10, baseY - 8, "#9ca3af", false);
  dot(baseX + 4, baseY - 8, "#60a5fa", mark === "sh");
  dot(baseX - 10, baseY + 6, "#34d399", mark === "sg");
  dot(baseX + 4, baseY + 6, "#f59e0b", mark === "both");
}

export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const teacherId = (url.searchParams.get("teacherId") || "").trim();
  const courseId = (url.searchParams.get("courseId") || "").trim();
  const subjectId = (url.searchParams.get("subjectId") || "").trim();
  const levelId = (url.searchParams.get("levelId") || "").trim();
  const teachingLanguage = (url.searchParams.get("teachingLanguage") || "").trim();
  const offlineMode = (url.searchParams.get("offlineMode") || "").trim();

  const where = (() => {
    if (teacherId) return { id: teacherId };

    const andClauses: any[] = [];

    if (courseId) {
      andClauses.push({
        OR: [
          { subjectCourse: { courseId } },
          { subjects: { some: { courseId } } },
          { classes: { some: { courseId } } },
        ],
      });
    }

    if (subjectId) {
      andClauses.push({
        OR: [
          { subjectCourseId: subjectId },
          { subjects: { some: { id: subjectId } } },
          { classes: { some: { subjectId } } },
        ],
      });
    }

    if (levelId) {
      andClauses.push({ classes: { some: { levelId } } });
    }

    if (teachingLanguage) {
      if (teachingLanguage === "OTHER") {
        andClauses.push({
          teachingLanguage: null,
          teachingLanguageOther: { not: null },
        });
      } else if (teachingLanguage === "CHINESE" || teachingLanguage === "ENGLISH" || teachingLanguage === "BILINGUAL") {
        andClauses.push({ teachingLanguage });
      }
    }

    if (offlineMode) {
      if (offlineMode === "ONLINE_ONLY") {
        andClauses.push({ offlineShanghai: false, offlineSingapore: false });
      } else if (offlineMode === "OFFLINE_SH") {
        andClauses.push({ offlineShanghai: true });
      } else if (offlineMode === "OFFLINE_SG") {
        andClauses.push({ offlineSingapore: true });
      } else if (offlineMode === "OFFLINE_BOTH") {
        andClauses.push({ offlineShanghai: true, offlineSingapore: true });
      } else if (offlineMode === "OFFLINE_ANY") {
        andClauses.push({ OR: [{ offlineShanghai: true }, { offlineSingapore: true }] });
      }
    }

    if (andClauses.length === 0) return {};
    return { AND: andClauses };
  })();

  const teachers = await prisma.teacher.findMany({
    where: where as any,
    orderBy: { name: "asc" },
    include: {
      subjects: { include: { course: true } },
      subjectCourse: { include: { course: true } },
    },
  });

  if (teachers.length === 0) {
    return new Response("No teachers found for export.", { status: 404 });
  }

  const [course, subject, level] = await Promise.all([
    courseId ? prisma.course.findUnique({ where: { id: courseId }, select: { name: true } }) : Promise.resolve(null),
    subjectId
      ? prisma.subject.findUnique({ where: { id: subjectId }, select: { name: true } })
      : Promise.resolve(null),
    levelId ? prisma.level.findUnique({ where: { id: levelId }, select: { name: true } }) : Promise.resolve(null),
  ]);

  const langLabel =
    teachingLanguage === "CHINESE"
      ? "中文"
      : teachingLanguage === "ENGLISH"
      ? "英文"
      : teachingLanguage === "BILINGUAL"
      ? "双语"
      : teachingLanguage === "OTHER"
      ? "其他"
      : "全部";

  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
  drawTeacherCardPage(doc, teachers[0]);
  for (let i = 1; i < teachers.length; i += 1) {
    doc.addPage({ size: "A4", layout: "landscape", margin: 0 });
    drawTeacherCardPage(doc, teachers[i]);
  }

  const stream = streamPdf(doc);
  const courseNameUpper = course?.name ? course.name.toUpperCase() : "";
  const isSimpleCourseOnly = courseNameUpper && !subject && !level && !teachingLanguage;
  const parts = [
    courseNameUpper || "",
    subject?.name || "",
    level?.name || "",
    langLabel === "全部" ? "" : langLabel,
  ].filter(Boolean);
  const nameSuffix = parts.length ? `-${safeName(parts.join("-"))}` : "";
  const today = new Date();
  const dateTag = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const fileName = teacherId
    ? `名片-Card-${safeName(teachers[0].name)}-${dateTag}.pdf`
    : isSimpleCourseOnly
    ? `名片-Card-${safeName(courseNameUpper)}-${dateTag}.pdf`
    : `名片-Card${nameSuffix}-${dateTag}.pdf`;
  const fileNameAscii = teacherId
    ? `MingPian-Card-${asciiName(teachers[0].name)}-${dateTag}.pdf`
    : isSimpleCourseOnly
    ? `MingPian-Card-${asciiName(courseNameUpper)}-${dateTag}.pdf`
    : `MingPian-Card${asciiName(nameSuffix)}-${dateTag}.pdf`;
  const fileNameUtf8 = encodeURIComponent(fileName);
  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileNameAscii}"; filename*=UTF-8''${fileNameUtf8}`,
    },
  });
}
