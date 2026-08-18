import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  isLearningReportApprovedForDelivery,
  learningReportDeliveryApproval,
  learningReportDeliveryDueAt,
  learningReportDeliveryReminderKey,
  parseLearningReportDeliveryReminderKey,
} from "../lib/learning-report-delivery";

const reportId = "b0141099-be75-47a1-9a4b-9b9edae6765f";

test("delivery approval is explicit metadata and submitted alone is not approval", () => {
  assert.equal(isLearningReportApprovedForDelivery({ status: "SUBMITTED" }), false);
  const reportJson = {
    summary: "ready",
    _meta: {
      deliveryApprovedAt: "2026-08-18T04:00:00.000Z",
      deliveryApprovedByUserId: "admin-1",
      deliveryApprovedByName: "Jessika",
    },
  };
  assert.equal(isLearningReportApprovedForDelivery(reportJson), true);
  assert.deepEqual(learningReportDeliveryApproval(reportJson), {
    approvedAt: "2026-08-18T04:00:00.000Z",
    approvedByUserId: "admin-1",
    approvedByName: "Jessika",
  });
});

test("delivery reminder key is versioned by the latest approval", () => {
  const first = learningReportDeliveryReminderKey("FINAL", reportId, "2026-08-18T04:00:00.000Z");
  const second = learningReportDeliveryReminderKey("FINAL", reportId, "2026-08-18T05:00:00.000Z");
  assert.notEqual(first, second);
  assert.deepEqual(parseLearningReportDeliveryReminderKey(first), {
    kind: "FINAL",
    reportId,
    approvalVersion: 1787025600000,
  });
  assert.equal(parseLearningReportDeliveryReminderKey("FINAL_DELIVER:not-an-id:123"), null);
});

test("approved before 18:00 SGT is due that day, otherwise within two hours", () => {
  assert.equal(learningReportDeliveryDueAt(new Date("2026-08-18T04:00:00.000Z")).toISOString(), "2026-08-18T10:00:00.000Z");
  assert.equal(learningReportDeliveryDueAt(new Date("2026-08-18T11:00:00.000Z")).toISOString(), "2026-08-18T13:00:00.000Z");
});

test("web and miniapp use the formal report delivery action", () => {
  const projection = readFileSync("lib/communication-reminders.ts", "utf8");
  const miniApi = readFileSync("app/api/miniapp/staff/reminder-attention/route.ts", "utf8");
  const miniPdf = readFileSync("app/api/miniapp/staff/reminder-attention/reports/[kind]/[id]/pdf/route.ts", "utf8");
  const miniUi = readFileSync("miniapp/boss-academic-parent/pages/staff-reminder-attention/staff-reminder-attention.wxml", "utf8");
  const webUi = readFileSync("app/admin/communication-reminders/CommunicationReminderClient.tsx", "utf8");

  assert.match(projection, /learningReportDeliveryApproval/);
  assert.match(projection, /learningReportDeliveryReminderKey/);
  assert.match(projection, /reportDeliveryReady: !isFill/);
  assert.match(projection, /reportAdminPdfPath/);
  assert.match(miniApi, /deliverApprovedLearningReport/);
  assert.match(miniApi, /报告任务请使用“已发送给家长”/);
  assert.match(miniPdf, /Only an approved, undelivered report can be opened/);
  assert.match(miniUi, /bindtap="openReport"/);
  assert.match(miniUi, /bindtap="confirmReportSent"/);
  assert.match(webUi, /deliverReport/);
  assert.match(webUi, /已发送给家长/);
});

test("Jessika can approve or revoke Mid and Final delivery without giving Emily edit rights", () => {
  const midterm = readFileSync("app/admin/reports/midterm/page.tsx", "utf8");
  const final = readFileSync("app/admin/reports/final/page.tsx", "utf8");
  for (const source of [midterm, final]) {
    assert.match(source, /确认可由 Emily 发送/);
    assert.match(source, /撤回发送确认/);
    assert.match(source, /approveLearningReportForDelivery/);
    assert.match(source, /revokeLearningReportDeliveryApproval/);
  }
});
