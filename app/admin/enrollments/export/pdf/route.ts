import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import fs from "fs";
import path from "path";

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

function setupFont(doc: PDFDoc) {
  const candidates = [
    "C:\\Windows\\Fonts\\msyh.ttf",
    "C:\\Windows\\Fonts\\msyhbd.ttf",
    "C:\\Windows\\Fonts\\msyh.ttc",
    "C:\\Windows\\Fonts\\msyhbd.ttc",
    "C:\\Windows\\Fonts\\simhei.ttf",
    "C:\\Windows\\Fonts\\simsun.ttf",
    "C:\\Windows\\Fonts\\simsun.ttc",
    "C:\\Windows\\Fonts\\arial.ttf",
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    try {
      doc.font(p);
      return;
    } catch {
      // continue
    }
  }
  doc.font("Helvetica");
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

function asciiName(s: string) {
  return safeName(s).replace(/[^\x20-\x7E]/g, "_");
}

function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function todayTag() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function classLabel(cls: any) {
  return `${cls.course.name}${cls.subject ? ` / ${cls.subject.name}` : ""}${cls.level ? ` / ${cls.level.name}` : ""}`;
}

function drawCompanyHeader(doc: PDFDoc) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const top = doc.y;

  let logoH = 0;
  const logoW = 255;
  try {
    const logo = (doc as any).openImage(LOGO_PATH);
    if (logo?.width && logo?.height) {
      logoH = Math.round((logoW * logo.height) / logo.width);
    }
    doc.image(LOGO_PATH, left, top, { width: logoW });
  } catch {
    // ignore logo errors
  }

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

function drawHeader(doc: PDFDoc, title: string) {
  setupFont(doc);
  drawCompanyHeader(doc);
  doc.fillColor(ORANGE).fontSize(16).text(title);
  doc.fillColor("#666").fontSize(9);
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  doc.text(`Printed: ${fmtDate(new Date())}`, left, doc.y - 12, {
    width: right - left,
    align: "right",
  });
  doc.fillColor("#111");
  doc.moveDown(0.6);
}

function drawClassSection(doc: PDFDoc, cls: any, students: string[]) {
  const header = `${classLabel(cls)} | ${cls.teacher.name} | ${cls.campus.name}${cls.room ? ` / ${cls.room.name}` : ""}`;
  doc.fontSize(12).fillColor("#111").text(header, { continued: false });
  doc.fontSize(10).fillColor("#666").text(`Enrollments: ${students.length}`, { continued: false });
  doc.moveDown(0.4);

  const startX = 48;
  const colNo = 40;
  const colName = 520;
  const rowH = 18;

  // Header row
  doc.rect(startX, doc.y, colNo + colName, rowH).fill("#f3f4f6");
  doc.fillColor("#111").fontSize(10);
  doc.text("#", startX + 6, doc.y + 4, { width: colNo - 8 });
  doc.text("Student / 瀛︾敓", startX + colNo, doc.y + 4, { width: colName - 8 });
  doc.moveDown();

  if (students.length === 0) {
    doc.fillColor("#666").fontSize(10).text("-", startX + colNo, doc.y + 4, { width: colName - 8 });
    doc.moveDown();
    return;
  }

  for (let i = 0; i < students.length; i += 1) {
    const y = doc.y;
    if (y > 740) {
      doc.addPage();
      drawHeader(doc, "Enrollments / 报名清单");
    }
    const isEven = i % 2 === 1;
    if (isEven) {
      doc.rect(startX, doc.y, colNo + colName, rowH).fill("#fafafa");
    }
    doc.fillColor("#111").fontSize(10);
    doc.text(String(i + 1), startX + 6, doc.y + 4, { width: colNo - 8 });
    doc.text(students[i], startX + colNo, doc.y + 4, { width: colName - 8 });
    doc.moveDown();
  }
  doc.moveDown(0.4);
}

export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const classId = (url.searchParams.get("classId") || "").trim();
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const courseId = (url.searchParams.get("courseId") || "").trim();
  const subjectId = (url.searchParams.get("subjectId") || "").trim();
  const levelId = (url.searchParams.get("levelId") || "").trim();
  const teacherId = (url.searchParams.get("teacherId") || "").trim();
  const campusId = (url.searchParams.get("campusId") || "").trim();
  const classType = (url.searchParams.get("classType") || "").trim();

  const enrollments = await prisma.enrollment.findMany({
    include: {
      student: true,
      class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
    },
    orderBy: { id: "desc" },
    where: classId ? { classId } : undefined,
  });

  const filtered = enrollments.filter((e) => {
    if (courseId && e.class.courseId !== courseId) return false;
    if (subjectId && e.class.subjectId !== subjectId) return false;
    if (levelId && e.class.levelId !== levelId) return false;
    if (teacherId && e.class.teacherId !== teacherId) return false;
    if (campusId && e.class.campusId !== campusId) return false;
    if (classType === "one" && e.class.capacity !== 1) return false;
    if (classType === "group" && e.class.capacity === 1) return false;
    if (q) {
      const hay = [
        e.class.course.name,
        e.class.subject?.name ?? "",
        e.class.level?.name ?? "",
        e.class.teacher.name,
        e.class.campus.name,
        e.class.room?.name ?? "",
        e.student?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    return new Response("No enrollments found.", { status: 404 });
  }

  const grouped = new Map<string, { cls: any; students: string[] }>();
  for (const e of filtered) {
    const key = e.classId;
    if (!grouped.has(key)) grouped.set(key, { cls: e.class, students: [] });
    grouped.get(key)!.students.push(e.student?.name ?? "-");
  }

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  drawHeader(doc, "Enrollments / 报名清单");

  for (const { cls, students } of grouped.values()) {
    drawClassSection(doc, cls, students);
    if (doc.y > 740) {
      doc.addPage();
      drawHeader(doc, "Enrollments / 报名清单");
    }
  }

  const stream = streamPdf(doc);

  const fileName = classId
    ? `报名-Enrollment-${safeName(classLabel(grouped.get(classId)?.cls))}-${todayTag()}.pdf`
    : `报名-Enrollment-${todayTag()}.pdf`;
  const fileNameAscii = classId
    ? `Enrollment-${asciiName(classLabel(grouped.get(classId)?.cls))}-${todayTag()}.pdf`
    : `Enrollment-${todayTag()}.pdf`;
  const fileNameUtf8 = encodeURIComponent(fileName);

  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileNameAscii}"; filename*=UTF-8''${fileNameUtf8}`,
    },
  });
}


