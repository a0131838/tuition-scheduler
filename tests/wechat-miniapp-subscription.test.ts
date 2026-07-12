import assert from "node:assert/strict";
import test from "node:test";
import { buildCourseReminderData, countAcceptedTemplate, summarizeCourseTemplateQuota } from "@/lib/wechat-miniapp-subscription";
import { buildServiceNotificationData, serviceConsentGroupKeys } from "@/lib/wechat-miniapp-service-subscription";

test("buildCourseReminderData maps the appointment template", () => {
  assert.deepEqual(buildCourseReminderData("course", { courseName: "English", subjectName: "Grammar", teacherName: "Eva", startAt: "2026-07-13T01:00:00.000Z" }), {
    thing1: { value: "English" },
    name2: { value: "Grammar" },
    name3: { value: "Eva" },
    date4: { value: "2026-07-13 09:00:00" },
  });
});

test("buildCourseReminderData maps class and start templates", () => {
  const payload = { courseName: "English", teacherName: "Eva", studentName: "Amy", durationMinutes: 90, locationLabel: "Orchard", startAt: "2026-07-13T01:00:00.000Z" };
  assert.deepEqual(buildCourseReminderData("class", payload), {
    thing1: { value: "English" }, time2: { value: "09:00" }, name3: { value: "Eva" }, short_thing5: { value: "90分钟" }, thing6: { value: "Amy" },
  });
  assert.deepEqual(buildCourseReminderData("start", payload), {
    thing1: { value: "English" }, time2: { value: "09:00" }, thing3: { value: "Eva" }, character_string5: { value: "1.5" }, thing4: { value: "Orchard" },
  });
});

test("countAcceptedTemplate counts only matching accepted IDs", () => {
  assert.equal(countAcceptedTemplate([
    { metaJson: { acceptedTemplateIds: ["course"] } },
    { metaJson: { acceptedTemplateIds: ["other"] } },
    { metaJson: null },
  ], "course"), 1);
});

test("summarizeCourseTemplateQuota keeps template quotas independent", () => {
  const templates = [
    { kind: "course" as const, templateId: "course-id" },
    { kind: "class" as const, templateId: "class-id" },
    { kind: "start" as const, templateId: "start-id" },
  ];
  const quota = summarizeCourseTemplateQuota(
    templates,
    [
      { metaJson: { acceptedTemplateIds: ["course-id", "class-id", "start-id"] } },
      { metaJson: { acceptedTemplateIds: ["course-id"] } },
    ],
    [
      { templateKey: "course_reminder_24h", payloadJson: { deliveredTemplateId: "course-id" } },
      { templateKey: "course_reminder_24h", payloadJson: { deliveredTemplateId: "class-id" } },
    ]
  );
  assert.equal(quota.acceptedCount, 4);
  assert.equal(quota.consumedCount, 2);
  assert.equal(quota.availableCount, 2);
  assert.deepEqual(quota.byTemplate.map((item) => item.available), [1, 0, 1]);
});

test("buildServiceNotificationData maps request status fields", () => {
  assert.deepEqual(buildServiceNotificationData("request", {
    ticketNo: "20260712-001", studentName: "Amy", status: "Waiting Parent",
    type: "排课要求", updatedAt: "2026-07-12T06:00:00.000Z",
  }), {
    character_string1: { value: "20260712-001" },
    thing2: { value: "Amy" },
    thing4: { value: "等待家长补充" },
    date5: { value: "2026-07-12 14:00:00" },
    thing6: { value: "排课要求" },
  });
});

test("buildServiceNotificationData maps finance and document fields", () => {
  assert.deepEqual(buildServiceNotificationData("finance", {
    invoiceNo: "RGT-202607-0001", dueAt: "2026-07-20T15:59:00.000Z",
  }), {
    character_string1: { value: "RGT-202607-0001" },
    time2: { value: "2026-07-20 23:59:00" },
  });
  assert.deepEqual(buildServiceNotificationData("invoice", {
    invoiceNo: "RGT-202607-0001", issueDate: "2026-07-12T04:00:00.000Z",
  }), {
    thing1: { value: "发票开具" },
    time2: { value: "2026-07-12 12:00:00" },
    thing3: { value: "发票号 RGT-202607-0001" },
  });
  assert.deepEqual(buildServiceNotificationData("receipt", {
    studentName: "Amy", amountReceived: 1200, receiptDate: "2026-07-12T04:00:00.000Z",
  }), {
    thing1: { value: "Amy" },
    amount2: { value: "$1200.00" },
    thing3: { value: "博思教育" },
    time5: { value: "2026-07-12 12:00:00" },
  });
  assert.deepEqual(buildServiceNotificationData("feedback", {
    studentName: "Amy", submittedAt: "2026-07-12T04:00:00.000Z",
  }), {
    thing1: { value: "课后反馈" },
    time2: { value: "2026-07-12 12:00:00" },
    thing3: { value: "Amy反馈已发布" },
  });
});

test("invoice and feedback share consent accounting for the same official template", () => {
  const previousInvoice = process.env.WECHAT_TEMPLATE_INVOICE_ISSUED;
  const previousFeedback = process.env.WECHAT_TEMPLATE_FEEDBACK_PUBLISHED;
  process.env.WECHAT_TEMPLATE_INVOICE_ISSUED = "shared-service-template";
  process.env.WECHAT_TEMPLATE_FEEDBACK_PUBLISHED = "shared-service-template";
  try {
    assert.deepEqual(serviceConsentGroupKeys("invoice_issued").sort(), ["documents", "learning"]);
    assert.deepEqual(serviceConsentGroupKeys("feedback_published").sort(), ["documents", "learning"]);
  } finally {
    if (previousInvoice === undefined) delete process.env.WECHAT_TEMPLATE_INVOICE_ISSUED;
    else process.env.WECHAT_TEMPLATE_INVOICE_ISSUED = previousInvoice;
    if (previousFeedback === undefined) delete process.env.WECHAT_TEMPLATE_FEEDBACK_PUBLISHED;
    else process.env.WECHAT_TEMPLATE_FEEDBACK_PUBLISHED = previousFeedback;
  }
});
