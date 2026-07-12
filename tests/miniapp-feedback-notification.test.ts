import assert from "node:assert/strict";
import test from "node:test";
import { feedbackNotificationStudentIds } from "@/lib/miniapp-feedback-notification";

test("feedback notification resolves direct, one-to-one, and enrolled students without duplicates", () => {
  assert.deepEqual(feedbackNotificationStudentIds({
    sessionStudentId: "direct",
    oneOnOneStudentId: "one-to-one",
    enrollmentStudentIds: ["enrolled", "direct", "enrolled"],
  }), ["direct", "one-to-one", "enrolled"]);
});

test("feedback notification ignores missing student relations", () => {
  assert.deepEqual(feedbackNotificationStudentIds({
    sessionStudentId: null,
    oneOnOneStudentId: null,
    enrollmentStudentIds: [],
  }), []);
});
