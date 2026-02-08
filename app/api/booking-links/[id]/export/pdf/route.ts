import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { bookingSlotKey, listBookingSlotsForMonth, monthKey, parseMonth, ymd } from "@/lib/booking";

type PDFDoc = InstanceType<typeof PDFDocument>;

function streamPdf(doc: PDFDoc) {
  const stream = new PassThrough();
  doc.pipe(stream);
  doc.end();
  return stream;
}

function buildCalendarDays(monthDate: Date) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(first);
  const day = start.getDay();
  const shift = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + shift);
  return Array.from({ length: 42 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { date: d, inMonth: d.getMonth() === monthDate.getMonth() };
  });
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  await requireAdmin();
  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? monthKey(new Date());
  const parsed = parseMonth(month);
  if (!parsed) return new Response("Invalid month format. Use YYYY-MM.", { status: 400 });
  const monthDate = new Date(parsed.year, parsed.month - 1, 1);

  const link = await prisma.studentBookingLink.findUnique({
    where: { id: params.id },
    include: {
      student: true,
      teachers: { include: { teacher: true }, orderBy: { teacher: { name: "asc" } } },
      selectedSlots: { select: { teacherId: true, startAt: true, endAt: true } },
    },
  });
  if (!link) return new Response("Link not found", { status: 404 });

  const slotsData = await listBookingSlotsForMonth({
    linkId: link.id,
    teachers: link.teachers.map((x) => ({ teacherId: x.teacherId, teacherName: x.teacher.name })),
    startDate: link.startDate,
    endDate: link.endDate,
    durationMin: link.durationMin,
    stepMin: link.slotStepMin,
    month,
    selectedSlotSet: link.onlySelectedSlots
      ? new Set(link.selectedSlots.map((s) => bookingSlotKey(s.teacherId, new Date(s.startAt), new Date(s.endAt))))
      : undefined,
    onlySelectedSlots: link.onlySelectedSlots,
  });
  const slots = slotsData?.slots ?? [];

  const byDay = new Map<string, typeof slots>();
  for (const s of slots) {
    const key = ymd(new Date(s.startAt));
    const arr = byDay.get(key) ?? [];
    arr.push(s);
    byDay.set(key, arr);
  }

  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 28 });
  doc.fontSize(14).text(link.title || "Student Booking Availability Calendar");
  doc.moveDown(0.2);
  doc.fontSize(9).text(`Student: ${link.student.name}`);
  doc.text(`Month: ${month}`);
  doc.text(`Window: ${link.startDate.toLocaleDateString()} - ${link.endDate.toLocaleDateString()}`);
  doc.text(`Teachers: ${link.teachers.map((x) => x.teacher.name).join(", ")}`);
  doc.text(`Duration: ${link.durationMin} min`);
  doc.text(`Start step: ${link.slotStepMin} min`);
  doc.moveDown(0.4);

  const days = buildCalendarDays(monthDate);
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const top = doc.y;
  const tableW = right - left;
  const headH = 18;
  const cellH = 82;
  const cellW = tableW / 7;
  const weekNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  doc.fontSize(9);
  for (let c = 0; c < 7; c += 1) {
    const x = left + c * cellW;
    doc.rect(x, top, cellW, headH).fillAndStroke("#f3f3f3", "#dddddd");
    doc.fillColor("black").text(weekNames[c], x + 4, top + 4, { width: cellW - 8 });
  }

  for (let r = 0; r < 6; r += 1) {
    for (let c = 0; c < 7; c += 1) {
      const idx = r * 7 + c;
      const day = days[idx];
      const x = left + c * cellW;
      const y = top + headH + r * cellH;
      doc.rect(x, y, cellW, cellH).stroke("#e5e5e5");

      doc.fontSize(8).fillColor(day.inMonth ? "#111111" : "#999999");
      doc.text(String(day.date.getDate()), x + 3, y + 3, { width: 20 });

      const list = byDay.get(ymd(day.date)) ?? [];
      const maxLines = 6;
      let lineY = y + 16;
      doc.fillColor("#111111").fontSize(7);
      for (const s of list.slice(0, maxLines)) {
        doc.text(`${s.startLabel}-${s.endLabel} ${s.teacherName}`, x + 3, lineY, {
          width: cellW - 6,
          lineBreak: false,
          ellipsis: true,
        });
        lineY += 10;
      }
      if (list.length > maxLines) {
        doc.fillColor("#666666").fontSize(7).text(`+${list.length - maxLines} more`, x + 3, lineY, { width: cellW - 6 });
      }
    }
  }

  const stream = streamPdf(doc);
  const fileName = `booking-calendar-${month}.pdf`;
  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
