import { requireLearningEvidenceUser } from "@/lib/student-learning-evidence-access";
import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";
import { getLang } from "@/lib/i18n";
import { logAudit } from "@/lib/audit-log";
import { loadStudentLearningEvidence } from "@/lib/student-learning-evidence-data";
import { labelLearningEvidenceAttendance } from "@/lib/student-learning-evidence";
import { parseParentFeedbackSections } from "@/lib/parent-feedback-format";
import { setPdfBoldFont, setPdfFont } from "@/lib/pdf-font";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

type PDFDoc = InstanceType<typeof PDFDocument>;

function safeName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

function streamPdf(doc: PDFDoc) {
  const stream = new PassThrough();
  doc.pipe(stream);
  doc.end();
  return stream;
}

function divider(doc: PDFDoc) {
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor("#CBD5E1").stroke();
  doc.moveDown(0.5);
}

function title(doc: PDFDoc, value: string) {
  setPdfBoldFont(doc);
  doc.fillColor("#0F766E").fontSize(13).text(value);
  setPdfFont(doc);
  doc.fillColor("#0F172A");
  doc.moveDown(0.25);
}

function pageHeader(doc: PDFDoc, studentName: string, pageTitle = "Student Learning Evidence Pack / 学生学习证据包") {
  setPdfBoldFont(doc);
  doc.fillColor("#0F766E").fontSize(16).text(pageTitle);
  setPdfFont(doc);
  doc.fillColor("#475569").fontSize(8.5).text(`${studentName} · Internal teaching use only / 仅供内部教学规划使用`);
  doc.fillColor("#0F172A");
  doc.moveDown(0.55);
  divider(doc);
}

function nextPage(doc: PDFDoc, studentName: string) {
  doc.addPage();
  pageHeader(doc, studentName);
}

function textOrDash(value: string | null | undefined) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || "-";
}

function ensureSpace(doc: PDFDoc, height: number, studentName: string) {
  if (doc.y + height > doc.page.height - doc.page.margins.bottom) nextPage(doc, studentName);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireLearningEvidenceUser();
  const { id: studentId } = await params;
  const url = new URL(req.url);
  const evidence = await loadStudentLearningEvidence({
    studentId,
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    courseId: url.searchParams.get("courseId"),
  });
  if (!evidence) return new Response("Student not found", { status: 404 });

  const lang = await getLang();
  const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true });
  setPdfFont(doc);
  doc.lineGap(1.4);
  pageHeader(doc, evidence.student.name);

  const dateRange = `${formatBusinessDateOnly(evidence.range.from)} – ${formatBusinessDateOnly(evidence.range.to)}`;
  setPdfBoldFont(doc);
  doc.fontSize(11).text(lang === "EN" ? "Evidence scope" : "证据范围 / Evidence scope");
  setPdfFont(doc);
  doc.fontSize(9.5).text(`Student / 学生: ${evidence.student.name}`);
  doc.text(`Period / 时间范围: ${dateRange}`);
  doc.text(`Generated / 生成时间: ${formatBusinessDateTime(new Date())}`);
  doc.text(`Source / 数据来源: published, non-draft feedback linked to the student's formal sessions / 已发布、非代理草稿且关联正式课次的反馈`);
  doc.moveDown(0.55);

  title(doc, "Learning coverage / 学习覆盖概览");
  const attendanceText = Object.entries(evidence.snapshot.attendance)
    .map(([status, count]) => `${labelLearningEvidenceAttendance(status)}: ${count}`)
    .join(" · ") || "-";
  doc.fontSize(9.5).text(`Formal lessons / 正式课次: ${evidence.snapshot.sessionCount}`);
  doc.text(`Published feedback / 已发布反馈: ${evidence.snapshot.feedbackCount} (${evidence.snapshot.feedbackCoveragePercent}% lesson coverage)`);
  doc.text(`Attendance / 点名: ${attendanceText}`);
  doc.text(`Homework evidence / 作业证据: assigned ${evidence.snapshot.homeworkAssignedCount}; tracked ${evidence.snapshot.homeworkTrackingCount}; done ${evidence.snapshot.homeworkDoneCount}; not done ${evidence.snapshot.homeworkNotDoneCount}`);
  doc.moveDown(0.55);

  title(doc, "Data completeness / 数据完整度");
  if (evidence.snapshot.gaps.length === 0) {
    doc.fontSize(9.5).text("The selected evidence has no system-detected completeness gap. Human academic review is still required. / 系统未发现资料完整度缺口，仍需教务人工复核。");
  } else {
    for (const gap of evidence.snapshot.gaps) {
      doc.fontSize(9.5).text(`• ${gap.label}: ${gap.detail}`);
    }
  }
  doc.moveDown(0.55);

  title(doc, "Observed focus and next steps / 观察到的重点与后续方向");
  const focus = evidence.snapshot.focusAreas.length ? evidence.snapshot.focusAreas : ["No repeated focus can be stated until more verified feedback is available. / 需补充已验证反馈后再判断重复重点。"];
  const nextSteps = evidence.snapshot.nextSteps.length ? evidence.snapshot.nextSteps : ["No repeated next step can be stated from the selected evidence. / 当前证据不足以归纳重复的下一步。"];
  doc.fontSize(9.5).text(`Focus areas / 重点观察:\n${focus.map((value) => `• ${value}`).join("\n")}`);
  doc.moveDown(0.35);
  doc.text(`Next steps recorded by teachers / 老师已记录的下一步:\n${nextSteps.map((value) => `• ${value}`).join("\n")}`);
  doc.moveDown(0.7);

  title(doc, "Feedback timeline / 反馈时间线");
  if (!evidence.feedbacks.length) {
    doc.fontSize(10).text("No published feedback matches this student and period. / 当前学生与时间范围内没有已发布反馈。");
  }

  for (const row of evidence.feedbacks) {
    ensureSpace(doc, 120, evidence.student.name);
    setPdfBoldFont(doc);
    doc.fillColor("#0F172A").fontSize(10.5).text(`${formatBusinessDateTime(row.sessionStartAt)} · ${row.courseLabel}`);
    setPdfFont(doc);
    doc.fillColor("#475569").fontSize(8.8).text(`Teacher / 老师: ${row.teacherName} · Attendance / 点名: ${labelLearningEvidenceAttendance(row.attendanceStatus)}`);
    doc.fillColor("#0F172A");
    const sections = parseParentFeedbackSections(row.feedbackContent);
    const pairs = [
      ["Lesson focus / 本节课重点", sections.lessonFocus],
      ["Current finding / 目前发现", sections.currentFinding],
      ["Class performance / 课堂表现", sections.classPerformance],
      ["Next plan / 下一步计划", sections.nextPlan],
      ["Parent note / 家长需要知道", sections.parentNote],
      ["Homework / 作业", row.homework],
    ] as const;
    for (const [label, value] of pairs) {
      const body = textOrDash(value);
      const height = doc.heightOfString(`${label}: ${body}`, { width: doc.page.width - doc.page.margins.left - doc.page.margins.right, lineGap: 1.1 });
      ensureSpace(doc, Math.min(height + 12, 190), evidence.student.name);
      setPdfBoldFont(doc);
      doc.fontSize(8.8).text(`${label}: `, { continued: true });
      setPdfFont(doc);
      doc.fontSize(8.8).text(body);
    }
    setPdfBoldFont(doc);
    doc.fontSize(8.8).text("Previous homework completed / 上次作业完成: ", { continued: true });
    setPdfFont(doc);
    doc.fontSize(8.8).text(row.previousHomeworkDone === null ? "Not recorded / 未记录" : row.previousHomeworkDone ? "Yes / 是" : "No / 否");
    doc.moveDown(0.55);
    divider(doc);
  }

  const rangeMeta = { from: formatBusinessDateOnly(evidence.range.from), to: formatBusinessDateOnly(evidence.range.to), courseId: url.searchParams.get("courseId") || null, feedbackCount: evidence.snapshot.feedbackCount };
  await logAudit({ actor, module: "STUDENT_LEARNING_EVIDENCE", action: "EXPORT_PDF", entityType: "Student", entityId: studentId, meta: rangeMeta });

  const fileName = `student-learning-evidence_${safeName(evidence.student.name)}_${formatBusinessDateOnly(evidence.range.from)}_${formatBusinessDateOnly(evidence.range.to)}.pdf`;
  return new Response(streamPdf(doc) as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName.replace(/[^\x20-\x7E]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
