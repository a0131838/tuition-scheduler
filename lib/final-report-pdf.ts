import { parseFinalReportDraft } from "@/lib/final-report";
import {
  createLearningReportAttendanceSnapshot,
  learningReportPeriodLabel,
  finalReportStageProgressLabel,
  parseLearningReportAttendanceSnapshot,
} from "@/lib/learning-report-attendance";
import { prisma } from "@/lib/prisma";
import { renderLearningReportPdf, type ReportPdfSection } from "./learning-report-pdf-layout";

function safeName(s: string) {
  return s.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

function normalizeText(input: string | null | undefined) {
  const raw = String(input || "").replace(/\r/g, "").trim();
  return raw || "-";
}

function normalizeOptionalText(input: string | null | undefined) {
  const raw = String(input || "").replace(/\r/g, "").trim();
  return raw || "";
}

function hasMeaningfulText(input: string | null | undefined) {
  const raw = String(input || "").replace(/\r/g, "").trim();
  return raw.length > 0 && raw !== "-";
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

export function buildFinalPdfSections(lang: "BILINGUAL" | "ZH" | "EN", draft: ReturnType<typeof parseFinalReportDraft>, report: {
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

export async function buildFinalReportPdfResponse(id: string, lang: "BILINGUAL" | "ZH" | "EN" = "BILINGUAL") {
  const report = await prisma.finalReport.findUnique({
    where: { id },
    include: { student: true, teacher: true, course: true, subject: true, package: true, deliveredByUser: { select: { name: true } } },
  });
  if (!report) return new Response("Report not found", { status: 404 });
  if (report.status !== "SUBMITTED" && report.status !== "FORWARDED") {
    return new Response("Parent-facing PDF is available after the report is submitted.", { status: 409 });
  }

  const draft = parseFinalReportDraft({
    ...(report.reportJson && typeof report.reportJson === "object" ? report.reportJson : {}),
    recommendedNextStep: report.recommendation ?? (report.reportJson as any)?.recommendedNextStep,
  });
  const attendanceSnapshot =
    parseLearningReportAttendanceSnapshot(report.reportJson) ??
    (await createLearningReportAttendanceSnapshot({
      packageId: report.packageId,
      studentId: report.studentId,
      subjectId: report.subjectId,
      teacherId: report.teacherId,
      throughAt: report.submittedAt ?? new Date(),
    }));
  const sections = buildFinalPdfSections(lang, draft, report);

  const pdfSections: ReportPdfSection[] = [{
    title: lang === "ZH" ? "课程信息" : lang === "EN" ? "Course Overview" : "Course Overview / 课程信息",
    table: true,
    fields: [
    { label: lang === "ZH" ? "学生" : lang === "EN" ? "Student" : "Student / 学生", value: report.student.name },
    { label: lang === "ZH" ? "课程" : lang === "EN" ? "Course" : "Course / 课程", value: `${report.course.name}${report.subject ? ` / ${report.subject.name}` : ""}` },
    { label: lang === "ZH" ? "老师" : lang === "EN" ? "Teacher" : "Teacher / 老师", value: report.teacher.name },
    {
      label: lang === "ZH" ? "学习阶段" : lang === "EN" ? "Learning period" : "Learning period / 学习阶段",
      value: learningReportPeriodLabel(attendanceSnapshot, report.reportPeriodLabel, lang),
    },
    ],
  }];
  const snapshotItems = [
    {
      label: lang === "ZH" ? "阶段完成情况" : lang === "EN" ? "Stage progress" : "Stage progress / 阶段完成情况",
      value: finalReportStageProgressLabel(attendanceSnapshot, lang),
    },
    { label: lang === "ZH" ? "当前成长重点" : lang === "EN" ? "Current growth focus" : "Current growth focus / 当前成长重点", value: focusLabel(report.recommendation || draft.recommendedNextStep, lang, draft.areasToContinue) },
  ];
  const finalLevelValue = normalizeOptionalText(report.finalLevel);
  if (finalLevelValue) {
    snapshotItems.splice(1, 0, {
      label: lang === "ZH" ? "最终水平" : lang === "EN" ? "Final level" : "Final level / 最终水平",
      value: finalLevelValue,
    });
  }
  pdfSections.push({
    title: lang === "ZH" ? "学习成长概览" : lang === "EN" ? "Learning snapshot" : "Learning snapshot / 学习成长概览",
    table: true, fields: snapshotItems,
  });
  pdfSections.push(...sections.map(section => ({ title: section.title, fields: [{ label: "", value: section.value }] })));
  const bytes = await renderLearningReportPdf(
    lang === "ZH" ? "结课报告" : lang === "EN" ? "Final Report" : "Final Report / 结课报告",
    pdfSections, lang,
  );
  const filename = `final-report-${safeName(report.student.name)}-${safeName(report.course.name)}.pdf`;
  const filenameAscii = filename.replace(/[^\x20-\x7E]/g, "_");
  const filenameUtf8 = encodeURIComponent(filename);

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"${filenameAscii}\"; filename*=UTF-8''${filenameUtf8}`,
    },
  });
}
