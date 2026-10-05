import test from 'node:test';
import assert from 'node:assert/strict';
import { renderLearningReportPdf, reportPdfLabel } from '../lib/learning-report-pdf-layout';
import { midtermPdfSections } from '../lib/midterm-report-pdf';
import { parseReportDraft, EMPTY_REPORT_DRAFT } from '../lib/midterm-report';
import { buildFinalPdfSections } from '../lib/final-report-pdf';
import { parseFinalReportDraft } from '../lib/final-report';

for (const lang of ['ZH', 'EN', 'BILINGUAL'] as const) {
  test(`midterm preserves every supplied draft field and all seven scores in ${lang}`, () => {
    const input: Record<string, string> = Object.fromEntries(Object.keys(EMPTY_REPORT_DRAFT).map(k => [k, `VALUE_${k}_完整原文`]));
    for (const skill of ['listening', 'reading', 'writing', 'speaking']) input[skill + 'Level'] = 'A2';
    const draft = parseReportDraft(input);
    const overview = [{ label: 'Tool', value: draft.assessmentTool }];
    const sections = midtermPdfSections(draft, overview, lang);
    const values = sections.flatMap(s => s.fields.flatMap(f => [f.label, f.value])).concat(sections.map(s => s.title)).join('\n');
    for (const [key, value] of Object.entries(draft)) assert.ok(values.includes(value), `missing ${key}`);
    assert.equal(sections.at(-1)?.fields.length, 7);
  });
  test(`final report retains long narrative fields in ${lang}`, () => {
    const draft = parseFinalReportDraft({finalSummary:'Summary '.repeat(800),strengths:'Strengths 完整 '.repeat(300),areasToContinue:'Focus '.repeat(400),parentNote:'Family '.repeat(300),initialGoals:'Goals '.repeat(200),attendanceComment:'Attendance',homeworkComment:'Homework'});
    const sections = buildFinalPdfSections(lang, draft, {reportPeriodLabel:'2026',finalLevel:'B1',recommendation:'CONTINUE_CURRENT'});
    const values = sections.map(s => s.value).join('\n');
    for (const key of ['finalSummary','strengths','areasToContinue','parentNote','initialGoals','attendanceComment','homeworkComment'] as const) assert.ok(values.includes(draft[key]));
  });
  test(`long paragraphs generate a complete multipage PDF in ${lang}`, async () => {
    const bytes = await renderLearningReportPdf(reportPdfLabel(lang, 'Report', '学习报告'), [{title:'Mixed language / 中英文',fields:[{label:'Long paragraph',value:'English sentence. 中文长段落。 '.repeat(700)+'END_MARKER'}]}], lang);
    assert.equal(bytes.subarray(0,5).toString(), '%PDF-');
    assert.ok(bytes.toString('latin1').includes('%%EOF'));
    const pages = bytes.toString('latin1').match(/\/Type \/Page\b/g) || [];
    assert.ok(pages.length > 1);
  });
}
