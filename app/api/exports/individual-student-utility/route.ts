import { requireAdmin } from "@/lib/auth";
import {
  generatedAtLabel,
  loadIndividualStudentUtilityReport,
  minutesToHours,
} from "@/lib/individual-student-utility-report";
import ExcelJS from "exceljs";

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

function applyHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FF0F172A" } };
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD1FAE5" },
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
  const periodType = searchParams.get("periodType") ?? "monthly";
  const month = searchParams.get("month") ?? "";
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";

  const report = await loadIndividualStudentUtilityReport({ periodType, month, startDate, endDate });
  if (!report) {
    return new Response("Invalid period or date range.", { status: 400 });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SGT Manage";
  workbook.created = new Date();
  workbook.modified = new Date();

  const summary = workbook.addWorksheet("Student Summary");
  summary.mergeCells("A1:I1");
  summary.getCell("A1").value = "Individual Student Utility Report";
  summary.getCell("A1").font = { bold: true, size: 15, color: { argb: "FF0F172A" } };
  summary.getCell("A2").value = `Period: ${report.range.label}`;
  summary.getCell("A3").value = "Scope: individual students only; confirmed attendance with deducted minutes only";
  summary.getCell("A4").value = `Generated at: ${generatedAtLabel()}`;
  summary.getCell("A5").value = `Students: ${report.totalStudents}`;
  summary.getCell("B5").value = `Lessons: ${report.totalLessons}`;
  summary.getCell("C5").value = `Deducted hours: ${report.totalDeductedHours.toFixed(2)}`;
  summary.columns = [
    { header: "Student Name", key: "studentName", width: 26 },
    { header: "Student Type", key: "studentType", width: 22 },
    { header: "Source Channel", key: "sourceChannel", width: 28 },
    { header: "Total Deducted Hours", key: "totalDeductedHours", width: 18 },
    { header: "Lesson Count", key: "lessonCount", width: 12 },
    { header: "Courses Used", key: "coursesUsed", width: 36 },
    { header: "Latest Lesson Date", key: "latestLessonDate", width: 16 },
    { header: "Current Remaining Hours", key: "currentRemainingHours", width: 20 },
    { header: "Student ID", key: "studentId", width: 38 },
  ];
  const summaryHeader = summary.getRow(7);
  summaryHeader.values = summary.columns.map((column) => column.header as string);
  applyHeader(summaryHeader);
  for (const row of report.summaryRows) {
    summary.addRow({
      studentName: row.studentName,
      studentType: row.studentType,
      sourceChannel: row.sourceChannel,
      totalDeductedHours: row.totalDeductedHours,
      lessonCount: row.lessonCount,
      coursesUsed: row.coursesUsed,
      latestLessonDate: row.latestLessonDate,
      currentRemainingHours: row.currentRemainingHours,
      studentId: row.studentId,
    });
  }
  summary.views = [{ state: "frozen", ySplit: 7 }];
  summary.autoFilter = { from: "A7", to: "I7" };
  summary.getColumn("D").numFmt = "0.00";
  summary.getColumn("H").numFmt = "0.00";
  applyDataBorders(summary, 8);

  const details = workbook.addWorksheet("Utility Detail");
  details.mergeCells("A1:S1");
  details.getCell("A1").value = "Individual Student Utility Detail";
  details.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF0F172A" } };
  details.getCell("A2").value = `Period: ${report.range.label}`;
  details.getCell("A3").value = "Report date basis: lesson/session date";
  details.columns = [
    { header: "Period Start", key: "periodStart", width: 14 },
    { header: "Period End", key: "periodEnd", width: 14 },
    { header: "Student Name", key: "studentName", width: 26 },
    { header: "Student Type", key: "studentType", width: 22 },
    { header: "Source Channel", key: "sourceChannel", width: 28 },
    { header: "Course", key: "courseName", width: 28 },
    { header: "Subject", key: "subjectName", width: 18 },
    { header: "Level", key: "levelName", width: 18 },
    { header: "Teacher", key: "teacherName", width: 22 },
    { header: "Session Date", key: "sessionDate", width: 14 },
    { header: "Session Start", key: "sessionStart", width: 12 },
    { header: "Session End", key: "sessionEnd", width: 12 },
    { header: "Attendance Status", key: "attendanceStatus", width: 18 },
    { header: "Deducted Hours", key: "deductedHours", width: 14 },
    { header: "Package ID", key: "packageId", width: 38 },
    { header: "Package Status", key: "packageStatus", width: 16 },
    { header: "Package Remaining Hours", key: "packageRemainingHours", width: 22 },
    { header: "Package Settlement Mode", key: "packageSettlementMode", width: 24 },
    { header: "Attendance ID", key: "attendanceId", width: 38 },
  ];
  const detailHeader = details.getRow(5);
  detailHeader.values = details.columns.map((column) => column.header as string);
  applyHeader(detailHeader);
  for (const row of report.detailRows) {
    details.addRow({
      periodStart: report.range.startDate,
      periodEnd: report.range.endDate,
      studentName: row.studentName,
      studentType: row.studentType,
      sourceChannel: row.sourceChannel,
      courseName: row.courseName,
      subjectName: row.subjectName,
      levelName: row.levelName,
      teacherName: row.teacherName,
      sessionDate: row.sessionDate,
      sessionStart: row.sessionStart,
      sessionEnd: row.sessionEnd,
      attendanceStatus: row.attendanceStatus,
      deductedHours: row.deductedHours,
      packageId: row.packageId,
      packageStatus: row.packageStatus,
      packageRemainingHours: row.packageRemainingHours == null ? "" : minutesToHours(row.packageRemainingMinutes),
      packageSettlementMode: row.packageSettlementMode,
      attendanceId: row.attendanceId,
    });
  }
  details.views = [{ state: "frozen", ySplit: 5 }];
  details.autoFilter = { from: "A5", to: "S5" };
  details.getColumn("N").numFmt = "0.00";
  details.getColumn("Q").numFmt = "0.00";
  applyDataBorders(details, 6);

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = safeFileName(`individual-student-utility-${report.range.periodType}-${report.range.startDate}-to-${report.range.endDate}.xlsx`);
  const fileNameUtf8 = encodeURIComponent(fileName);

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${fileNameUtf8}`,
    },
  });
}
