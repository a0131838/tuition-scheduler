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
  productQuestionIds,
  publicQuestion,
  resolveRoute,
  scoreAnswer,
  validateAssessmentProductAge,
  type AcademicAssessmentStoredAnswer,
} from "../lib/school-guide-academic-assessment";

test("assessment bank is a controlled pathway V3 pilot with five age bands", () => {
  assert.equal(ACADEMIC_ASSESSMENT_VERSION, "V1.4-20260805-pathway-v3");
  assert.equal(ACADEMIC_ASSESSMENT_STATUS, "pilot");
  assert.equal(ACADEMIC_ASSESSMENT_AGE_BANDS.length, 5);
  assert.deepEqual(ACADEMIC_ASSESSMENT_PRODUCTS, ["INTERNATIONAL_ENGLISH", "AEIS_PRIMARY", "AEIS_SECONDARY"]);
});

test("new products select only their intended subjects", () => {
  const international = productQuestionIds("CORE-A1214-A", "INTERNATIONAL_ENGLISH");
  assert.equal(international.length, 10);
  assert.deepEqual(new Set(international.map((id) => publicQuestion("CORE-A1214-A", id).domain)), new Set(["英语"]));
  assert.equal(international.filter((id) => publicQuestion("CORE-A1214-A", id).requiresReviewer).length, 1);

  for (const product of ["AEIS_PRIMARY", "AEIS_SECONDARY"]) {
    const formId = product === "AEIS_PRIMARY" ? "CORE-A911-A" : "CORE-A1214-A";
    const ids = productQuestionIds(formId, product);
    assert.ok(ids.length >= 18);
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
  assert.equal(result.report.scoreModelVersion, "PATHWAY_V3");
  assert.deepEqual(result.report.scorecards.map((row) => row.label), ["CEQ英语资格准备", "AEIS小学数学准备"]);
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
  const result = calculateAssessmentResult({ formId, questionIds: ids, answers, durationSeconds: 25 * 60, targetPath: "INTERNATIONAL_ENGLISH" });
  assert.equal(typeof result.overallScore, "number");
  assert.match(result.report.standard, /CEFR.*初步参考/);
  assert.ok(result.report.scorecards[0].cefrReference);
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
