import { requireAdmin } from "@/lib/auth";
import { getPartnerInvoiceById } from "@/lib/partner-billing";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

const ATTENDED_STATUSES = new Set(["PRESENT", "LATE"]);
const OFFLINE_RATE_KEY = "partner_settlement_offline_rate_per_45";
const DEFAULT_OFFLINE_RATE_PER_45 = 90;
const TZ = "Asia/Shanghai";

function parseMonthKey(monthKey: string | null | undefined) {
  const s = String(monthKey ?? "").trim();
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mon = Number(m[2]);
  if (!Number.isFinite(y) || !Number.isFinite(mon) || mon < 1 || mon > 12) return null;
  return { y, mon };
}

function toBizMonthRangeByMonthKey(monthKey: string) {
  const p = parseMonthKey(monthKey);
  if (!p) return null;
  const offsetMs = 8 * 60 * 60 * 1000;
  const start = new Date(Date.UTC(p.y, p.mon - 1, 1, 0, 0, 0, 0) - offsetMs);
  const end = new Date(Date.UTC(p.y, p.mon, 1, 0, 0, 0, 0) - offsetMs);
  return { start, end, y: p.y, mon: p.mon };
}

function formatDateCN(d: Date) {
  const parts = new Intl.DateTimeFormat("zh-CN", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const y = parts.find((x) => x.type === "year")?.value ?? "";
  const m = parts.find((x) => x.type === "month")?.value ?? "";
  const day = parts.find((x) => x.type === "day")?.value ?? "";
  return `${y}-${m}-${day}`;
}

function formatTimeRangeCN(start: Date, end: Date) {
  const f = new Intl.DateTimeFormat("zh-CN", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
  return `${f.format(start)}-${f.format(end)}`;
}

function safeName(s: string) {
  return s.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const invoice = await getPartnerInvoiceById(id);
  if (!invoice) return new Response("Invoice not found", { status: 404 });
  if (invoice.mode !== "OFFLINE_MONTHLY") return new Response("Only offline monthly invoice supports detail export", { status: 400 });

  const monthKey = invoice.monthKey;
  const range = toBizMonthRangeByMonthKey(monthKey ?? "");
  if (!range) return new Response("Invalid invoice month", { status: 400 });

  const setting = await prisma.appSetting.findUnique({ where: { key: OFFLINE_RATE_KEY }, select: { value: true } });
  const ratePer45 = Number(setting?.value ?? DEFAULT_OFFLINE_RATE_PER_45);
  const unitRate = Number.isFinite(ratePer45) && ratePer45 >= 0 ? ratePer45 : DEFAULT_OFFLINE_RATE_PER_45;

  const settlementIds = Array.from(new Set(invoice.settlementIds.map((x) => String(x ?? "").trim()).filter(Boolean)));
  const settlements = settlementIds.length
    ? await prisma.partnerSettlement.findMany({
        where: { id: { in: settlementIds } },
        select: { studentId: true },
      })
    : [];
  const studentIds = Array.from(new Set(settlements.map((x) => x.studentId).filter(Boolean)));

  const rows = studentIds.length
    ? await prisma.attendance.findMany({
        where: {
          studentId: { in: studentIds },
          package: { is: { settlementMode: "OFFLINE_MONTHLY" } },
          session: {
            startAt: { gte: range.start, lt: range.end },
            feedbacks: { some: { content: { not: "" } } },
          },
        },
        select: {
          status: true,
          excusedCharge: true,
          student: { select: { name: true } },
          session: {
            select: {
              startAt: true,
              endAt: true,
              class: {
                select: {
                  subject: { select: { name: true } },
                  course: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: [{ student: { name: "asc" } }, { session: { startAt: "asc" } }],
      })
    : [];

  const detailRows = rows
    .filter((r) => ATTENDED_STATUSES.has(r.status) || (r.status === "EXCUSED" && Boolean(r.excusedCharge)))
    .map((r) => {
      const durationMins = Math.max(0, Math.round((r.session.endAt.getTime() - r.session.startAt.getTime()) / 60000));
      const qty45 = Number((durationMins / 45).toFixed(2));
      // Keep settlement math consistent with billing list total: round((minutes/45) * ratePer45)
      const lineTotal = Math.round((durationMins / 45) * unitRate);
      return {
        studentName: r.student?.name ?? "-",
        date: formatDateCN(r.session.startAt),
        timeRange: formatTimeRangeCN(r.session.startAt, r.session.endAt),
        lessonQty: qty45,
        subject: r.session.class?.subject?.name || r.session.class?.course?.name || "-",
        unitRate,
        lineTotal,
      };
    });

  const totalLessonQty = Number(detailRows.reduce((sum, r) => sum + r.lessonQty, 0).toFixed(2));
  const totalAmount = Number(detailRows.reduce((sum, r) => sum + r.lineTotal, 0).toFixed(2));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("明细");
  sheet.columns = [
    { header: "学生姓名", key: "studentName", width: 18 },
    { header: "日期", key: "date", width: 14 },
    { header: "上课时间", key: "timeRange", width: 18 },
    { header: "课时", key: "lessonQty", width: 10 },
    { header: "科目", key: "subject", width: 18 },
    { header: "单课时费", key: "unitRate", width: 12 },
    { header: "总课时费", key: "lineTotal", width: 12 },
  ];

  const endDay = new Date(range.y, range.mon, 0).getDate();
  const title = `${range.y}年${range.mon}月1日-${endDay}日已上课学生名单统计`;
  sheet.mergeCells("A1:G1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = title;
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.font = { bold: true, size: 14 };
  sheet.getRow(1).height = 24;

  const headerRow = sheet.getRow(3);
  headerRow.values = ["学生姓名", "日期", "上课时间", "课时", "科目", "单课时费", "总课时费"];
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };

  for (const r of detailRows) {
    const row = sheet.addRow({
      studentName: r.studentName,
      date: r.date,
      timeRange: r.timeRange,
      lessonQty: r.lessonQty,
      subject: r.subject,
      unitRate: r.unitRate,
      lineTotal: r.lineTotal,
    });
    row.getCell(4).numFmt = "0.00";
    row.getCell(6).numFmt = "0.00";
    row.getCell(7).numFmt = "0.00";
  }

  sheet.addRow([]);
  const totalLessonRow = sheet.addRow([`合计：${totalLessonQty.toFixed(2)}课时`]);
  const totalAmountRow = sheet.addRow([`合计：$${totalAmount.toFixed(2)}`]);
  totalLessonRow.getCell(1).font = { bold: true };
  totalAmountRow.getCell(1).font = { bold: true };
  totalLessonRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
  totalAmountRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber < 3) return;
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFD9D9D9" } },
        left: { style: "thin", color: { argb: "FFD9D9D9" } },
        bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
        right: { style: "thin", color: { argb: "FFD9D9D9" } },
      };
      if (rowNumber > 3) {
        cell.alignment = { vertical: "middle", horizontal: colNumber >= 4 ? "right" : "left" };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `partner_detail_${safeName(invoice.invoiceNo)}.xlsx`;
  const fileNameAscii = fileName.replace(/[^\x20-\x7E]/g, "_");
  const fileNameUtf8 = encodeURIComponent(fileName);
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileNameAscii}"; filename*=UTF-8''${fileNameUtf8}`,
    },
  });
}
