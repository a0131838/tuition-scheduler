import assert from "node:assert/strict";
import test from "node:test";
import { buildCourseReminderData, countAcceptedTemplate } from "@/lib/wechat-miniapp-subscription";

test("buildCourseReminderData maps official keyword IDs", () => {
  assert.deepEqual(buildCourseReminderData({ courseName: "English", subjectName: "Grammar", teacherName: "Eva", startAt: "2026-07-13T01:00:00.000Z" }), {
    thing1: { value: "English" },
    name2: { value: "Grammar" },
    name3: { value: "Eva" },
    date4: { value: "2026-07-13 09:00:00" },
  });
});

test("countAcceptedTemplate counts only matching accepted IDs", () => {
  assert.equal(countAcceptedTemplate([
    { metaJson: { acceptedTemplateIds: ["course"] } },
    { metaJson: { acceptedTemplateIds: ["other"] } },
    { metaJson: null },
  ], "course"), 1);
});
