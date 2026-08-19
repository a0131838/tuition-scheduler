import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import bank from "../lib/school-guide-academic-assessment-bank.generated.json";
import {
  ACADEMIC_ASSESSMENT_AGE_BANDS,
  ACADEMIC_ASSESSMENT_STATUS,
  ACADEMIC_ASSESSMENT_VERSION,
  ACADEMIC_ASSESSMENT_PRODUCTS,
  assessmentInternalQuestion,
  calculateAssessmentResult,
  chooseLeastUsedForm,
  fullQuestionIds,
  initialQuestionIds,
  normalizeAssessmentCode,
  parallelRetestLimitReached,
  productQuestionIds,
  publicQuestion,
  recentParallelFormExclusions,
  resolveRoute,
  scoreAnswer,
  validateAssessmentProductAge,
  type AcademicAssessmentStoredAnswer,
} from "../lib/school-guide-academic-assessment";

test("assessment bank is a controlled pathway V5 pilot with five age bands", () => {
  assert.equal(ACADEMIC_ASSESSMENT_VERSION, "V1.4-20260805-pathway-v5-itep-aligned");
  assert.equal(ACADEMIC_ASSESSMENT_STATUS, "pilot");
  assert.equal(ACADEMIC_ASSESSMENT_AGE_BANDS.length, 5);
  assert.deepEqual(ACADEMIC_ASSESSMENT_PRODUCTS, ["INTERNATIONAL_ENGLISH", "AEIS_PRIMARY", "AEIS_SECONDARY"]);
});

test("new products select only their intended subjects", () => {
  const international = productQuestionIds("CORE-A1214-A", "INTERNATIONAL_ENGLISH");
  assert.equal(international.length, 51);
  assert.deepEqual(new Set(international.map((id) => publicQuestion("CORE-A1214-A", id).domain)), new Set(["英语"]));
  assert.equal(international.filter((id) => publicQuestion("CORE-A1214-A", id).requiresReviewer).length, 2);
  const sections = international.map((id) => publicQuestion("CORE-A1214-A", id).section);
  assert.equal(sections.filter((value) => value === "GRAMMAR").length, 25);
  assert.equal(sections.filter((value) => value === "LISTENING").length, 14);
  assert.equal(sections.filter((value) => value === "READING").length, 10);
  assert.equal(sections.filter((value) => value === "WRITING").length, 2);

  for (const product of ["AEIS_PRIMARY", "AEIS_SECONDARY"]) {
    const formId = product === "AEIS_PRIMARY" ? "CORE-A911-A" : "CORE-A1214-A";
    const ids = productQuestionIds(formId, product);
    assert.ok(ids.length >= 25);
    const expectedDomains = product === "AEIS_PRIMARY" ? new Set(["CEQ英语准备", "数学"]) : new Set(["英语", "数学"]);
    assert.deepEqual(new Set(ids.map((id) => publicQuestion(formId, id).domain)), expectedDomains);
    assert.equal(ids.filter((id) => publicQuestion(formId, id).requiresReviewer).length, 1);
    assert.equal(ids.some((id) => publicQuestion(formId, id).domain === "科学"), false);
  }
});

test("parallel forms rotate product questions without duplicate ids", () => {
  const variants = ["A", "B", "C"].map((variant) => productQuestionIds(`CORE-A1214-${variant}`, "AEIS_SECONDARY"));
  for (const ids of variants) assert.equal(new Set(ids).size, ids.length);
  assert.notDeepEqual(variants[0], variants[1]);
  assert.notDeepEqual(variants[1], variants[2]);
});

test("parallel retests exclude recent forms and cap three starts per day", () => {
  const now = new Date("2026-08-17T12:00:00.000Z");
  const forms = ["CORE-A1214-A", "CORE-A1214-B", "CORE-A1214-C"];
  const sessions = [
    { formId: forms[0], createdAt: new Date("2026-08-17T09:00:00.000Z") },
    { formId: forms[1], createdAt: new Date("2026-08-17T10:00:00.000Z") },
  ];
  assert.deepEqual(recentParallelFormExclusions(sessions, forms, now).sort(), [forms[0], forms[1]].sort());
  assert.equal(chooseLeastUsedForm("12–14岁", {}, recentParallelFormExclusions(sessions, forms, now)), forms[2]);
  assert.equal(parallelRetestLimitReached(sessions.map((row) => row.createdAt), now), false);
  assert.equal(parallelRetestLimitReached([...sessions.map((row) => row.createdAt), new Date("2026-08-17T11:00:00.000Z")], now), true);
});

test("product age boundaries block unsuitable online assessments", () => {
  assert.equal(validateAssessmentProductAge("INTERNATIONAL_ENGLISH", "3–5岁"), false);
  assert.equal(validateAssessmentProductAge("AEIS_PRIMARY", "9–11岁"), true);
  assert.equal(validateAssessmentProductAge("AEIS_PRIMARY", "12–14岁"), false);
  assert.equal(validateAssessmentProductAge("AEIS_SECONDARY", "12–14岁"), true);
});

test("new product reports never blend AEIS subjects into one total", () => {
  const formId = "CORE-A911-A";
  const ids = productQuestionIds(formId, "AEIS_PRIMARY");
  const answers: Record<string, AcademicAssessmentStoredAnswer> = Object.fromEntries(ids.map((id) => [id, {
    value: "A",
    durationSeconds: 60,
    updatedAt: new Date().toISOString(),
    autoScore: scoreAnswer(formId, id, "A"),
    manualScore: publicQuestion(formId, id).requiresReviewer ? 3 : undefined,
  }]));
  const result = calculateAssessmentResult({ formId, questionIds: ids, answers, durationSeconds: 30 * 60, targetPath: "AEIS_PRIMARY" });
  assert.equal(result.overallScore, null);
  assert.equal(result.overallBand, "分科查看，不合并总分");
  assert.equal(result.report.scoreModelVersion, "PATHWAY_V4");
  assert.deepEqual(result.report.scorecards.map((row) => row.label), ["CEQ英语资格准备", "AEIS小学数学准备"]);
  assert.equal(result.report.improvementPlan.length, 3);
  assert.deepEqual(result.report.improvementPlan.map((row) => row.stage), ["第1–2周", "第3–6周", "第7–8周"]);
});

test("international English report labels CEFR as provisional", () => {
  const formId = "CORE-A1214-B";
  const ids = productQuestionIds(formId, "INTERNATIONAL_ENGLISH");
  const answers: Record<string, AcademicAssessmentStoredAnswer> = Object.fromEntries(ids.map((id) => [id, {
    value: "A",
    durationSeconds: 60,
    updatedAt: new Date().toISOString(),
    autoScore: scoreAnswer(formId, id, "A"),
    manualScore: publicQuestion(formId, id).requiresReviewer ? 3 : undefined,
  }]));
  const result = calculateAssessmentResult({ formId, questionIds: ids, answers, durationSeconds: 75 * 60, targetPath: "INTERNATIONAL_ENGLISH" });
  assert.equal(typeof result.overallScore, "number");
  assert.match(result.report.standard, /CEFR.*初步参考/);
  assert.ok(result.report.scorecards[0].cefrReference);
  assert.ok(result.report.evidence);
  assert.equal(result.report.evidence?.totalItems, 51);
  assert.equal(result.report.evidence?.ageBandSpecific, true);
  assert.equal(result.report.scoreModelVersion, "PATHWAY_V5_ITEP_ALIGNED");
  assert.deepEqual(Object.keys(result.report.moduleScores), ["语法", "听力", "阅读", "写作"]);
  assert.deepEqual(result.report.unmeasuredSkills, ["口语"]);
  assert.equal(result.report.improvementPlan[2].title, "模拟与复测");
});

test("iTEP-aligned public payload exposes audio but never transcripts", () => {
  const formId = "CORE-A1214-C";
  const ids = productQuestionIds(formId, "INTERNATIONAL_ENGLISH");
  const listeningIds = ids.filter((id) => publicQuestion(formId, id).section === "LISTENING");
  assert.equal(listeningIds.length, 14);
  for (const id of listeningIds) {
    const safe = publicQuestion(formId, id) as Record<string, unknown>;
    assert.match(String(safe.audioUrl), /^\/school-guide\/assessment-audio\/itep-c-part[123]\.mp3$/);
    assert.equal("audioTranscript" in safe, false);
    const audioPath = path.join(process.cwd(), "public", String(safe.audioUrl).replace(/^\//, ""));
    assert.ok(fs.statSync(audioPath).size > 100_000, `${audioPath} has generated audio`);
  }
});

test("unfinished V4 international sessions remain readable and keep their old scoring model", () => {
  const formId = "CORE-A1214-A";
  const prefix = "P-INT-1214-A";
  const ids = [
    ...Array.from({ length: 5 }, (_, index) => `${prefix}-LU-${index + 1}`),
    ...Array.from({ length: 4 }, (_, index) => `${prefix}-RD-${index + 1}`),
    ...Array.from({ length: 7 }, (_, index) => `${prefix}-EV-${index + 1}`),
    `${prefix}-WR-1`,
  ];
  const answers: Record<string, AcademicAssessmentStoredAnswer> = Object.fromEntries(ids.map((id) => [id, {
    value: "A", durationSeconds: 60, updatedAt: new Date().toISOString(), autoScore: scoreAnswer(formId, id, "A"),
    manualScore: publicQuestion(formId, id).requiresReviewer ? 6 : undefined,
  }]));
  assert.equal(ids.every((id) => Boolean(publicQuestion(formId, id).prompt)), true);
  const result = calculateAssessmentResult({ formId, questionIds: ids, answers, durationSeconds: 25 * 60, targetPath: "INTERNATIONAL_ENGLISH" });
  assert.equal(result.report.scoreModelVersion, "PATHWAY_V4");
  assert.deepEqual(result.report.unmeasuredSkills, ["听力", "口语"]);
  assert.equal(typeof result.overallScore, "number");
});

test("form assignment balances A B C and code normalization is forgiving", () => {
  assert.equal(chooseLeastUsedForm("6–8岁", { "CORE-A68-A": 5, "CORE-A68-B": 2, "CORE-A68-C": 3 }), "CORE-A68-B");
  assert.equal(chooseLeastUsedForm("6–8岁", { "CORE-A68-A": 5, "CORE-A68-B": 2, "CORE-A68-C": 3 }, ["CORE-A68-B"]), "CORE-A68-C");
  assert.equal(normalizeAssessmentCode(" sgab-c234 "), "SGABC234");
});

test("adaptive routes use six anchors and preserve expected 26-question form", () => {
  const formId = "CORE-A68-A";
  assert.equal(initialQuestionIds(formId).length, 6);
  assert.equal(resolveRoute(2), "easy");
  assert.equal(resolveRoute(3), "standard");
  assert.equal(resolveRoute(5), "hard");
  assert.equal(fullQuestionIds(formId, "easy", "MOE_AEIS").length, 26);
  assert.equal(fullQuestionIds(formId, "standard", "INTERNATIONAL").length, 26);
  assert.equal(fullQuestionIds(formId, "hard", "UNSURE").length, 26);
});

test("DSA replaces branch and open task with four configured tasks", () => {
  const ids = fullQuestionIds("CORE-A911-A", "standard", "DSA");
  assert.equal(ids.length, 26);
  assert.equal(new Set(ids).size, ids.length);
});

test("student question payload excludes answers and internal explanation", () => {
  const id = initialQuestionIds("CORE-A68-A")[0];
  const safe = publicQuestion("CORE-A68-A", id) as Record<string, unknown>;
  assert.equal("answerRule" in safe, false);
  assert.equal("explanation" in safe, false);
  const internal = assessmentInternalQuestion("CORE-A68-A", id);
  assert.ok(internal.answerRule);
});

test("objective anchor answers score automatically", () => {
  assert.equal(scoreAnswer("CORE-A68-A", "P68-X-L026", "A"), assessmentInternalQuestion("CORE-A68-A", "P68-X-L026").maxScore);
  assert.equal(scoreAnswer("CORE-A68-A", "P68-X-L026", "B"), 0);
  assert.equal(scoreAnswer("CORE-A68-A", "AEIS-P23-X-OPEN-12", "154"), assessmentInternalQuestion("CORE-A68-A", "AEIS-P23-X-OPEN-12").maxScore);
});

test("complete result remains pending until manual work is graded", () => {
  const formId = "CORE-A68-A";
  const ids = fullQuestionIds(formId, "standard", "UNSURE");
  const answers: Record<string, AcademicAssessmentStoredAnswer> = Object.fromEntries(ids.map((id) => [id, {
    value: "A",
    durationSeconds: 60,
    updatedAt: new Date().toISOString(),
    autoScore: scoreAnswer(formId, id, "A"),
  }]));
  const pending = calculateAssessmentResult({ formId, questionIds: ids, answers, durationSeconds: 35 * 60, targetPath: "UNSURE" });
  assert.ok(pending.pendingManual > 0);
  assert.equal(pending.confidence, "待人工");
  for (const id of ids) {
    if (publicQuestion(formId, id).requiresReviewer) answers[id].manualScore = 3;
  }
  const complete = calculateAssessmentResult({ formId, questionIds: ids, answers, durationSeconds: 35 * 60, targetPath: "UNSURE" });
  assert.equal(complete.pendingManual, 0);
  assert.equal(complete.confidence, "高");
  assert.match(complete.report.standard, /不是学校、MOE、AEIS官方分数/);
  const legacyValues = Object.values(complete.domainScores);
  assert.equal(complete.overallScore, Math.round(legacyValues.reduce((sum, value) => sum + value, 0) / legacyValues.length));
});

test("all configured form questions resolve and multiple-choice items expose options", () => {
  for (const row of bank.assignments) {
    const question = publicQuestion(String(row.form_id), String(row.question_id));
    assert.ok(question.prompt, `${row.form_id}/${row.question_id} has prompt`);
    if (question.type === "single_choice") assert.ok(question.options.length >= 2, `${row.question_id} has answer options`);
  }
});

test("assessment migration is additive and isolated", () => {
  const sql = fs.readFileSync(path.join(process.cwd(), "prisma/migrations/20260805113000_add_school_guide_academic_assessment/migration.sql"), "utf8");
  assert.match(sql, /CREATE TABLE "SchoolGuideAssessmentCode"/);
  assert.match(sql, /CREATE TABLE "SchoolGuideAssessmentSession"/);
  assert.doesNotMatch(sql, /DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM/);
});

test("pending review exposes a concise status and parallel-form retest without reusing the original code", () => {
  const page = fs.readFileSync(path.join(process.cwd(), "miniapp/boss-academic-parent/pages/guide-academic-assessment/guide-academic-assessment.wxml"), "utf8");
  const controller = fs.readFileSync(path.join(process.cwd(), "miniapp/boss-academic-parent/pages/guide-academic-assessment/guide-academic-assessment.js"), "utf8");
  const startRoute = fs.readFileSync(path.join(process.cwd(), "app/api/public/school-guide/academic-assessment/start/route.ts"), "utf8");
  assert.match(page, /正在生成结果[\s\S]*开始新一轮/);
  assert.doesNotMatch(page, /平行卷/);
  assert.match(controller, /retestSessionToken:\s*this\.data\.sessionToken/);
  assert.match(startRoute, /sourceMode:\s*retestSource \? "PARALLEL_RETEST"/);
  assert.match(startRoute, /parallelRetestLimitReached/);
});
