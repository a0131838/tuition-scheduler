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

function nextFocusSummary(
  recommendation: string,
  lang: "BILINGUAL" | "ZH" | "EN",
  areasToContinue: string,
  finalLevel: string | null
) {
  const focus = hasMeaningfulText(areasToContinue) ? normalizeText(areasToContinue) : "";
  const levelHint = hasMeaningfulText(finalLevel) ? normalizeText(finalLevel) : "";
  const zhBase =
    recommendation === "CONTINUE_CURRENT"
      ? "从老师的观察来看，孩子已经建立起稳定的学习节奏，下一阶段更适合继续巩固当前课程里的核心能力。"
      : recommendation === "MOVE_TO_NEXT_LEVEL"
        ? "从老师的观察来看，孩子已经具备进入下一阶段的基础，接下来可以在更高一级的要求下继续提升。"
        : recommendation === "CHANGE_FOCUS"
          ? "从老师的观察来看，孩子已经有一定基础，下一阶段更适合根据目前最需要加强的方向做针对性调整。"
          : recommendation === "PAUSE_AFTER_COMPLETION"
            ? "当前阶段已经完成，老师建议先按孩子的节奏整理吸收，再决定下一步安排。"
            : recommendation === "COURSE_COMPLETED"
              ? "当前课程目标已经基本完成，后续更适合根据孩子的兴趣和学习目标决定延伸方向。"
              : "从老师的观察来看，孩子已经有阶段性进步，后续可以继续围绕当前最关键的学习点慢慢推进。";
  const zhExtra = [levelHint ? `目前老师评估的阶段水平为：${levelHint}。` : "", focus ? `接下来更值得关注的是：${focus}` : ""]
    .filter(Boolean)
    .join("");

  const enBase =
    recommendation === "CONTINUE_CURRENT"
      ? "From the teacher's perspective, the student has built a steady learning rhythm, and the next stage is best used to keep strengthening the core skills from the current course."
      : recommendation === "MOVE_TO_NEXT_LEVEL"
        ? "From the teacher's perspective, the student is ready for the next level, where this stage's foundation can be developed under a higher level of challenge."
        : recommendation === "CHANGE_FOCUS"
          ? "From the teacher's perspective, the student has a solid base, and the next stage would benefit from a more targeted adjustment in learning focus."
          : recommendation === "PAUSE_AFTER_COMPLETION"
            ? "This stage is complete, and the teacher suggests giving the student a little time to consolidate before deciding on the next step."
            : recommendation === "COURSE_COMPLETED"
              ? "The current course goals are broadly complete, and the next direction can be chosen based on the student's interests and longer-term learning goals."
              : "From the teacher's perspective, the student has made meaningful progress, and the next stage can keep building around the most important remaining learning points.";
  const enExtra = [levelHint ? `Current teacher-evaluated level: ${levelHint}.` : "", focus ? `The next area worth focusing on is: ${focus}` : ""]
    .filter(Boolean)
    .join(" ");

  if (lang === "ZH") return [zhBase, zhExtra].filter(Boolean).join("");
  if (lang === "EN") return [enBase, enExtra].filter(Boolean).join(" ");
  return [[enBase, enExtra].filter(Boolean).join(" "), [zhBase, zhExtra].filter(Boolean).join("")].filter(Boolean).join(" / ");
}

function focusLabel(
  recommendation: string,
  lang: "BILINGUAL" | "ZH" | "EN",
  areasToContinue: string
) {
  if (hasMeaningfulText(areasToContinue)) return normalizeText(areasToContinue);
  const zh =
    recommendation === "CONTINUE_CURRENT"
      ? "继续巩固当前核心能力"
      : recommendation === "MOVE_TO_NEXT_LEVEL"
        ? "逐步进入下一阶段要求"
        : recommendation === "CHANGE_FOCUS"
          ? "针对薄弱点调整重点"
          : recommendation === "PAUSE_AFTER_COMPLETION"
            ? "先整理吸收本阶段内容"
            : recommendation === "COURSE_COMPLETED"
              ? "根据兴趣规划下一方向"
              : "继续围绕核心能力推进";
  const en =
    recommendation === "CONTINUE_CURRENT"
      ? "Continue strengthening current core skills"
      : recommendation === "MOVE_TO_NEXT_LEVEL"
        ? "Gradually move into the next level"
        : recommendation === "CHANGE_FOCUS"
          ? "Adjust focus toward weaker areas"
          : recommendation === "PAUSE_AFTER_COMPLETION"
            ? "Consolidate this stage first"
            : recommendation === "COURSE_COMPLETED"
              ? "Plan the next direction from interest"
              : "Keep building the core skills";
  if (lang === "ZH") return zh;
  if (lang === "EN") return en;
  return `${en} / ${zh}`;
}

function compactFieldRow(doc: PDFDoc, x: number, y: number, w: number, items: Array<{ label: string; value: string }>) {
  const gap = 10;
  const itemW = (w - gap * (items.length - 1)) / items.length;
  items.forEach((item, index) => {
    field(doc, x + index * (itemW + gap), y, itemW, item.label, item.value, 24);
  });
}

function sectionRowDistribution(count: number) {
  if (count <= 0) return [];
  if (count === 1) return [1];
  if (count === 2) return [2];
  if (count === 3) return [3];
  if (count === 4) return [2, 2];
  if (count === 5) return [2, 3];
  if (count === 6) return [3, 3];
  if (count === 7) return [2, 2, 3];
  if (count === 8) return [3, 2, 3];
  return [3, 3, 3];
}

function buildSections(lang: "BILINGUAL" | "ZH" | "EN", draft: ReturnType<typeof parseFinalReportDraft>, report: {
  reportPeriodLabel: string | null;
  finalLevel: string | null;
  recommendation: string | null;
}) {
  const sections: Array<{ title: string; value: string; tone?: { bg: string; border: string; title: string } }> = [];

  if (hasMeaningfulText(draft.finalSummary)) {
    sections.push({
      title: lang === "ZH" ? "本阶段学习总结" : lang === "EN" ? "This stage in summary" : "This stage in summary / 本阶段学习总结",
      value: draft.finalSummary,
      tone: { bg: "#FFFFFF", border: "#BBF7D0", title: "#166534" },
    });
  }
  if (hasMeaningfulText(draft.strengths)) {
    sections.push({
      title: lang === "ZH" ? "这阶段看到的进步" : lang === "EN" ? "Progress we observed" : "Progress we observed / 这阶段看到的进步",
      value: draft.strengths,
      tone: { bg: "#FFFFFF", border: "#FDE68A", title: "#92400E" },
    });
  }
  if (hasMeaningfulText(draft.areasToContinue)) {
    sections.push({
      title: lang === "ZH" ? "接下来可以继续加强的地方" : lang === "EN" ? "Areas to keep strengthening" : "Areas to keep strengthening / 接下来可以继续加强的地方",
      value: draft.areasToContinue,
      tone: { bg: "#FFFFFF", border: "#DDD6FE", title: "#6D28D9" },
    });
  }

  const recommendation = report.recommendation || draft.recommendedNextStep;
  const nextStepValue = nextFocusSummary(recommendation, lang, draft.areasToContinue, report.finalLevel);
  const shouldShowNextFocusCard = !hasMeaningfulText(draft.areasToContinue) && hasMeaningfulText(nextStepValue);
  if (shouldShowNextFocusCard) {
    sections.push({
      title: lang === "ZH" ? "下一阶段关注重点" : lang === "EN" ? "Next learning focus" : "Next learning focus / 下一阶段关注重点",
      value: nextStepValue,
      tone: { bg: "#EFF6FF", border: "#BFDBFE", title: "#1D4ED8" },
    });
  }
  if (hasMeaningfulText(draft.parentNote)) {
    sections.push({
      title: lang === "ZH" ? "老师想对家长说的话" : lang === "EN" ? "Teacher note to family" : "Teacher note to family / 老师想对家长说的话",
      value: draft.parentNote,
      tone: { bg: "#FFF7ED", border: "#FDBA74", title: "#9A3412" },
    });
  }

  const learningHabits = [draft.attendanceComment, draft.homeworkComment].filter(hasMeaningfulText).join("\n\n");
  if (hasMeaningfulText(learningHabits)) {
    sections.push({
      title: lang === "ZH" ? "学习习惯观察" : lang === "EN" ? "Learning habits we noticed" : "Learning habits we noticed / 学习习惯观察",
      value: learningHabits,
      tone: { bg: "#F8FAFC", border: "#CBD5E1", title: "#334155" },
    });
  }

  if (hasMeaningfulText(draft.initialGoals)) {
    sections.push({
      title: lang === "ZH" ? "回看开始时的小目标" : lang === "EN" ? "Looking back at the starting goals" : "Looking back at the starting goals / 回看开始时的小目标",
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
  panel(doc, left, y, contentW, snapshotH, lang === "ZH" ? "学习成长概览" : lang === "EN" ? "Learning snapshot" : "Learning snapshot / 学习成长概览", {
    bg: "#ECFDF5",
    border: "#BBF7D0",
    title: "#166534",
  });
  compactFieldRow(doc, left + 10, y + 22, contentW - 20, [
    { label: lang === "ZH" ? "阶段完成情况" : lang === "EN" ? "Stage progress" : "Stage progress / 阶段完成情况", value: packageCompletionLabel(report.package.totalMinutes, lang) },
    { label: lang === "ZH" ? "最终水平" : lang === "EN" ? "Final level" : "Final level / 最终水平", value: hasMeaningfulText(report.finalLevel) ? String(report.finalLevel) : (lang === "ZH" ? "由老师填写" : lang === "EN" ? "Added by teacher" : "Added by teacher / 由老师填写") },
    { label: lang === "ZH" ? "当前成长重点" : lang === "EN" ? "Current growth focus" : "Current growth focus / 当前成长重点", value: focusLabel(report.recommendation || draft.recommendedNextStep, lang, draft.areasToContinue) },
  ]);
  y += snapshotH + gap;

  const remainingH = top + contentH - y;
  const rowGap = gap;
  const rowDistribution = sectionRowDistribution(sections.length);
  const rowCount = rowDistribution.length || 1;
  const rowH = Math.floor((remainingH - rowGap * Math.max(0, rowCount - 1)) / rowCount);
  let sectionIndex = 0;

  rowDistribution.forEach((itemsInRow, row) => {
    const sectionY = y + row * (rowH + rowGap);
    const colGap = gap;
    const colW = (contentW - colGap * Math.max(0, itemsInRow - 1)) / itemsInRow;

    for (let col = 0; col < itemsInRow; col += 1) {
      const section = sections[sectionIndex];
      if (!section) break;
      const sectionX = left + col * (colW + colGap);
      compactSectionText(doc, sectionX, sectionY, colW, rowH, section.title, section.value, section.tone);
      sectionIndex += 1;
    }
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
