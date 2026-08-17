import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(file: string) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

test("student history labels cancelled lessons as feedback not required", () => {
  const source = read("app/admin/students/[id]/page.tsx");
  assert.match(source, /a\.status === "EXCUSED"/);
  assert.match(source, /Not required - cancelled/);
});

test("academic management excludes each cancelled student from lesson and next-session statistics", () => {
  const source = read("app/admin/reports/academic-management/page.tsx");
  assert.match(source, /getVisibleSessionStudents/);
  assert.match(source, /attendances: \{ select: \{ studentId: true, status: true \} \}/);
  assert.doesNotMatch(source, /function sessionStudentIds/);
});

test("teacher and manager lead desks exclude fully cancelled sessions from active workload", () => {
  const teacherLead = read("app/teacher/lead/page.tsx");
  const managerLead = read("lib/manager-quality-workspace.ts");
  assert.match(teacherLead, /filter\(\(session\) => !isSessionFullyCancelled\(session\)\)/);
  assert.match(managerLead, /filter\(\(session\) => !isSessionFullyCancelled\(session\)\)/);
  assert.match(managerLead, /cancelledExcluded/);
});

test("parent miniapp next lesson excludes that student's cancelled sessions", () => {
  const source = read("app/api/miniapp/students/[studentId]/home/route.ts");
  assert.match(source, /NOT: \{ attendances: \{ some: \{ studentId, status: "EXCUSED" \} \} \}/);
});

test("partner settlement charged-cancellation rule is intentionally unchanged", () => {
  const source = read("app/admin/reports/partner-settlement/page.tsx");
  assert.match(source, /EXCUSED with charged deduction/);
  assert.match(source, /const hasFeedback = row\.session\.feedbacks\.length > 0/);
});
