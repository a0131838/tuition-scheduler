import assert from "node:assert/strict";
import test from "node:test";
import { canReuseCancelledSlot, createInReleasedSlot } from "@/lib/cancelled-schedule-slot";
import { lessonRecordStatus } from "@/lib/student-scheduling-overview";
import { isOperationsAdminPathAllowed } from "@/lib/operations-admin-access";

function cancelled() {
  return { id: "original", studentId: "sister", class: {
    id: "shared-class", capacity: 1, oneOnOneStudentId: null, courseId: "course", subjectId: "math", levelId: null,
    teacherId: "teacher", campusId: "campus", roomId: "room", oneOnOneGroupId: "group",
  }, attendances: [{ studentId: "sister", status: "EXCUSED", excusedCharge: false, deductedMinutes: 0, deductedCount: 0 }] };
}

test("only a proven uncharged one-to-one cancellation releases a duplicate slot", () => {
  assert.equal(canReuseCancelledSlot(cancelled()), true);
  for (const field of ["excusedCharge", "deductedMinutes", "deductedCount"] as const) {
    const s = cancelled(); Object.assign(s.attendances[0], { [field]: field === "excusedCharge" ? true : 1 });
    assert.equal(canReuseCancelledSlot(s), false);
  }
  const active = cancelled(); active.attendances[0].status = "UNMARKED";
  assert.equal(canReuseCancelledSlot(active), false);
  const group = cancelled(); group.class.capacity = 2;
  assert.equal(canReuseCancelledSlot(group), false);
  const ambiguous = cancelled(); ambiguous.studentId = "";
  assert.equal(canReuseCancelledSlot(ambiguous), false);
  const extra = cancelled(); extra.attendances.push({ ...extra.attendances[0], studentId: "other" });
  assert.equal(canReuseCancelledSlot(extra), false);
});

test("academic operations may export schedules without accessing financial exports", () => {
  assert.equal(isOperationsAdminPathAllowed("/api/exports/student-schedule/student"), true);
  assert.equal(isOperationsAdminPathAllowed("/api/exports/teacher-payroll/teacher"), false);
  assert.equal(isOperationsAdminPathAllowed("/api/admin/students/student/package-balance-preview"), false);
});

test("replacement preserves the cancelled session and links a dedicated target class", async () => {
  const original = cancelled(); const snapshot = structuredClone(original);
  let classData: any; let sessionData: any;
  const db = { session: { findFirst: async () => original, create: async ({ data }: any) => { sessionData = data; return { id: "new", ...data }; } },
    class: { create: async ({ data }: any) => { classData = data; return { id: "target-class" }; } } };
  await createInReleasedSlot(db as any, { classId: "shared-class", studentId: "brother", teacherId: "teacher", startAt: new Date(), endAt: new Date() });
  assert.deepEqual(original, snapshot);
  assert.equal(classData.oneOnOneStudentId, "brother");
  assert.equal(classData.enrollments.create.studentId, "brother");
  assert.equal(sessionData.classId, "target-class");
});

test("same student must explicitly restore instead of silently duplicating", async () => {
  const db = { session: { findFirst: async () => cancelled() } };
  await assert.rejects(createInReleasedSlot(db as any, { classId: "shared-class", studentId: "sister", teacherId: "teacher", startAt: new Date(), endAt: new Date() }), /Restore/);
});

test("course history separates cancellations, attendance and unmarked past lessons", () => {
  const now = new Date("2026-09-07T00:00:00Z");
  const past = new Date("2026-09-06T00:00:00Z");
  const future = new Date("2026-09-08T00:00:00Z");
  assert.equal(lessonRecordStatus(undefined, past, now), "UNMARKED");
  assert.equal(lessonRecordStatus(undefined, future, now), "SCHEDULED");
  assert.equal(lessonRecordStatus("EXCUSED", future, now), "CANCELLED");
  assert.equal(lessonRecordStatus("LATE", past, now), "ATTENDED");
  assert.equal(lessonRecordStatus("ABSENT", past, now), "ABSENT");
});
