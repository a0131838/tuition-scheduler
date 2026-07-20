import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";
import { buildCommunicationShareImage, wrapCommunicationLine } from "@/lib/communication-share-image";
import { formatBusinessDateWithWeekday } from "@/lib/date-only";
import { buildCourseChangeMessage, reminderScheduleLines } from "@/lib/parent-communication-center";

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
  for (const label of ["课后反馈", "发给家长", "发给老师", "课程变更补发"]) assert.match(markup + script, new RegExp(label));
  assert.match(markup, /反馈完整度/);
  assert.match(markup, /expandedId === item\.id/);
});

test("course change resend states cancellation precisely and preserves the previous arrangement", () => {
  const result = buildCourseChangeMessage({
    kind: "COURSE_REMINDER_PARENT",
    previousMessageText: "Steven苏家长您好，课程如下：\n10:00–11:00 英语口语 / 数学 · Joel lam · 线上课程 / Online",
    currentMessageText: "旧提醒不再适用",
    forceCancelled: true,
  });
  assert.equal(result.type, "CANCELLED");
  assert.deepEqual(result.previousLines, ["10:00–11:00 英语口语 / 数学 · Joel lam · 线上课程 / Online"]);
  assert.deepEqual(result.currentLines, []);
  assert.match(result.messageText, /课程已取消，暂无替代课程/);
  assert.match(result.messageText, /目前无需按原时间上课/);
  assert.doesNotMatch(result.messageText, /取消、改期或不再适用/);
});

test("course change resend identifies one changed field and shows previous to current", () => {
  const result = buildCourseChangeMessage({
    kind: "COURSE_REMINDER_PARENT",
    previousMessageText: "家长您好，\n10:00–11:00 数学 · Jasmine · Online",
    currentMessageText: "家长您好，\n11:00–12:00 数学 · Jasmine · Online",
  });
  assert.equal(result.type, "TIME_CHANGED");
  assert.match(result.messageText, /上课时间变更/);
  assert.match(result.messageText, /原安排 \/ Previous/);
  assert.match(result.messageText, /当前安排 \/ Current/);
});

test("course change completion requires a WeChat evidence screenshot", async () => {
  const service = await readFile(new URL("../lib/parent-communication-center.ts", import.meta.url), "utf8");
  const markup = await readFile(new URL("../miniapp/boss-academic-parent/pages/staff-communications/staff-communications.wxml", import.meta.url), "utf8");
  assert.match(service, /task\.kind === "COURSE_CHANGE" && !task\.evidenceUrl/);
  assert.match(markup, /原安排 · 不再有效/);
  assert.match(markup, /当前安排 · 请以此为准/);
  assert.match(markup, /上传发送截图/);
  assert.match(service, /refreshLegacyCourseChangeTasks/);
  assert.match(service, /replace\(\/\^【更正通知】\//);
});

test("feedback publication visibly continues into manual WeChat group delivery", async () => {
  const markup = await readFile(new URL("../miniapp/boss-academic-parent/pages/staff-communications/staff-communications.wxml", import.meta.url), "utf8");
  const script = await readFile(new URL("../miniapp/boss-academic-parent/pages/staff-communications/staff-communications.js", import.meta.url), "utf8");
  const service = await readFile(new URL("../lib/parent-communication-center.ts", import.meta.url), "utf8");
  assert.match(markup, /第1步：审核并发布/);
  assert.match(markup, /第2步：人工发送到家长微信群/);
  assert.match(markup, /小程序发布不能代替人工发群/);
  assert.match(markup, /确认已发到/);
  assert.match(script, /filter: "READY_TO_SEND", expandedId: row\.id/);
  assert.match(script, /channel: row\.isTeacherReminder \? "WECHAT_DIRECT" : "WECHAT_GROUP"/);
  assert.match(service, /action === "manual_sent"/);
  assert.match(service, /MARK_MANUAL_SENT/);
});

test("teacher reminder images use teacher-specific header and staff miniapp footer", async () => {
  const source = await readFile(new URL("../lib/communication-share-image.ts", import.meta.url), "utf8");
  assert.match(source, /老师课程确认/);
  assert.match(source, /sgtmanage\.com\/teacher/);
  assert.match(source, /博思学业管家/);
  assert.doesNotMatch(source, /BOSS EDUCATION/);
});

test("teacher reminder avoids duplicate teacher honorifics", async () => {
  const source = await readFile(new URL("../lib/parent-communication-center.ts", import.meta.url), "utf8");
  const miniapp = await readFile(new URL("../miniapp/boss-academic-parent/pages/staff-communications/staff-communications.js", import.meta.url), "utf8");
  assert.match(source, /value\.endsWith\("老师"\) \? value : `\$\{value\}老师`/);
  assert.match(source, /teacherSalutation\(teacher\.name\)/);
  assert.match(miniapp, /value\.endsWith\("老师"\) \? value : `\$\{value\}老师`/);
});

test("course reminders direct each audience to an available schedule surface", async () => {
  const source = await readFile(new URL("../lib/parent-communication-center.ts", import.meta.url), "utf8");
  const web = await readFile(new URL("../app/admin/communications/CommunicationCenterClient.tsx", import.meta.url), "utf8");
  assert.match(source, /进入家长小程序查看完整课表/);
  assert.match(source, /进入员工小程序或网页版老师端/);
  assert.match(source, /https:\/\/sgtmanage\.com\/teacher/);
  assert.match(web, /网页版老师端/);
  assert.match(web, /家长和学生从家长小程序查看/);
});

test("presentation-only reminder changes compare real course lines and never leak control fields", async () => {
  const before = "老师您好，请进入员工小程序：\n10:00–12:00 English · Daisy · Online\n如有变化请联系教务。";
  const after = "老师您好，请进入员工小程序或网页版老师端：\nhttps://sgtmanage.com/teacher\n10:00–12:00 English · Daisy · Online\n如有变化请联系教务。";
  const changedCourse = after.replace("10:00–12:00", "11:00–13:00");
  assert.deepEqual(reminderScheduleLines(before), reminderScheduleLines(after));
  assert.notDeepEqual(reminderScheduleLines(before), reminderScheduleLines(changedCourse));
  const source = await readFile(new URL("../lib/parent-communication-center.ts", import.meta.url), "utf8");
  assert.match(source, /const \{ presentationOnlyIfBodyUnchanged = false, forceCourseCancelled = false, \.\.\.taskData \} = input/);
  assert.match(source, /data: \{ \.\.\.taskData/);
  assert.doesNotMatch(source, /data: \{ \.\.\.input/);
});
