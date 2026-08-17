import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const historyPage = readFileSync("app/teacher/sessions/history/page.tsx", "utf8");
const sessionsPage = readFileSync("app/teacher/sessions/page.tsx", "utf8");
const feedbackPage = readFileSync("app/teacher/student-feedbacks/page.tsx", "utf8");
const teacherLayout = readFileSync("app/teacher/layout.tsx", "utf8");

test("historical feedback completion stays inside the current teacher scope", () => {
  assert.match(historyPage, /requireTeacherProfile/);
  assert.match(historyPage, /teacherId: teacher\.id/);
  assert.match(historyPage, /class: \{ teacherId: teacher\.id \}/);
  assert.match(historyPage, /isSessionFullyCancelled/);
});

test("historical pending feedback has a dedicated teacher entry and bounded result set", () => {
  assert.match(teacherLayout, /\/teacher\/sessions\/history/);
  assert.match(sessionsPage, /Open all historical feedback tasks/);
  assert.match(historyPage, /HISTORY_SCAN_LIMIT = 5000/);
  assert.match(historyPage, /PAGE_SIZE = 25/);
  assert.match(historyPage, /feedbacks: \{ none: \{ teacherId: teacher\.id \} \}/);
  assert.match(historyPage, /isProxyDraft: true/);
  assert.match(historyPage, /returnTo=\$\{encodeURIComponent\(returnTo\)\}/);
});

test("submitted feedback desk can intentionally open earlier or all available history", () => {
  assert.match(feedbackPage, /Earlier feedbacks/);
  assert.match(feedbackPage, /All available history/);
  assert.match(feedbackPage, /Last 90 days/);
  assert.match(feedbackPage, /Last 180 days/);
  assert.match(feedbackPage, /\.\.\.\(from \? \{ gte: from \} : \{\}\)/);
  assert.match(feedbackPage, /students you have taught/);
});
