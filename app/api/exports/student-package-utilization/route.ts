import { requireAdmin } from "@/lib/auth";
import { loadStudentPackageUtilizationReport } from "@/lib/student-package-utilization-report";
import ExcelJS from "exceljs";

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

function asciiFileName(value: string) {
  return value
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/"/g, "")
    .replace(/\s+/g, "_");
}

function applyHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FF0F172A" } };
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFDBEAFE" },
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
      cell.alignment = {
        vertical: "middle",
        horizontal: typeof cell.value === "number" ? "right" : "left",
        wrapText: true,
      };
    });
  }
}

export async function GET(req: Request) {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const report = await loadStudentPackageUtilizationReport({
    studentId: searchParams.get("studentId"),
    studentName: searchParams.get("studentName") ?? searchParams.get("name"),
    packageId: searchParams.get("packageId"),
    startDate: searchParams.get("startDate"),
    endDate: searchParams.get("endDate"),
  });

  if (!report.ok || report.needDisambiguation || !report.student) {
    return new Response(report.message ?? "Unable to export report.", { status: 400 });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SGT Manage";
  workbook.created = new Date();
  workbook.modified = new Date();

  const summary = workbook.addWorksheet("Summary");
  summary.mergeCells("A1:F1");
  summary.getCell("A1").value = "Student Package Utilization";
  summary.getCell("A1").font = { bold: true, size: 15, color: { argb: "FF0F172A" } };
  summary.getCell("A2").value = `Student: ${report.student.name}`;
  summary.getCell("A3").value = `Date range: ${report.query.startDate || "Beginning"} to ${report.query.endDate}`;
  summary.getCell("A4").value = `Package ID: ${report.query.packageId || "All packages used by this student"}`;
  summary.getCell("A5").value = `Generated at: ${report.generatedAt}`;
  summary.getCell("A7").value = "Lesson count";
  summary.getCell("B7").value = report.lessonCount;
  summary.getCell("A8").value = "Total deducted hours";
  summary.getCell("B8").value = report.totalDeductedHours;
  summary.getCell("A9").value = "Total deducted minutes";
  summary.getCell("B9").value = report.totalDeductedMinutes;
  summary.getColumn("A").width = 28;
  summary.getColumn("B").width = 24;
  summary.getColumn("B").numFmt = "0.00";

  const details = workbook.addWorksheet("Attendance Detail");
  details.mergeCells("A1:Q1");
  details.getCell("A1").value = "Attendance-based package utilization detail";
  details.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF0F172A" } };
  details.getCell("A2").value = "Scope: PRESENT/LATE attendance rows with deducted minutes only";
  details.columns = [
    { header: "Student Name", key: "studentName", width: 26 },
    { header: "Session Date", key: "sessionDate", width: 14 },
    { header: "Session Start", key: "sessionStart", width: 12 },
    { header: "Session End", key: "sessionEnd", width: 12 },
    { header: "Attendance Status", key: "attendanceStatus", width: 18 },
    { header: "Deducted Hours", key: "deductedHours", width: 14 },
    { header: "Deducted Minutes", key: "deductedMinutes", width: 16 },
    { header: "Course", key: "courseName", width: 26 },
    { header: "Subject", key: "subjectName", width: 18 },
    { header: "Level", key: "levelName", width: 18 },
    { header: "Teacher", key: "teacherName", width: 22 },
    { header: "Package Owner", key: "packageOwnerName", width: 24 },
    { header: "Package ID", key: "packageId", width: 38 },
    { header: "Session ID", key: "sessionId", width: 38 },
    { header: "Attendance ID", key: "attendanceId", width: 38 },
    { header: "Period Start", key: "periodStart", width: 14 },
    { header: "Period End", key: "periodEnd", width: 14 },
  ];
  const detailHeader = details.getRow(4);
  detailHeader.values = details.columns.map((column) => column.header as string);
  applyHeader(detailHeader);
  for (const row of report.detailRows) {
    details.addRow({
      studentName: report.student.name,
      sessionDate: row.sessionDate,
      sessionStart: row.sessionStart,
      sessionEnd: row.sessionEnd,
      attendanceStatus: row.attendanceStatus,
      deductedHours: row.deductedHours,
      deductedMinutes: row.deductedMinutes,
      courseName: row.courseName,
      subjectName: row.subjectName,
      levelName: row.levelName,
      teacherName: row.teacherName,
      packageOwnerName: row.packageOwnerName,
      packageId: row.packageId,
      sessionId: row.sessionId,
      attendanceId: row.attendanceId,
      periodStart: report.query.startDate || "",
      periodEnd: report.query.endDate,
    });
  }
  details.views = [{ state: "frozen", ySplit: 4 }];
  details.autoFilter = { from: "A4", to: "Q4" };
  details.getColumn("F").numFmt = "0.00";
  applyDataBorders(details, 5);

  const packages = workbook.addWorksheet("Available Packages");
  packages.columns = [
    { header: "Package ID", key: "packageId", width: 38 },
    { header: "Owner", key: "ownerName", width: 24 },
    { header: "Course", key: "courseName", width: 26 },
    { header: "Status", key: "status", width: 14 },
    { header: "Total Hours", key: "totalHours", width: 14 },
    { header: "Remaining Hours", key: "remainingHours", width: 16 },
    { header: "Shared With", key: "sharedWith", width: 36 },
  ];
  const packageHeader = packages.getRow(1);
  packageHeader.values = packages.columns.map((column) => column.header as string);
  applyHeader(packageHeader);
  for (const row of report.packageOptions) {
    packages.addRow({
      ...row,
      totalHours: row.totalHours == null ? "" : row.totalHours,
      remainingHours: row.remainingHours == null ? "" : row.remainingHours,
    });
  }
  packages.views = [{ state: "frozen", ySplit: 1 }];
  packages.autoFilter = { from: "A1", to: "G1" };
  packages.getColumn("E").numFmt = "0.00";
  packages.getColumn("F").numFmt = "0.00";
  applyDataBorders(packages, 2);

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = safeFileName(
    `student-package-utilization-${report.student.name}-${report.query.endDate}.xlsx`
  );
  const fileNameAscii = asciiFileName(`student-package-utilization-${report.query.endDate}.xlsx`);
  const fileNameUtf8 = encodeURIComponent(fileName);

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileNameAscii}"; filename*=UTF-8''${fileNameUtf8}`,
    },
  });
}
