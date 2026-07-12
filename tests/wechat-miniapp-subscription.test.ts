import assert from "node:assert/strict";
import test from "node:test";
import { buildCourseReminderData, countAcceptedTemplate, summarizeCourseTemplateQuota } from "@/lib/wechat-miniapp-subscription";

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
