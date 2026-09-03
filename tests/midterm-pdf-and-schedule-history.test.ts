import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("midterm PDF continues long recommendations instead of clipping the target field", () => {
  const pdf = read("../lib/midterm-report-pdf.ts");
  assert.match(pdf, /needsRecommendationContinuation/);
  assert.match(pdf, /drawRecommendationContinuation/);
  assert.match(pdf, /完整学习建议请见下一页/);
  assert.match(pdf, /textFitsInField/);
});

test("class scheduling keeps history inside the existing sessions page and records core changes", () => {
  const history = read("../lib/scheduling-change-history.ts");
  const page = read("../app/admin/classes/[id]/sessions/page.tsx");
  const createDelete = read("../app/api/admin/classes/[id]/sessions/route.ts");
  const reschedule = read("../app/api/admin/classes/[id]/sessions/reschedule/route.ts");
  const replaceTeacher = read("../app/api/admin/classes/[id]/sessions/replace-teacher/route.ts");
  const assignStudent = read("../app/api/admin/classes/[id]/sessions/assign-student/route.ts");
  const cancellation = read("../lib/miniapp-session-cancellation.ts");
  const locationChange = read("../lib/miniapp-session-location-change.ts");

  assert.match(history, /SCHEDULING_HISTORY_MODULE/);
  assert.match(history, /before: input\.before/);
  assert.match(history, /after: input\.after/);
  assert.match(page, /<details/);
  assert.match(page, /Schedule change history/);
  assert.match(createDelete, /SESSION_CREATED/);
  assert.match(createDelete, /SESSION_DELETED/);
  assert.match(reschedule, /SESSION_RESCHEDULED/);
  assert.match(replaceTeacher, /SESSION_TEACHER_REPLACED/);
  assert.match(assignStudent, /SESSION_STUDENT_CHANGED/);
  assert.match(cancellation, /SESSION_CANCELLED/);
  assert.match(locationChange, /MINIAPP_SESSION_CHANGE_LOCATION/);
});
