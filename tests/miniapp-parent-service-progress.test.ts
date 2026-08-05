import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import {
  compactParentProgressText,
  parentProgressTimelineItem,
  parentServicePlanCopy,
  parentServiceWeekRange,
  sortParentProgressTimeline,
} from "../lib/miniapp-parent-service-progress";

const require = createRequire(import.meta.url);
const presentation = require("../miniapp/boss-academic-parent/utils/parent-presentation.js");

test("parent service progress uses the Singapore Monday-to-Sunday week", () => {
  const range = parentServiceWeekRange(new Date("2026-07-14T04:00:00.000Z"));
  assert.equal(range.start.toISOString(), "2026-07-12T16:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-07-19T15:59:59.999Z");
  assert.equal(range.label, "07/13 - 07/19");
});

test("all three student service types receive parent-facing progress copy", () => {
  assert.equal(parentServicePlanCopy("STANDARD_COURSE").label, "普通课程");
  assert.equal(parentServicePlanCopy("ACADEMIC_MANAGEMENT").label, "学业管理");
  assert.equal(parentServicePlanCopy("FULL_CARE").label, "全程托管");
  assert.match(parentServicePlanCopy(null).headline, /不只上课/);
});

test("timeline removes empty entries, compacts copy, and sorts newest first", () => {
  const oldItem = parentProgressTimelineItem({
    id: "old",
    kind: "LESSON",
    title: "数学",
    summary: " 已完成   课程 ",
    occurredAt: new Date("2026-07-12T04:00:00.000Z"),
  });
  const newItem = parentProgressTimelineItem({
    id: "new",
    kind: "CARE",
    title: "阶段跟进",
    summary: "已和家长确认下一步",
    occurredAt: new Date("2026-07-13T04:00:00.000Z"),
  });
  const emptyItem = parentProgressTimelineItem({
    id: "empty",
    kind: "REQUEST",
    title: "请求",
    summary: "",
    occurredAt: new Date(),
  });
  assert.equal(compactParentProgressText(" A   B "), "A B");
  assert.equal(emptyItem, null);
  assert.deepEqual(sortParentProgressTimeline([oldItem, newItem, emptyItem]).map((item) => item.id), ["new", "old"]);
});

test("parent progress API selects only published care summaries", () => {
  const route = fs.readFileSync(
    path.join(process.cwd(), "app/api/miniapp/students/[studentId]/service-progress/route.ts"),
    "utf8",
  );
  assert.match(route, /publicationStatus: "PUBLISHED"/);
  assert.match(route, /audience: \{ in: \["PARENT", "PARENT_AND_STUDENT"\] \}/);
  assert.match(route, /publicSummary: true/);
  assert.doesNotMatch(route, /internalNote: true/);
  assert.doesNotMatch(route, /professionalJudgment: true/);
  assert.doesNotMatch(route, /factEvidence: true/);
  assert.doesNotMatch(route, /parentInternalNote: true/);
});

test("unclassified students use ordinary-course wording in the parent app", () => {
  const homeRoute = fs.readFileSync(
    path.join(process.cwd(), "app/api/miniapp/students/[studentId]/home/route.ts"),
    "utf8",
  );
  assert.match(homeRoute, /student\.servicePlanType \|\| "STANDARD_COURSE"/);
});

test("parent progress projects acknowledgement without exposing report workflow internals", () => {
  const route = fs.readFileSync(
    path.join(process.cwd(), "app/api/miniapp/students/[studentId]/service-progress/route.ts"),
    "utf8",
  );
  assert.match(route, /views: \{/);
  assert.match(route, /acknowledged: Boolean/);
  assert.doesNotMatch(route, /reviewerNote: true/);
  assert.doesNotMatch(route, /returnReason: true/);
});

test("parent reassurance copy translates internal risk and formats lesson balance", () => {
  assert.equal(presentation.parentStatus("LOW").label, "进展稳定");
  assert.equal(presentation.parentStatus("MEDIUM").label, "需要关注");
  assert.equal(presentation.parentStatus("HIGH").label, "正在重点跟进");
  assert.equal(presentation.parentStatus("HIGH", false).label, "服务进行中");
  assert.equal(presentation.lessonBalance(150), "2 小时 30 分钟");
  assert.equal(presentation.lessonBalance(0), "暂无剩余课时");
});

test("service tab preserves relationship permissions for reports and requests", () => {
  const route = fs.readFileSync(
    path.join(process.cwd(), "app/api/miniapp/students/[studentId]/service-progress/route.ts"),
    "utf8",
  );
  assert.match(route, /requireMiniappStudentAccess\(req, studentId\)/);
  assert.match(route, /canViewReports\s*\? prisma\.careEngagement\.findFirst/);
  assert.doesNotMatch(route, /hasManagedCare && canViewReports/);
  assert.match(route, /canCreateRequests \? prisma\.ticket\.findMany/);
  assert.match(route, /permissions: \{ canViewSchedule, canViewFeedback, canViewReports, canCreateRequests \}/);
  assert.match(route, /riskLabel: canViewReports \? academicRiskLabel/);
});

test("Full Care parent dashboard answers the four reassurance questions with reviewed data only", () => {
  const route = fs.readFileSync(
    path.join(process.cwd(), "app/api/miniapp/students/[studentId]/service-progress/route.ts"),
    "utf8",
  );
  const page = fs.readFileSync(
    path.join(process.cwd(), "miniapp/boss-academic-parent/pages/progress/progress.wxml"),
    "utf8",
  );
  assert.match(route, /serviceCommitments/);
  assert.match(route, /latestPublishedUpdate/);
  assert.match(route, /nextUpdate/);
  assert.match(route, /parentVisible: true/);
  assert.match(route, /publicSummary: \{ not: null \}/);
  assert.doesNotMatch(route, /riskCases:[\s\S]{0,500}facts: true/);
  assert.doesNotMatch(route, /riskCases:[\s\S]{0,500}immediateAction: true/);
  assert.match(page, /孩子现在怎么样？/);
  assert.match(page, /我们最近做了什么？/);
  assert.match(page, /接下来做什么？/);
  assert.match(page, /下次什么时候更新？/);
  assert.match(page, /重大事项会主动联系，不会等待月报/);
});

test("parent home discards stale responses after switching students", () => {
  const homeScript = fs.readFileSync(
    path.join(process.cwd(), "miniapp/boss-academic-parent/pages/home/home.js"),
    "utf8",
  );
  assert.match(homeScript, /const loadSeq = \(this\.loadSeq \|\| 0\) \+ 1/);
  assert.match(homeScript, /if \(loadSeq !== this\.loadSeq\) return/);
  assert.match(homeScript, /student: \{\}/);
  assert.match(homeScript, /care: \{\}/);
});
