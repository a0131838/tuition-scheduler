import assert from "node:assert/strict";
import test from "node:test";
import { feedbackNotificationStudentIds } from "@/lib/miniapp-feedback-notification";

test("one-to-one feedback follows the explicit session student instead of sibling enrollments", () => {
  assert.deepEqual(feedbackNotificationStudentIds({
    classCapacity: 1,
    sessionStudentId: "direct",
    oneOnOneStudentId: "one-to-one",
    enrollmentStudentIds: ["sibling", "direct"],
  }), ["direct"]);
});

test("group feedback resolves enrolled students without duplicates", () => {
  assert.deepEqual(feedbackNotificationStudentIds({
    classCapacity: 8,
    sessionStudentId: "legacy-direct",
    oneOnOneStudentId: null,
    enrollmentStudentIds: ["enrolled", "second", "enrolled"],
  }), ["enrolled", "second"]);
});

test("feedback notification ignores missing student relations", () => {
  assert.deepEqual(feedbackNotificationStudentIds({
    classCapacity: 1,
    sessionStudentId: null,
    oneOnOneStudentId: null,
    enrollmentStudentIds: [],
  }), []);
});
