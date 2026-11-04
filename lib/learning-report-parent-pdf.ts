import {
  renderLearningReportPdf,
  type ReportPdfLang,
  type ReportPdfSection,
  reportPdfLabel,
} from "./learning-report-pdf-layout";
import type {
  ParentReportSource,
  ParentReportContent,
} from "./learning-report-parent-content";
export async function renderParentLearningReportPdf(
  source: ParentReportSource,
  content: ParentReportContent | null,
  lang: ReportPdfLang,
  reviewed: boolean,
) {
  if (lang !== "EN" && !content) throw Error("TRANSLATION_REQUIRED");
  const label = (en: string, zh: string) =>
    lang === "BILINGUAL" ? `${zh} / ${en}` : reportPdfLabel(lang, en, zh);
  const title = label(
    source.kind === "MIDTERM"
      ? "Midterm Learning Report"
      : source.kind === "RENEWAL" ? "Learning Progress Before Renewal" : "End-of-course Learning Report",
    source.kind === "MIDTERM" ? "期中学习报告" : source.kind === "RENEWAL" ? "续费前学习进展报告" : "结课学习报告",
  );
  const sections: ReportPdfSection[] = [];
  const overview = [
    { label: label("Student", "学生"), value: source.student },
    {
      label: label("Course", "课程"),
      value: [source.course, source.subject].filter(Boolean).join(" / "),
    },
    { label: label("Teacher", "任课老师"), value: source.teacher },
    { label: label("Report date", "报告日期"), value: source.date },
    {
      label: label("Learning period and attendance", "学习阶段与实际出勤"),
      value: lang === "EN" ? source.periodEn : source.periodZh,
    },
  ];
  if (source.level)
    overview.push({
      label: label("Assessed level", "本次评估等级"),
      value: source.level,
    });
  if (source.score)
    overview.push({
      label: label("Overall score (teacher supplied)", "综合成绩（教师填写）"),
      value: source.score,
    });
  if (source.target)
    overview.push({
      label: label(
        "Next-stage target (not yet achieved)",
        "下一阶段目标（尚未达成）",
      ),
      value: source.target,
    });
  sections.push({
    title: label("Your child at a glance", "先了解孩子本阶段的情况"),
    table: true,
    fields: overview,
  });
  if (!reviewed && (content || source.kind === "RENEWAL"))
    sections.push({
      title: label("Preview copy", "待确认预览版"),
      fields: [
        {
          label: "",
          value: label(
            "AI-assisted translation has not yet been confirmed by the teacher or academic staff.",
            "AI 辅助译文尚未由老师或教务确认。",
          ),
        },
      ],
    });
  if (content?.summary.length)
    sections.push({
      title: label(
        "Key points for families (AI summary of teacher comments)",
        "家长先看这几件事（AI 根据教师评语整理）",
      ),
      fields: content.summary.map((s) => ({
        label: "",
        value: lang === "EN" ? s.en : s.zh,
        ...(lang === "BILINGUAL" ? { original: s.en } : {}),
      })),
    });
  for (const field of source.fields) {
    const sectionTitle = label(field.sectionEn, field.sectionZh);
    let section = sections.at(-1);
    if (!section || section.title.split(" · ")[0] !== sectionTitle) {
      section = { title: sectionTitle, fields: [] };
      sections.push(section);
    }
    const translation = content?.translations[field.key];
    const value = lang === "EN" ? field.value : translation!;
    if (
      field.key.endsWith("Level") &&
      ["A1", "A2", "B1", "B2", "C1", "C2"].includes(field.value)
    ) {
      section.title += ` · ${field.value}`;
      continue;
    }
    section.fields.push({
      label: label(field.labelEn, field.labelZh),
      value,
      ...(lang === "BILINGUAL" && translation !== field.value
        ? { original: field.value }
        : {}),
    });
  }
  if (content)
    sections.push({
      title: label("About this report", "阅读说明"),
      fields: [
        {
          label: "",
          value: label(
            "Teacher comments are the source. Chinese is AI-assisted translation; the family summary is a separate AI synthesis. Targets are future learning goals, not achieved results or promised deadlines.",
            "教师原文是评价依据；中文为 AI 辅助语境翻译，家长摘要为单独标注的 AI 归纳。目标等级是后续学习方向，不是已经取得的成绩，也不代表达标时间承诺。",
          ),
        },
      ],
    });
  return renderLearningReportPdf(title, sections, lang);
}

// Shared by existing authenticated admin and Mini Program PDF routes.
export async function buildCurrentParentReportPdfResponse(
  kind: import("./learning-report-parent-content").ParentReportKind,
  id: string,
  lang: ReportPdfLang,
) {
  const { currentParentEdition } = await import(
    "./learning-report-parent-editions"
  );
  const { validateParentReportContent } = await import(
    "./learning-report-parent-content"
  );
  const { source, edition } = await currentParentEdition(kind, id);
  const content =
    edition?.status === "READY" && edition.reviewedAt
      ? validateParentReportContent(edition.contentJson, source.fields)
      : null;
  const cached =
    content && edition
      ? lang === "ZH"
        ? edition.pdfZh
        : lang === "EN"
          ? edition.pdfEn
          : edition.pdfBilingual
      : null;
  const bytes =
    cached ??
    (await renderParentLearningReportPdf(
      source,
      content,
      content ? lang : "EN",
      Boolean(content),
    ));
  return new Response(new Uint8Array(bytes), {
    headers: parentReportPdfHeaders(source, content ? lang : "EN"),
  });
}

export function parentReportPdfHeaders(
  source: ParentReportSource,
  lang: ReportPdfLang,
  preview = false,
) {
  const clean = (value: string) =>
    value.replace(/[\\/:*?"<>|\r\n]/g, "_").slice(0, 100);
  const name = `${clean(source.student)}-${source.kind === "MIDTERM" ? "期中学习报告" : source.kind === "RENEWAL" ? "续费前学习进展报告" : "结课学习报告"}-${source.date}-${lang}${preview ? "-预览" : ""}.pdf`;
  const ascii = `${source.kind.toLowerCase()}-parent-${source.date}-${source.reportId.slice(0, 8)}-${lang}${preview ? "-preview" : ""}.pdf`;
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    "Cache-Control": "private, no-store",
  };
}
