import assert from "node:assert/strict";
import test from "node:test";
import { studentScheduleTeacherName } from "../lib/student-schedule-export";

test("student schedule export uses replacement teacher when a session has one", () => {
  const session = {
    teacher: { name: "Zoe" },
    class: { teacher: { name: "Jasmine" } },
  };

  assert.equal(studentScheduleTeacherName(session), "Zoe");
});

test("student schedule export falls back to class teacher when session teacher is not overridden", () => {
  const session = {
    teacher: null,
    class: { teacher: { name: "Jasmine" } },
  };

  assert.equal(studentScheduleTeacherName(session), "Jasmine");
});
