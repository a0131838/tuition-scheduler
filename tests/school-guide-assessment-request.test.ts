import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  assessmentRequestStatusFromSession,
  assessmentRequestStatusMeta,
  ASSESSMENT_REQUEST_OPEN_STATUSES,
  buildAssessmentCodeWechatMessage,
  buildAssessmentRequestSummary,
  generateAssessmentRequestNo,
  generateAssessmentRequestToken,
} from "../lib/school-guide-assessment-request";

test("assessment request status presents a clear parent journey", () => {
  assert.equal(assessmentRequestStatusMeta("REQUESTED").label, "待联系");
  assert.equal(assessmentRequestStatusMeta("CODE_ISSUED").label, "评估码已发放");
  assert.equal(assessmentRequestStatusMeta("REPORT_READY").step, 7);
  assert.equal(assessmentRequestStatusFromSession("IN_PROGRESS"), "IN_PROGRESS");
  assert.equal(assessmentRequestStatusFromSession("AWAITING_REVIEW"), "AWAITING_REVIEW");
  assert.equal(assessmentRequestStatusFromSession("COMPLETED"), "REPORT_READY");
  assert.equal(ASSESSMENT_REQUEST_OPEN_STATUSES.includes("INTERPRETED"), false);
});

test("assessment request identifiers and public tokens are non-trivial", () => {
  assert.match(generateAssessmentRequestNo(new Date("2026-08-05T12:00:00+08:00")), /^SGAR-20260805-[A-F0-9]{6}$/);
  const one = generateAssessmentRequestToken();
  const two = generateAssessmentRequestToken();
  assert.ok(one.length >= 40);
  assert.notEqual(one, two);
});

test("staff WeChat message includes code, expiry, independence and non-official boundary", () => {
  const message = buildAssessmentCodeWechatMessage({ studentNickname: "Student A", code: "SGAB-C234", expiresAt: new Date("2026-08-19T12:00:00+08:00") });
  assert.match(message, /SGAB-C234/);
  assert.match(message, /45分钟/);
  assert.match(message, /学生独立完成/);
  assert.match(message, /不是学校、MOE或AEIS官方成绩/);
  assert.match(message, /不预测录取/);
});

test("lead summary keeps the structured intake context", () => {
  const summary = buildAssessmentRequestSummary({ ageBand: "9–11岁", currentGrade: "P5", targetPath: "MOE_AEIS", needType: "准备AEIS / 政府学校", preferredTestDate: "2026-08-10", note: "英文为主" });
  assert.match(summary, /\[入学准备度测评码申请\]/);
  assert.match(summary, /9–11岁/);
  assert.match(summary, /P5/);
  assert.match(summary, /2026-08-10/);
});

test("assessment request migration is additive and isolated", () => {
  const sql = fs.readFileSync(path.join(process.cwd(), "prisma/migrations/20260805213000_add_school_guide_assessment_requests/migration.sql"), "utf8");
  assert.match(sql, /CREATE TABLE "SchoolGuideAssessmentRequest"/);
  assert.match(sql, /ADD COLUMN "assessmentRequestId"/);
  assert.doesNotMatch(sql, /DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM|UPDATE "(?:Student|Session|Attendance|CoursePackage|Ticket)"/i);
});

test("native miniapp starts public assessment directly while preserving legacy staff code actions", () => {
  const parent = fs.readFileSync(path.join(process.cwd(), "miniapp/boss-academic-parent/pages/guide-academic-assessment/guide-academic-assessment.wxml"), "utf8");
  const startRoute = fs.readFileSync(path.join(process.cwd(), "app/api/public/school-guide/academic-assessment/start/route.ts"), "utf8");
  const staff = fs.readFileSync(path.join(process.cwd(), "miniapp/boss-academic-parent/pages/staff-assessment-request-detail/staff-assessment-request-detail.wxml"), "utf8");
  const appJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "miniapp/boss-academic-parent/app.json"), "utf8"));
  assert.match(parent, /开始测评/);
  assert.match(parent, /请由孩子本人作答/);
  assert.doesNotMatch(parent, /iTEP|评估码/);
  assert.doesNotMatch(parent, /验证评估码并开始/);
  assert.match(parent, /评估已就绪，开始测评/);
  assert.match(parent, /测评结果/);
  assert.match(parent, /接下来怎么提高/);
  assert.match(parent, /联系规划老师/);
  assert.match(parent, /查看详细分析/);
  assert.match(startRoute, /DIRECT_SELF_SERVE/);
  assert.match(startRoute, /公开自助测评内部凭证/);
  assert.match(staff, /确认资料并生成评估码/);
  assert.match(staff, /复制完整微信通知/);
  assert.ok(appJson.pages.includes("pages/staff-assessment-requests/staff-assessment-requests"));
  assert.ok(appJson.pages.includes("pages/staff-assessment-request-detail/staff-assessment-request-detail"));
});

test("completed assessment can start another round without a permanent retest lock", () => {
  const startRoute = fs.readFileSync(path.join(process.cwd(), "app/api/public/school-guide/academic-assessment/start/route.ts"), "utf8");
  const miniapp = fs.readFileSync(path.join(process.cwd(), "miniapp/boss-academic-parent/pages/guide-academic-assessment/guide-academic-assessment.js"), "utf8");
  const view = fs.readFileSync(path.join(process.cwd(), "miniapp/boss-academic-parent/pages/guide-academic-assessment/guide-academic-assessment.wxml"), "utf8");
  assert.doesNotMatch(startRoute, /RETEST_REQUIRES_APPROVAL/);
  assert.match(startRoute, /recommendedIntervalDays: 30/);
  assert.match(miniapp, /startNewRound/);
  assert.match(miniapp, /reportImprovementPlan/);
  assert.match(miniapp, /school_guide_academic_assessment_history/);
  assert.match(view, /再测一次/);
  assert.doesNotMatch(view, /平行卷/);
  assert.match(view, /为另一个孩子测评/);
});

test("public duplicate contact response is redacted and staff queue excludes teachers", () => {
  const publicRoute = fs.readFileSync(path.join(process.cwd(), "app/api/public/school-guide/academic-assessment/request/route.ts"), "utf8");
  const staffRoute = fs.readFileSync(path.join(process.cwd(), "app/api/miniapp/staff/academic-assessment-requests/route.ts"), "utf8");
  assert.match(publicRoute, /status: "DUPLICATE"/);
  assert.match(publicRoute, /redacted: true/);
  assert.doesNotMatch(publicRoute, /requestToken: publicToken, request: parentView\(existingRequest\)/);
  assert.match(staffRoute, /\["ADMIN", "CS", "SALES"\]\.includes\(role\)/);
  assert.doesNotMatch(staffRoute, /\["ADMIN", "CS", "SALES", "TEACHER"\]/);
});
