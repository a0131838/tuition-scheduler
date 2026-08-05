import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import bank from "../lib/school-guide-academic-assessment-bank.generated.json";
import {
  ACADEMIC_ASSESSMENT_AGE_BANDS,
  ACADEMIC_ASSESSMENT_STATUS,
  ACADEMIC_ASSESSMENT_VERSION,
  assessmentInternalQuestion,
  calculateAssessmentResult,
  chooseLeastUsedForm,
  fullQuestionIds,
  initialQuestionIds,
  normalizeAssessmentCode,
  publicQuestion,
  resolveRoute,
  scoreAnswer,
  type AcademicAssessmentStoredAnswer,
} from "../lib/school-guide-academic-assessment";

test("assessment bank is a controlled V1.4 pilot with five age bands", () => {
  assert.equal(ACADEMIC_ASSESSMENT_VERSION, "V1.4-20260805");
  assert.equal(ACADEMIC_ASSESSMENT_STATUS, "pilot");
  assert.equal(ACADEMIC_ASSESSMENT_AGE_BANDS.length, 5);
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
