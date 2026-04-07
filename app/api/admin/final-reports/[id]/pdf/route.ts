import { requireAdmin } from "@/lib/auth";
import { parseFinalReportDraft } from "@/lib/final-report";
import { getLang } from "@/lib/i18n";
import { setPdfBoldFont, setPdfFont } from "@/lib/pdf-font";
import { prisma } from "@/lib/prisma";
import { formatBusinessDateOnly } from "@/lib/date-only";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

type PDFDoc = InstanceType<typeof PDFDocument>;

const MM_TO_PT = 72 / 25.4;
function mm(value: number) {
  return value * MM_TO_PT;
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

function normalizeText(input: string | null | undefined) {
  const raw = String(input || "").replace(/\r/g, "").trim();
  return raw || "-";
}

function hasMeaningfulText(input: string | null | undefined) {
  const raw = String(input || "").replace(/\r/g, "").trim();
  return raw.length > 0 && raw !== "-";
}

function paintPageBackground(doc: PDFDoc) {
  doc.save();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill("#F8FAFC");
  doc.restore();
}

function panel(doc: PDFDoc, x: number, y: number, w: number, h: number, title: string, tone: { bg: string; border: string; title: string }) {
  doc.save();
  doc.lineWidth(0.8);
  doc.roundedRect(x, y, w, h, 8).fill(tone.bg).stroke(tone.border);
  doc.restore();

  setPdfBoldFont(doc);
  doc.fillColor(tone.title).fontSize(11.5).text(title, x + 10, y + 8, { width: w - 20 });
}

function field(doc: PDFDoc, x: number, y: number, w: number, label: string, value: string, height = 48) {
  setPdfBoldFont(doc);
  doc.fillColor("#475569").fontSize(8.5).text(label, x, y, { width: w });
  setPdfFont(doc);
  doc.fillColor("#0F172A").fontSize(10.5).text(normalizeText(value), x, y + 12, {
    width: w,
    height,
    lineGap: 1.5,
  });
}

function fitBodyFontSize(doc: PDFDoc, value: string, width: number, height: number, max = 9.2, min = 6.6) {
  const text = normalizeText(value);
  for (let size = max; size >= min; size -= 0.2) {
    const measured = doc.heightOfString(text, { width, lineGap: 1.15, align: "left" });
    if (measured <= height) return Number(size.toFixed(1));
    doc.fontSize(size);
  }
  return min;
}

function compactSectionText(
  doc: PDFDoc,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  tone: { bg: string; border: string; title: string } = { bg: "#FFFFFF", border: "#E2E8F0", title: "#0F172A" }
) {
  panel(doc, x, y, w, h, label, tone);
  const bodyX = x + 9;
  const bodyY = y + 26;
  const bodyW = w - 18;
  const bodyH = h - 34;
  const fontSize = fitBodyFontSize(doc, value, bodyW, bodyH);

  doc.save();
  doc.rect(bodyX, bodyY, bodyW, bodyH).clip();
  setPdfFont(doc);
  doc.fillColor("#1F2937").fontSize(fontSize).text(normalizeText(value), bodyX, bodyY, {
    width: bodyW,
    height: bodyH,
    lineGap: 1.15,
  });
  doc.restore();
}

function recommendationLabel(value: string, lang: "BILINGUAL" | "ZH" | "EN") {
  const zh =
    value === "CONTINUE_CURRENT"
      ? "继续当前课程"
      : value === "MOVE_TO_NEXT_LEVEL"
        ? "进入下一阶段"
        : value === "CHANGE_FOCUS"
          ? "调整课程方向"
          : value === "PAUSE_AFTER_COMPLETION"
            ? "结课后暂缓继续"
            : value === "COURSE_COMPLETED"
              ? "课程已完成"
              : "-";
  const en =
    value === "CONTINUE_CURRENT"
      ? "Continue current course"
      : value === "MOVE_TO_NEXT_LEVEL"
        ? "Move to next level"
        : value === "CHANGE_FOCUS"
          ? "Change subject or focus"
          : value === "PAUSE_AFTER_COMPLETION"
            ? "Pause after completion"
            : value === "COURSE_COMPLETED"
              ? "Course completed"
              : "-";
  if (lang === "ZH") return zh;
  if (lang === "EN") return en;
  return `${en} / ${zh}`;
}

function packageCompletionLabel(totalMinutes: number | null | undefined, lang: "BILINGUAL" | "ZH" | "EN") {
  const totalHours = Math.max(0, Math.round(Number(totalMinutes ?? 0) / 60));
  const zh = totalHours > 0 ? `已完成 ${totalHours} 小时课包学习` : "已完成本阶段学习";
  const en = totalHours > 0 ? `Completed ${totalHours} hours of study in this package` : "Completed this learning stage";
  if (lang === "ZH") return zh;
  if (lang === "EN") return en;
  return `${en} / ${zh}`;
}

function continuationPrompt(
  recommendation: string,
  lang: "BILINGUAL" | "ZH" | "EN",
  areasToContinue: string,
  finalLevel: string | null
) {
  const focus = hasMeaningfulText(areasToContinue) ? normalizeText(areasToContinue) : "";
  const levelHint = hasMeaningfulText(finalLevel) ? normalizeText(finalLevel) : "";
  const zhBase =
    recommendation === "CONTINUE_CURRENT"
      ? "建议尽快续读当前课程，保持这阶段已经建立起来的学习节奏。"
      : recommendation === "MOVE_TO_NEXT_LEVEL"
        ? "建议续读下一阶段课程，把这阶段打下的基础自然衔接到更高一级的学习目标。"
        : recommendation === "CHANGE_FOCUS"
          ? "建议续读并调整学习重点，让下一阶段的课程更贴合孩子目前最需要加强的方向。"
          : recommendation === "PAUSE_AFTER_COMPLETION"
            ? "当前阶段已经完成，可以先短暂停顿，再根据孩子兴趣和节奏安排下一轮学习。"
            : recommendation === "COURSE_COMPLETED"
              ? "当前课程目标已经完成，如家长希望继续延伸学习，可以安排下一阶段或相关主题课程。"
              : "建议结合孩子目前的学习状态，安排下一阶段最合适的学习计划。";
  const zhExtra = [levelHint ? `目前老师评估的阶段水平为：${levelHint}。` : "", focus ? `下一阶段可重点关注：${focus}` : ""]
    .filter(Boolean)
    .join("");

  const enBase =
    recommendation === "CONTINUE_CURRENT"
      ? "We recommend continuing the current course soon so the student can keep the momentum built during this stage."
      : recommendation === "MOVE_TO_NEXT_LEVEL"
        ? "We recommend renewing into the next level so this stage's progress can flow naturally into the next challenge."
        : recommendation === "CHANGE_FOCUS"
          ? "We recommend renewing with an adjusted learning focus so the next stage matches the student's current needs more closely."
          : recommendation === "PAUSE_AFTER_COMPLETION"
            ? "This stage is complete, so it is reasonable to pause briefly and plan the next round around the student's pace and interest."
            : recommendation === "COURSE_COMPLETED"
              ? "The current course goals are complete, and the family can consider a next-stage or related course if the student is ready to continue."
              : "We recommend planning the next study step based on the student's current progress and readiness.";
  const enExtra = [levelHint ? `Current teacher-evaluated level: ${levelHint}.` : "", focus ? `Suggested focus for the next stage: ${focus}` : ""]
    .filter(Boolean)
    .join(" ");

  if (lang === "ZH") return [zhBase, zhExtra].filter(Boolean).join("");
  if (lang === "EN") return [enBase, enExtra].filter(Boolean).join(" ");
  return [[enBase, enExtra].filter(Boolean).join(" "), [zhBase, zhExtra].filter(Boolean).join("")].filter(Boolean).join(" / ");
}

function compactFieldRow(doc: PDFDoc, x: number, y: number, w: number, items: Array<{ label: string; value: string }>) {
  const gap = 10;
  const itemW = (w - gap * (items.length - 1)) / items.length;
  items.forEach((item, index) => {
    field(doc, x + index * (itemW + gap), y, itemW, item.label, item.value, 24);
  });
}

function buildSections(lang: "BILINGUAL" | "ZH" | "EN", draft: ReturnType<typeof parseFinalReportDraft>, report: {
  reportPeriodLabel: string | null;
  finalLevel: string | null;
  recommendation: string | null;
}) {
  const sections: Array<{ title: string; value: string; tone?: { bg: string; border: string; title: string } }> = [];

  if (hasMeaningfulText(draft.finalSummary)) {
    sections.push({
      title: lang === "ZH" ? "最终结果总结" : lang === "EN" ? "Final outcome summary" : "Final outcome summary / 最终结果总结",
      value: draft.finalSummary,
      tone: { bg: "#FFFFFF", border: "#BBF7D0", title: "#166534" },
    });
  }
  if (hasMeaningfulText(draft.strengths)) {
    sections.push({
      title: lang === "ZH" ? "学生进步与优势" : lang === "EN" ? "Progress and strengths" : "Progress and strengths / 学生进步与优势",
      value: draft.strengths,
      tone: { bg: "#FFFFFF", border: "#FDE68A", title: "#92400E" },
    });
  }
  if (hasMeaningfulText(draft.areasToContinue)) {
    sections.push({
      title: lang === "ZH" ? "后续提升建议" : lang === "EN" ? "Areas to continue" : "Areas to continue / 后续提升建议",
      value: draft.areasToContinue,
      tone: { bg: "#FFFFFF", border: "#DDD6FE", title: "#6D28D9" },
    });
  }

  const recommendation = report.recommendation || draft.recommendedNextStep;
  const nextStepValue = continuationPrompt(recommendation, lang, draft.areasToContinue, report.finalLevel);
  if (hasMeaningfulText(nextStepValue)) {
    sections.push({
      title: lang === "ZH" ? "续课建议" : lang === "EN" ? "Recommended continuation" : "Recommended continuation / 续课建议",
      value: nextStepValue,
      tone: { bg: "#EFF6FF", border: "#BFDBFE", title: "#1D4ED8" },
    });
  }
  if (hasMeaningfulText(draft.parentNote)) {
    sections.push({
      title: lang === "ZH" ? "给家长的话" : lang === "EN" ? "Parent note" : "Parent note / 给家长的话",
      value: draft.parentNote,
      tone: { bg: "#FFF7ED", border: "#FDBA74", title: "#9A3412" },
    });
  }

  const learningHabits = [draft.attendanceComment, draft.homeworkComment].filter(hasMeaningfulText).join("\n\n");
  if (hasMeaningfulText(learningHabits)) {
    sections.push({
      title: lang === "ZH" ? "学习习惯观察" : lang === "EN" ? "Learning habits" : "Learning habits / 学习习惯观察",
      value: learningHabits,
      tone: { bg: "#F8FAFC", border: "#CBD5E1", title: "#334155" },
    });
  }

  if (hasMeaningfulText(draft.initialGoals)) {
    sections.push({
      title: lang === "ZH" ? "阶段目标回顾" : lang === "EN" ? "Goals reviewed" : "Goals reviewed / 阶段目标回顾",
      value: draft.initialGoals,
      tone: { bg: "#F8FAFC", border: "#CBD5E1", title: "#334155" },
    });
  }

  return sections;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const lang = await getLang();
  const { id } = await params;

  const report = await prisma.finalReport.findUnique({
    where: { id },
    include: { student: true, teacher: true, course: true, subject: true, package: true, deliveredByUser: { select: { name: true } } },
  });
  if (!report) return new Response("Report not found", { status: 404 });

  const draft = parseFinalReportDraft({
    ...(report.reportJson && typeof report.reportJson === "object" ? report.reportJson : {}),
    recommendedNextStep: report.recommendation ?? (report.reportJson as any)?.recommendedNextStep,
  });
  const sections = buildSections(lang, draft, report);

  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: mm(8),
  });
  setPdfFont(doc);
  paintPageBackground(doc);
  doc.on("pageAdded", () => {
    paintPageBackground(doc);
    setPdfFont(doc);
  });

  const left = doc.page.margins.left;
  const top = doc.page.margins.top;
  const right = doc.page.margins.right;
  const contentW = doc.page.width - left - right;
  const contentH = doc.page.height - top - doc.page.margins.bottom;
  const gap = 8;
  let y = top;

  setPdfBoldFont(doc);
  doc.fillColor("#111827").fontSize(18).text(lang === "ZH" ? "结课报告" : lang === "EN" ? "Final Report" : "Final Report / 结课报告", left, y, { width: contentW });
  setPdfFont(doc);
  doc.fillColor("#64748B").fontSize(9.2).text(
    lang === "ZH"
      ? `${report.student.name} · ${report.course.name}`
      : lang === "EN"
        ? `${report.student.name} · ${report.course.name}`
        : `${report.student.name} · ${report.course.name}`,
    left,
    y + 18,
    { width: contentW }
  );
  y += 34;

  const summaryH = 56;
  panel(doc, left, y, contentW, summaryH, lang === "ZH" ? "课程信息" : lang === "EN" ? "Course Overview" : "Course Overview / 课程信息", {
    bg: "#EFF6FF",
    border: "#BFDBFE",
    title: "#1D4ED8",
  });
  compactFieldRow(doc, left + 10, y + 24, contentW - 20, [
    { label: lang === "ZH" ? "学生" : lang === "EN" ? "Student" : "Student / 学生", value: report.student.name },
    { label: lang === "ZH" ? "课程" : lang === "EN" ? "Course" : "Course / 课程", value: `${report.course.name}${report.subject ? ` / ${report.subject.name}` : ""}` },
    { label: lang === "ZH" ? "老师" : lang === "EN" ? "Teacher" : "Teacher / 老师", value: report.teacher.name },
    { label: lang === "ZH" ? "学习阶段" : lang === "EN" ? "Learning period" : "Learning period / 学习阶段", value: report.reportPeriodLabel || (lang === "ZH" ? "本课包结课总结" : lang === "EN" ? "End-of-package summary" : "End-of-package summary / 本课包结课总结") },
  ]);
  y += summaryH + gap;

  const snapshotH = 54;
  panel(doc, left, y, contentW, snapshotH, lang === "ZH" ? "阶段成果与续课方向" : lang === "EN" ? "Progress and continuation" : "Progress and continuation / 阶段成果与续课方向", {
    bg: "#ECFDF5",
    border: "#BBF7D0",
    title: "#166534",
  });
  compactFieldRow(doc, left + 10, y + 22, contentW - 20, [
    { label: lang === "ZH" ? "阶段完成情况" : lang === "EN" ? "Stage progress" : "Stage progress / 阶段完成情况", value: packageCompletionLabel(report.package.totalMinutes, lang) },
    { label: lang === "ZH" ? "最终水平" : lang === "EN" ? "Final level" : "Final level / 最终水平", value: hasMeaningfulText(report.finalLevel) ? String(report.finalLevel) : (lang === "ZH" ? "由老师填写" : lang === "EN" ? "Added by teacher" : "Added by teacher / 由老师填写") },
    { label: lang === "ZH" ? "续课方向" : lang === "EN" ? "Continuation path" : "Continuation path / 续课方向", value: recommendationLabel(report.recommendation || draft.recommendedNextStep, lang) },
  ]);
  y += snapshotH + gap;

  const remainingH = top + contentH - y;
  const bodyRows = sections.length <= 3 ? 1 : sections.length <= 6 ? 2 : 3;
  const rowGap = gap;
  const colW = (contentW - gap * 2) / 3;
  const rowH = Math.floor((remainingH - rowGap * (bodyRows - 1)) / bodyRows);
  sections.forEach((section, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const sectionY = y + row * (rowH + rowGap);
    const sectionX = left + col * (colW + gap);
    compactSectionText(doc, sectionX, sectionY, colW, rowH, section.title, section.value, section.tone);
  });

  const stream = streamPdf(doc);
  const filename = `final-report-${safeName(report.student.name)}-${safeName(report.course.name)}.pdf`;
  const filenameAscii = filename.replace(/[^\x20-\x7E]/g, "_");
  const filenameUtf8 = encodeURIComponent(filename);

  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"${filenameAscii}\"; filename*=UTF-8''${filenameUtf8}`,
    },
  });
}
