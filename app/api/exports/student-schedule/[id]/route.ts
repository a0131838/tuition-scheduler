import { prisma } from "@/lib/prisma";
import { getLang, type Lang } from "@/lib/i18n";
import { requireAdmin } from "@/lib/auth";

type PDFDoc = InstanceType<typeof PDFDocument>;
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import fs from "fs";
import path from "path";

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

function choose(lang: Lang, en: string, zh: string) {
  if (lang === "EN") return en;
  if (lang === "ZH") return zh;
  return `${en} / ${zh}`;
}

function shouldShowLogoByStudentTypeName(typeName?: string | null) {
  if (!typeName) return false;
  const normalized = typeName.toLowerCase();
  if (normalized.includes("\u81ea\u5df1\u5b66\u751f")) return true;
  return /(^|\s|-|_)(own|self)\s*student(s)?($|\s|-|_)/i.test(typeName);
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

function fmtYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfCalendar(d: Date) {
  const first = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const weekday = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - weekday);
  return start;
}

function buildCalendarDays(monthDate: Date) {
  const start = startOfCalendar(monthDate);
  const days: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({
      date: d,
      inMonth: d.getMonth() === monthDate.getMonth(),
    });
  }
  return days;
}

function drawCompanyHeader(doc: PDFDoc, showLogo: boolean) {
  if (!showLogo) return;
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const top = doc.y;

  let logoH = 90;
  const logoW = 320;
  try {
    const img = (doc as any).openImage(LOGO_PATH);
    if (img?.width && img?.height) {
      logoH = Math.round((logoW * img.height) / img.width);
    }
    doc.image(LOGO_PATH, left, top, { width: logoW });
  } catch {}

  doc.y = top + logoH + 8;
  doc.moveTo(left, doc.y).lineTo(right, doc.y).stroke();
  doc.moveDown(0.3);
}

function drawPrintedTimeHeader(doc: PDFDoc, lang: Lang) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  doc.fontSize(8);
  doc.text(`${choose(lang, "Printed", "\u6253\u5370\u65f6\u95f4")}: ${formatDate(new Date())}`, left, doc.y, {
    width: right - left,
    align: "right",
  });
  doc.moveDown(0.4);
}

function drawHeader(doc: PDFDoc, lang: Lang, titleEn: string, titleZh: string, showLogo: boolean) {
  drawCompanyHeader(doc, showLogo);
  setupFont(doc);
  drawPrintedTimeHeader(doc, lang);
}

function drawMonthCalendar(
  doc: PDFDoc,
  lang: Lang,
  sessions: {
    id: string;
    startAt: Date;
    endAt: Date;
    class: {
      course: { name: string };
      subject?: { name: string } | null;
      level?: { name: string } | null;
      teacher: { name: string };
      campus: { name: string };
      room?: { name: string } | null;
    };
  }[],
  attendanceMap: Map<string, { status: string; excusedCharge: boolean }>,
  year: number,
  month: number
) {
  const monthDate = new Date(year, month - 1, 1);
  const days = buildCalendarDays(monthDate);
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const top = doc.y + 6;
  const fullWidth = right - left;
  const width = Math.min(fullWidth, fullWidth * 1.2);
  const offsetX = left + (fullWidth - width) / 2;
  const cellW = width / 7;
  const cellH = 64;

  const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  doc.fontSize(9);
  for (let i = 0; i < 7; i += 1) {
    const x = offsetX + i * cellW;
    doc.rect(x, top, cellW, 16).fill(ORANGE);
    doc.fillColor("white");
    doc.text(weekdayNames[i], x + 4, top + 3, { width: cellW - 8, align: "left" });
    doc.fillColor("black");
    doc.rect(x, top, cellW, 16).stroke();
  }

  const sessionsByDay = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const att = attendanceMap.get(s.id);
    if (att?.status === "EXCUSED") continue;
    const key = fmtYMD(new Date(s.startAt));
    const arr = sessionsByDay.get(key) ?? [];
    arr.push(s);
    sessionsByDay.set(key, arr);
  }

  const overflowByDay = new Map<string, typeof sessions>();

  doc.fontSize(7);
  for (let row = 0; row < 6; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const idx = row * 7 + col;
      const day = days[idx];
      const x = offsetX + col * cellW;
      const y = top + 16 + row * cellH;
      doc.rect(x, y, cellW, cellH).stroke();

      const dateLabel = day.date.getDate().toString();
      const isWeekend = col === 5 || col === 6;
      const dateColor = day.inMonth ? (isWeekend ? "#c2410c" : "black") : "#999";
      doc.fillColor(dateColor);
      doc.text(dateLabel, x + 3, y + 2, { width: cellW - 6, align: "left" });
      doc.fillColor("black");

      const key = fmtYMD(day.date);
      const daySessions = sessionsByDay.get(key) ?? [];
      let lineY = y + 14;
      const maxY = y + cellH - 6;
      const lineH = 7;
      const maxLines = Math.max(1, Math.floor((maxY - lineY) / lineH));

      const entries = daySessions.map((s) => {
        const time = `${String(new Date(s.startAt).getHours()).padStart(2, "0")}:${String(
          new Date(s.startAt).getMinutes()
        ).padStart(2, "0")}-${String(new Date(s.endAt).getHours()).padStart(2, "0")}:${String(
          new Date(s.endAt).getMinutes()
        ).padStart(2, "0")}`;
        const subjectText = s.class.subject?.name ?? s.class.course.name ?? "";
        const subjectInitial = subjectText ? subjectText.trim().charAt(0) : "";
        return { s, line: `${time} ${subjectInitial} ${s.class.teacher.name}` };
      });

      const visible = entries.slice(0, maxLines);
      const hidden = entries.slice(maxLines);

      for (const item of visible) {
        doc.text(item.line, x + 4, lineY, { width: cellW - 8, lineBreak: false });
        lineY += lineH;
      }

      if (hidden.length > 0) {
        doc.fillColor("#999").text("...", x + 4, lineY, { width: cellW - 8, lineBreak: false });
        doc.fillColor("black");
        overflowByDay.set(
          key,
          hidden.map((h) => h.s)
        );
      }
    }
  }

  return overflowByDay;
}

function parseMonthParam(month?: string | null) {
  if (!month) return null;
  const m = month.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(mm) || mm < 1 || mm > 12) return null;
  return { year, month: mm };
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  await requireAdmin();
  const url = new URL(req.url);
  const monthParam = url.searchParams.get("month");
  const startParam = url.searchParams.get("start");
  const endParam = url.searchParams.get("end");
  const parsed = parseMonthParam(monthParam);

  let year: number | null = null;
  let month: number | null = null;
  let monthStart: Date | null = null;
  let monthEnd: Date | null = null;

  if (startParam && endParam) {
    const start = new Date(`${startParam}T00:00:00`);
    const end = new Date(`${endParam}T23:59:59.999`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return new Response("Invalid date range", { status: 400 });
    }
    monthStart = start;
    monthEnd = end;
  } else if (parsed) {
    year = parsed.year;
    month = parsed.month;
    monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
    monthEnd = new Date(year, month, 1, 0, 0, 0, 0);
  } else {
    return new Response("Invalid month", { status: 400 });
  }
  const studentId = params.id;
  const lang = await getLang();

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { studentType: true },
  });
  if (!student) return new Response("Student not found", { status: 404 });
  const showLogo = shouldShowLogoByStudentTypeName(student.studentType?.name);

  if (!monthStart || !monthEnd) {
    return new Response("Invalid date range", { status: 400 });
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    select: { classId: true },
  });
  const classIds = enrollments.map((e) => e.classId);

  const sessions = classIds.length
    ? await prisma.session.findMany({
        where: {
          classId: { in: classIds },
          startAt: { gte: monthStart, lt: monthEnd },
        },
        include: {
          class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
        },
        orderBy: { startAt: "asc" },
      })
    : [];

  const sessionIds = sessions.map((s) => s.id);
  const attendance = sessionIds.length
    ? await prisma.attendance.findMany({
        where: { studentId, sessionId: { in: sessionIds } },
        select: { sessionId: true, status: true, excusedCharge: true },
      })
    : [];
  const attendanceMap = new Map(attendance.map((a) => [a.sessionId, a]));

  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 40 });
  setupFont(doc);
  doc.lineGap(2);

  drawHeader(doc, lang, "Monthly Schedule", "\u6708\u8bfe\u8868", showLogo);
  doc.fontSize(10);
  doc.text(`${choose(lang, "Student", "\u5b66\u751f")}: ${student.name}`);
  if (year && month) {
    doc.text(`${choose(lang, "Month", "\u6708\u4efd")}: ${year}-${String(month).padStart(2, "0")}`);
  } else {
    doc.text(
      `${choose(lang, "Range", "\u65e5\u671f\u8303\u56f4")}: ${formatDate(monthStart)} ~ ${formatDate(monthEnd)}`
    );
  }
  doc.moveDown(0.6);

  if (year && month) {
    if (sessions.length === 0) {
      doc.fontSize(10).text(choose(lang, "No sessions in this month.", "\u672c\u6708\u65e0\u8bfe\u6b21"));
    } else {
      const overflow = drawMonthCalendar(doc, lang, sessions, attendanceMap, year, month);
      if (overflow && overflow.size > 0) {
        doc.addPage();
        setupFont(doc);
        drawHeader(doc, lang, "Schedule (Overflow)", "\u8bfe\u8868\uff08\u7ee7\u7eed\uff09", showLogo);
        doc.moveDown(0.4);
        doc
          .fontSize(10)
          .text(
            choose(
              lang,
              "Too many sessions for calendar cells. Extra list:",
              "\u5f53\u65e5\u8bfe\u6b21\u8d85\u51fa\u683c\u5b50\uff0c\u5176\u4ed6\u8bfe\u6b21\u5217\u8868\uff1a"
            )
          );
        doc.moveDown(0.4);
        const keys = Array.from(overflow.keys()).sort();
        for (const key of keys) {
          const list = overflow.get(key) ?? [];
          if (list.length === 0) continue;
          doc.fontSize(10).text(`${key}`);
          for (const s of list) {
            const subjectText = s.class.subject?.name ?? s.class.course.name ?? "";
            const line1 = `${formatDateTime(new Date(s.startAt))} - ${new Date(s.endAt).toLocaleTimeString()} | ${subjectText}`;
            const line2 = `${s.class.teacher.name} | ${s.class.campus.name}${s.class.room ? ` / ${s.class.room.name}` : ""}`;
            doc.fontSize(9).text(line1);
            doc.fontSize(8).text(line2);
            doc.moveDown(0.2);
          }
          doc.moveDown(0.4);
        }
      }
    }
  } else {
    if (sessions.length === 0) {
      doc.fontSize(10).text(choose(lang, "No sessions in this range.", "\u6b64\u65e5\u671f\u8303\u56f4\u5185\u65e0\u8bfe\u6b21"));
    } else {
      for (const s of sessions) {
        if (doc.y > 740) {
        doc.addPage();
        setupFont(doc);
          drawHeader(doc, lang, "Schedule", "\u8bfe\u8868", showLogo);
        doc.moveDown(0.4);
        }
        const att = attendanceMap.get(s.id);
        const cancelled = att?.status === "EXCUSED";
        const statusText = cancelled
          ? choose(lang, "Cancelled", "\u5df2\u53d6\u6d88")
          : choose(lang, "Scheduled", "\u5df2\u6392\u8bfe");
        const chargeText = att?.excusedCharge ? ` (${choose(lang, "Charged", "\u6263\u8d39")})` : "";
        const courseText = s.class.subject?.name ?? s.class.course.name ?? "";
        const placeText = `${s.class.campus.name}${s.class.room ? ` / ${s.class.room.name}` : ""}`;
        const line1 = `${formatDateTime(new Date(s.startAt))} - ${new Date(s.endAt).toLocaleTimeString()} | ${courseText}`;
        const line2 = `${s.class.teacher.name} | ${placeText} | ${statusText}${chargeText}`;
        doc.fontSize(10).text(line1);
        doc.fontSize(9).fillColor(cancelled ? "#888888" : "black").text(line2);
        doc.fillColor("black");
        doc.moveDown(0.3);
      }
    }
  }

  const stream = streamPdf(doc);
  const baseName =
    lang === "EN"
      ? "schedule"
      : lang === "ZH"
      ? "\u8bfe\u8868"
      : "schedule_\u8bfe\u8868";
  const rangeLabel =
    year && month
      ? `${year}-${String(month).padStart(2, "0")}`
      : `${formatDate(monthStart)}_to_${formatDate(monthEnd)}`;
  const fileName = `${baseName}_${safeName(student.name)}_${rangeLabel}.pdf`;
  const fileNameAscii = `schedule_${safeName(student.name)}_${rangeLabel}.pdf`.replace(/[^\x20-\x7E]/g, "_");
  const fileNameUtf8 = encodeURIComponent(fileName);
  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"${fileNameAscii}\"; filename*=UTF-8''${fileNameUtf8}`,
    },
  });
}

