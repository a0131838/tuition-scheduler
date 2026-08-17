import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { classifyCommunicationReminder } from "../lib/communication-reminders";

test("communication reminders use one shared P0-P3 priority policy", () => {
  assert.deepEqual(
    classifyCommunicationReminder({ category: "TICKET", urgency: "UPCOMING", status: "ESCALATED" }),
    { group: "TICKET", groupLabel: "工单确认", priority: "P0", priorityLabel: "立即处理", priorityReason: "已经升级，需要立即接手" },
  );
  assert.equal(classifyCommunicationReminder({ category: "CLASS_REMINDER", urgency: "OVERDUE", status: "READY" }).priority, "P0");
  assert.equal(classifyCommunicationReminder({ category: "FEEDBACK", urgency: "TODAY", status: "READY" }).priority, "P1");
  assert.equal(classifyCommunicationReminder({ category: "FINAL_REPORT", urgency: "OVERDUE", status: "WAITING_REPLY" }).priority, "P2");
  assert.equal(classifyCommunicationReminder({ category: "ATTENDANCE", urgency: "UPCOMING", status: "READY" }).priority, "P3");
});

test("communication reminders share the same four business groups", () => {
  assert.equal(classifyCommunicationReminder({ category: "TEACHER_CLASS_REMINDER", urgency: "TODAY", status: "READY" }).group, "COURSE");
  assert.equal(classifyCommunicationReminder({ category: "FEEDBACK_FORWARD", urgency: "TODAY", status: "READY" }).group, "TEACHING");
  assert.equal(classifyCommunicationReminder({ category: "MIDTERM_REPORT", urgency: "TODAY", status: "READY" }).group, "REPORT");
  assert.equal(classifyCommunicationReminder({ category: "TEACHER_CONFIRM", urgency: "TODAY", status: "READY" }).group, "TICKET");
});

test("web and miniapp render priority sections and category filters", () => {
  const web = readFileSync("app/admin/communication-reminders/CommunicationReminderClient.tsx", "utf8");
  const miniappJs = readFileSync("miniapp/boss-academic-parent/pages/staff-reminder-attention/staff-reminder-attention.js", "utf8");
  const miniappView = readFileSync("miniapp/boss-academic-parent/pages/staff-reminder-attention/staff-reminder-attention.wxml", "utf8");
  for (const source of [web, miniappJs, miniappView]) {
    assert.match(source, /P0/);
    assert.match(source, /P1/);
    assert.match(source, /P2/);
    assert.match(source, /P3/);
  }
  for (const source of [web, miniappJs]) {
    assert.match(source, /课程提醒/);
    assert.match(source, /教学跟进/);
    assert.match(source, /学习报告/);
    assert.match(source, /工单确认/);
  }
});
