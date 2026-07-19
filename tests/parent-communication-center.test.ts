import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";
import { buildCommunicationShareImage, wrapCommunicationLine } from "@/lib/communication-share-image";
import { formatBusinessDateWithWeekday } from "@/lib/date-only";

const migrationPath = new URL("../prisma/migrations/20260718190000_add_parent_communication_center/migration.sql", import.meta.url);

test("communication migration is additive and leaves schedule, attendance and finance tables untouched", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /CREATE TABLE "ParentCommunicationTask"/);
  assert.match(sql, /ADD COLUMN "reviewStatus"/);
  assert.match(sql, /ADD COLUMN "wechatGroupName"/);
  assert.doesNotMatch(sql, /\bDROP\s+(?:TABLE|COLUMN|TYPE|INDEX)\b/i);
  assert.doesNotMatch(sql, /(?:ALTER|UPDATE|DELETE\s+FROM|TRUNCATE)\s+(?:TABLE\s+)?"(?:Session|Attendance|CoursePackage|PackageTxn|Invoice|Receipt)"/i);
});

test("teacher feedback submission now enters academic review instead of directly notifying parents", async () => {
  for (const path of [
    new URL("../app/api/teacher/sessions/[id]/feedback/route.ts", import.meta.url),
    new URL("../app/api/miniapp/staff/schedule/[sessionId]/feedback/route.ts", import.meta.url),
  ]) {
    const source = await readFile(path, "utf8");
    assert.match(source, /reviewStatus:\s*"PENDING_REVIEW"/);
    assert.match(source, /ensureFeedbackCommunicationTasks/);
    assert.doesNotMatch(source, /queueFirstPublishedFeedback/);
  }
});

test("parent feedback APIs only expose published parent-facing content", async () => {
  const listSource = await readFile(new URL("../app/api/miniapp/students/[studentId]/feedbacks/route.ts", import.meta.url), "utf8");
  const homeSource = await readFile(new URL("../app/api/miniapp/students/[studentId]/home/route.ts", import.meta.url), "utf8");
  const detailSource = await readFile(new URL("../app/api/miniapp/feedbacks/[feedbackId]/route.ts", import.meta.url), "utf8");
  assert.match(listSource, /publishedAt:\s*\{\s*not:\s*null\s*\}/);
  assert.match(listSource, /feedback\.parentContent\s*\|\|\s*feedback\.content/);
  assert.match(homeSource, /publishedAt:\s*\{\s*not:\s*null\s*\}/);
  assert.match(homeSource, /latestFeedback\.parentContent\s*\|\|\s*latestFeedback\.content/);
  assert.match(detailSource, /!feedback\.publishedAt/);
  assert.match(detailSource, /feedback\.parentContent\s*\|\|\s*feedback\.content/);
});

test("course reminder queue invalidates stale changed or cancelled reminders", async () => {
  const source = await readFile(new URL("../scripts/queue-miniapp-course-reminders.ts", import.meta.url), "utf8");
  assert.match(source, /INVALIDATE_STALE_COURSE_REMINDER/);
  assert.match(source, /Session changed; stale reminder invalidated/);
  assert.match(source, /Student session cancelled; reminder invalidated/);
  assert.match(source, /getVisibleSessionStudents/);
});

test("WeChat share image is a readable 1080 by 1440 PNG", async () => {
  const image = await buildCommunicationShareImage({ title: "Emily · 数学课后反馈", messageText: "家长您好，课后反馈已经更新。\n请在家长小程序查看详细内容。" });
  const metadata = await sharp(image).metadata();
  assert.equal(metadata.format, "png");
  assert.equal(metadata.width, 1080);
  assert.equal(metadata.height, 1440);
  assert.ok(image.length > 10_000);
});

test("WeChat share image wrapping preserves English words and fits mixed Chinese copy", () => {
  const lines = wrapCommunicationLine("家长您好 Daisy，请及时联系我们 / Please contact us promptly if anything changes.", 34);
  assert.ok(lines.length >= 2);
  assert.equal(lines.join(" ").includes("cont act"), false);
  assert.equal(lines.join(" ").includes("anythin g"), false);
  assert.ok(lines.every((line) => Array.from(line).length <= 34));
});

test("production deploy guarantees a verified Simplified Chinese font", async () => {
  const source = await readFile(new URL("../ops/server/scripts/deploy_app.sh", import.meta.url), "utf8");
  assert.match(source, /fonts-noto-cjk/);
  assert.match(source, /fc-match "Noto Sans CJK SC"/);
});

test("course reminders use an absolute Singapore date with weekday", async () => {
  assert.equal(formatBusinessDateWithWeekday(new Date("2026-07-19T16:00:00.000Z")), "2026年7月20日（周一）");
  assert.equal(formatBusinessDateWithWeekday(new Date("2026-07-19T16:00:00.000Z"), { short: true }), "7月20日（周一）");
  const source = await readFile(new URL("../lib/parent-communication-center.ts", import.meta.url), "utf8");
  assert.match(source, /的课程如下/);
  assert.match(source, /presentationOnlyIfBodyUnchanged/);
});

test("communication workbench separates feedback, parent, teacher and correction queues", async () => {
  const markup = await readFile(new URL("../miniapp/boss-academic-parent/pages/staff-communications/staff-communications.wxml", import.meta.url), "utf8");
  const script = await readFile(new URL("../miniapp/boss-academic-parent/pages/staff-communications/staff-communications.js", import.meta.url), "utf8");
  for (const label of ["审核反馈", "发给家长", "发给老师", "更正通知"]) assert.match(markup + script, new RegExp(label));
  assert.match(markup, /反馈完整度/);
  assert.match(markup, /expandedId === item\.id/);
});

test("teacher reminder images use teacher-specific header and staff miniapp footer", async () => {
  const source = await readFile(new URL("../lib/communication-share-image.ts", import.meta.url), "utf8");
  assert.match(source, /老师课程确认/);
  assert.match(source, /staff miniapp/);
});
