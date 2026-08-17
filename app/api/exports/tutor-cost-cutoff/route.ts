import { requireAdmin } from "@/lib/auth";
import {
  formatMoneyCents,
  formatTeachingModeLabel,
  loadTutorCostCutoffReport,
  parseMonth,
} from "@/lib/teacher-payroll";
import { prisma } from "@/lib/prisma";
import { formatPayNowType, formatPaymentProfileStatus, formatTeacherPaymentMethod } from "@/lib/teacher-payment-profile";
import ExcelJS from "exceljs";

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

function moneyCents(cents: number) {
  return Number((cents / 100).toFixed(2));
}

function applyHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FF0F172A" } };
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };
  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });
}

function applyDataBorders(sheet: ExcelJS.Worksheet, startRow: number) {
  for (let rowIndex = startRow; rowIndex <= sheet.rowCount; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
      cell.alignment = { vertical: "middle", horizontal: typeof cell.value === "number" ? "right" : "left", wrapText: true };
    });
  }
}

export async function GET(req: Request) {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const month = String(searchParams.get("month") ?? "").trim();
  if (!parseMonth(month)) {
    return new Response("Invalid month format. Use YYYY-MM.", { status: 400 });
  }

  const report = await loadTutorCostCutoffReport(month);
  if (!report) {
    return new Response("Invalid month format. Use YYYY-MM.", { status: 400 });
  }
  const teacherIds = Array.from(new Set([
    ...report.summaryRows.map((row) => row.teacherId),
    ...report.detailRows.map((row) => row.teacherId),
  ]));
  const teacherProfiles = teacherIds.length
    ? await prisma.teacher.findMany({
        where: { id: { in: teacherIds } },
        select: {
          id: true,
          tutorCode: true,
          paymentMethod: true,
          payNowType: true,
          payNowValue: true,
          payNowName: true,
          wiseAccountName: true,
          wiseEmail: true,
          wisePhone: true,
          wiseTag: true,
          wiseCountry: true,
          wiseCurrency: true,
          paymentProfileStatus: true,
          bankName: true,
          bankAccountName: true,
          bankAccountNumber: true,
          bankBranchCode: true,
        },
      })
    : [];
  const teacherProfileMap = new Map(teacherProfiles.map((teacher) => [teacher.id, teacher]));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SGT Manage";
  workbook.created = new Date();
  workbook.modified = new Date();

  const summary = workbook.addWorksheet("Summary");
  summary.mergeCells("A1:W1");
  summary.getCell("A1").value = "Tutor Cost Cut-off Report";
  summary.getCell("A1").font = { bold: true, size: 15, color: { argb: "FF0F172A" } };
  summary.getCell("A2").value = `Period: ${report.periodLabel} (inclusive of the 15th)`;
  summary.getCell("A3").value = "Scope: completed and confirmed sessions only";
  summary.getCell("A4").value = `Generated at: ${new Date().toISOString()}`;
  summary.getCell("A5").value = `Total sessions: ${report.totalSessions}`;
  summary.getCell("B5").value = `Total hours: ${report.totalHours.toFixed(2)}`;
  summary.getCell("C5").value = `Total cost: ${report.grandCurrencyTotals.map((x) => formatMoneyCents(x.amountCents, x.currencyCode)).join(" / ") || "SGD 0.00"}`;
  summary.columns = [
    { header: "Tutor Code", key: "tutorCode", width: 14 },
    { header: "Teacher", key: "teacherName", width: 24 },
    { header: "Payment Method", key: "paymentMethod", width: 16 },
    { header: "PayNow Type", key: "payNowType", width: 14 },
    { header: "PayNow ID / Mobile", key: "payNowValue", width: 22 },
    { header: "PayNow Name", key: "payNowName", width: 22 },
    { header: "Wise Account Holder", key: "wiseAccountName", width: 22 },
    { header: "Wise Email", key: "wiseEmail", width: 24 },
    { header: "Wise Phone", key: "wisePhone", width: 18 },
    { header: "WiseTag", key: "wiseTag", width: 18 },
    { header: "Wise Country", key: "wiseCountry", width: 16 },
    { header: "Wise Currency", key: "wiseCurrency", width: 14 },
    { header: "Payment Profile Status", key: "paymentProfileStatus", width: 20 },
    { header: "Legacy Bank Name", key: "bankName", width: 22 },
    { header: "Legacy Bank Account Name", key: "bankAccountName", width: 22 },
    { header: "Legacy Bank Account Number", key: "bankAccountNumber", width: 22 },
    { header: "Legacy SWIFT / Branch Code", key: "bankBranchCode", width: 20 },
    { header: "Sessions", key: "sessionCount", width: 12 },
    { header: "Included in Monthly Salary", key: "includedInSalarySessions", width: 24 },
    { header: "Hours", key: "totalHours", width: 12 },
    { header: "Currency", key: "currencyCode", width: 12 },
    { header: "Tutor Cost", key: "amount", width: 16 },
    { header: "Teacher ID", key: "teacherId", width: 38 },
  ];
  const summaryHeader = summary.getRow(7);
  summaryHeader.values = summary.columns.map((column) => column.header as string);
  applyHeader(summaryHeader);
  for (const row of report.summaryRows) {
    const profile = teacherProfileMap.get(row.teacherId);
    summary.addRow({
      tutorCode: profile?.tutorCode ?? "",
      teacherName: row.teacherName,
      paymentMethod: formatTeacherPaymentMethod(profile?.paymentMethod),
      payNowType: formatPayNowType(profile?.payNowType),
      payNowValue: profile?.payNowValue ?? "",
      payNowName: profile?.payNowName ?? "",
      wiseAccountName: profile?.wiseAccountName ?? "",
      wiseEmail: profile?.wiseEmail ?? "",
      wisePhone: profile?.wisePhone ?? "",
      wiseTag: profile?.wiseTag ?? "",
      wiseCountry: profile?.wiseCountry ?? "",
      wiseCurrency: profile?.wiseCurrency ?? "",
      paymentProfileStatus: formatPaymentProfileStatus(profile?.paymentProfileStatus),
      bankName: profile?.bankName ?? "",
      bankAccountName: profile?.bankAccountName ?? "",
      bankAccountNumber: profile?.bankAccountNumber ?? "",
      bankBranchCode: profile?.bankBranchCode ?? "",
      sessionCount: row.sessionCount,
      includedInSalarySessions: row.includedInSalarySessions,
      totalHours: row.totalHours,
      currencyCode: row.currencyCode,
      amount: moneyCents(row.amountCents),
      teacherId: row.teacherId,
    });
  }
  summary.views = [{ state: "frozen", ySplit: 7 }];
  summary.autoFilter = { from: "A7", to: "W7" };
  summary.getColumn("T").numFmt = "0.00";
  summary.getColumn("V").numFmt = "#,##0.00";
  applyDataBorders(summary, 8);

  const details = workbook.addWorksheet("Details");
  details.mergeCells("A1:AG1");
  details.getCell("A1").value = "Completed and Confirmed Session Details";
  details.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF0F172A" } };
  details.getCell("A2").value = `Period: ${report.periodLabel}`;
  details.getCell("A3").value = "Only sessions with completed confirmation status are included.";
  details.columns = [
    { header: "Session Date", key: "sessionDate", width: 14 },
    { header: "Start", key: "startTime", width: 10 },
    { header: "End", key: "endTime", width: 10 },
    { header: "Tutor Code", key: "tutorCode", width: 14 },
    { header: "Teacher", key: "teacherName", width: 22 },
    { header: "Payment Method", key: "paymentMethod", width: 16 },
    { header: "PayNow Type", key: "payNowType", width: 14 },
    { header: "PayNow ID / Mobile", key: "payNowValue", width: 22 },
    { header: "PayNow Name", key: "payNowName", width: 22 },
    { header: "Wise Account Holder", key: "wiseAccountName", width: 22 },
    { header: "Wise Email", key: "wiseEmail", width: 24 },
    { header: "Wise Phone", key: "wisePhone", width: 18 },
    { header: "WiseTag", key: "wiseTag", width: 18 },
    { header: "Wise Country", key: "wiseCountry", width: 16 },
    { header: "Wise Currency", key: "wiseCurrency", width: 14 },
    { header: "Payment Profile Status", key: "paymentProfileStatus", width: 20 },
    { header: "Legacy Bank Name", key: "bankName", width: 22 },
    { header: "Legacy Bank Account Name", key: "bankAccountName", width: 22 },
    { header: "Legacy Bank Account Number", key: "bankAccountNumber", width: 22 },
    { header: "Legacy SWIFT / Branch Code", key: "bankBranchCode", width: 20 },
    { header: "Student(s)", key: "studentName", width: 32 },
    { header: "Course", key: "courseName", width: 28 },
    { header: "Subject", key: "subjectName", width: 18 },
    { header: "Level", key: "levelName", width: 22 },
    { header: "Teaching Mode", key: "teachingMode", width: 14 },
    { header: "Hours", key: "totalHours", width: 10 },
    { header: "Hourly Rate", key: "hourlyRate", width: 14 },
    { header: "Payment Treatment", key: "paymentTreatment", width: 24 },
    { header: "Contractual Hourly Equivalent", key: "contractualAmount", width: 24 },
    { header: "Exception Reason", key: "exceptionReason", width: 28 },
    { header: "Currency", key: "currencyCode", width: 10 },
    { header: "Tutor Cost", key: "amount", width: 14 },
    { header: "Session ID", key: "sessionId", width: 38 },
  ];
  const detailHeader = details.getRow(5);
  detailHeader.values = details.columns.map((column) => column.header as string);
  applyHeader(detailHeader);
  for (const row of report.detailRows) {
    const profile = teacherProfileMap.get(row.teacherId);
    details.addRow({
      sessionDate: row.sessionDate,
      startTime: row.startTime,
      endTime: row.endTime,
      tutorCode: profile?.tutorCode ?? "",
      teacherName: row.teacherName,
      paymentMethod: formatTeacherPaymentMethod(profile?.paymentMethod),
      payNowType: formatPayNowType(profile?.payNowType),
      payNowValue: profile?.payNowValue ?? "",
      payNowName: profile?.payNowName ?? "",
      wiseAccountName: profile?.wiseAccountName ?? "",
      wiseEmail: profile?.wiseEmail ?? "",
      wisePhone: profile?.wisePhone ?? "",
      wiseTag: profile?.wiseTag ?? "",
      wiseCountry: profile?.wiseCountry ?? "",
      wiseCurrency: profile?.wiseCurrency ?? "",
      paymentProfileStatus: formatPaymentProfileStatus(profile?.paymentProfileStatus),
      bankName: profile?.bankName ?? "",
      bankAccountName: profile?.bankAccountName ?? "",
      bankAccountNumber: profile?.bankAccountNumber ?? "",
      bankBranchCode: profile?.bankBranchCode ?? "",
      studentName: row.studentName,
      courseName: row.courseName,
      subjectName: row.subjectName ?? "",
      levelName: row.levelName ?? "",
      teachingMode: formatTeachingModeLabel(row.teachingMode),
      totalHours: row.totalHours,
      hourlyRate: moneyCents(row.hourlyRateCents),
      paymentTreatment: row.paymentTreatment.payMode === "INCLUDED_IN_SALARY" ? "Included in monthly salary" : "Separately payable",
      contractualAmount: moneyCents(row.contractualAmountCents),
      exceptionReason: row.paymentTreatment.source === "SESSION_OVERRIDE" ? row.paymentTreatment.reason ?? "" : "",
      currencyCode: row.currencyCode,
      amount: moneyCents(row.amountCents),
      sessionId: row.sessionId,
    });
  }
  details.views = [{ state: "frozen", ySplit: 5 }];
  details.autoFilter = { from: "A5", to: "AG5" };
  details.getColumn("Z").numFmt = "0.00";
  details.getColumn("AA").numFmt = "#,##0.00";
  details.getColumn("AC").numFmt = "#,##0.00";
  details.getColumn("AF").numFmt = "#,##0.00";
  applyDataBorders(details, 6);

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = safeFileName(`tutor-cost-cutoff-${month}-15-to-month-end.xlsx`);
  const fileNameUtf8 = encodeURIComponent(fileName);

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${fileNameUtf8}`,
    },
  });
}
