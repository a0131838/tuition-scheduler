import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import fs from "fs";
import { getLang } from "@/lib/i18n";
import { requireAdmin } from "@/lib/auth";
import { choose, fmtYMD, loadMonthlyScheduleData, safeName } from "../../_lib";

type PDFDoc = InstanceType<typeof PDFDocument>;

function setupFont(doc: PDFDoc) {
  const candidates = [
    "C:\\Windows\\Fonts\\simhei.ttf",
    "C:\\Windows\\Fonts\\simsun.ttc",
    "C:\\Windows\\Fonts\\msyh.ttc",
    "C:\\Windows\\Fonts\\arial.ttf",
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (found) {
    doc.font(found);
    return;
  }
  doc.font("Helvetica");
}

function streamPdf(doc: PDFDoc) {
  const stream = new PassThrough();
  doc.pipe(stream);
  doc.end();
  return stream;
}

function lineTime(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? "";
  const teacherId = url.searchParams.get("teacherId") ?? "";
  const campusId = url.searchParams.get("campusId") ?? "";
  const lang = await getLang();

  const data = await loadMonthlyScheduleData({ month, teacherId, campusId });
  if (!data) return new Response("Invalid month format. Use YYYY-MM.", { status: 400 });

  const doc = new PDFDocument({ size: "A4", margin: 36 });
  setupFont(doc);
  doc.fontSize(14).text(choose(lang, "Monthly Schedule Calendar", "\u6708\u8bfe\u8868\u603b\u89c8"));
  doc.moveDown(0.3);
  doc.fontSize(10).text(`${choose(lang, "Month", "\u6708\u4efd")}: ${month}`);
  doc.text(`${choose(lang, "Total Sessions", "\u603b\u8bfe\u6b21\u6570")}: ${data.sessions.length}`);
  doc.moveDown(0.5);

  const sessionsByDay = new Map<string, typeof data.sessions>();
  for (const s of data.sessions) {
    const key = fmtYMD(new Date(s.startAt));
    const list = sessionsByDay.get(key) ?? [];
    list.push(s);
    sessionsByDay.set(key, list);
  }

  const keys = Array.from(sessionsByDay.keys()).sort();
  if (keys.length === 0) {
    doc.fontSize(10).text(choose(lang, "No sessions for this filter.", "\u5f53\u524d\u7b5b\u9009\u6761\u4ef6\u4e0b\u6ca1\u6709\u8bfe\u6b21\u3002"));
  } else {
    for (const day of keys) {
      if (doc.y > 760) {
        doc.addPage();
        setupFont(doc);
      }
      doc.fontSize(11).fillColor("#111111").text(day);
      doc.moveDown(0.2);
      const list = sessionsByDay.get(day) ?? [];
      for (const s of list) {
        if (doc.y > 780) {
          doc.addPage();
          setupFont(doc);
        }
        const teacherName = s.teacher?.name ?? s.class.teacher.name;
        const students = s.class.enrollments.map((e) => e.student.name).filter(Boolean).join(", ");
        const line1 = `${lineTime(new Date(s.startAt))}-${lineTime(new Date(s.endAt))} | ${teacherName} | ${s.class.course.name}${s.class.subject ? ` / ${s.class.subject.name}` : ""}${s.class.level ? ` / ${s.class.level.name}` : ""}`;
        const line2 = `${s.class.campus.name}${s.class.room ? ` / ${s.class.room.name}` : ""} | ${choose(lang, "Students", "\u5b66\u751f")}: ${students || "-"}`;
        doc.fontSize(9).fillColor("black").text(line1);
        doc.fontSize(8).fillColor("#555555").text(line2);
        doc.moveDown(0.25);
      }
      doc.moveDown(0.35);
    }
  }

  const stream = streamPdf(doc);
  const fileName = `monthly-schedule-${safeName(month)}.pdf`;
  const fileNameUtf8 = encodeURIComponent(fileName);
  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${fileNameUtf8}`,
    },
  });
}
