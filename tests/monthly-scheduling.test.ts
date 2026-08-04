import assert from "node:assert/strict";
import test from "node:test";
import {
  allocateMonthlyCourseCapacity,
  defaultMonthlySchedulingDates,
  monthlySchedulingMonthKey,
  monthlySchedulingBusyOverlapMinutes,
  monthlySchedulingParentMessage,
  monthlySchedulingOffersConflict,
  monthlySchedulingRange,
  monthlySchedulingRelevantCourseIds,
  monthlySchedulingSessionStudentIds,
  monthlySchedulingWeekdayCode,
  nextMonthlySchedulingMonth,
  normalizeMonthlyAvailability,
} from "../lib/monthly-scheduling";

test("monthly scheduling uses business-time month boundaries", () => {
  const range = monthlySchedulingRange("2026-09");
  assert.equal(range?.start.toISOString(), "2026-08-31T16:00:00.000Z");
  assert.equal(range?.end.toISOString(), "2026-09-30T16:00:00.000Z");
  assert.equal(monthlySchedulingMonthKey(range!.start), "2026-09");
  assert.equal(nextMonthlySchedulingMonth(new Date("2026-08-03T04:00:00.000Z")), "2026-09");
});

test("campaign timing opens ten days before target month and closes three days before", () => {
  const dates = defaultMonthlySchedulingDates("2026-09");
  assert.equal(dates.teacherAvailabilityDueAt.toISOString(), "2026-08-19T16:00:00.000Z");
  assert.equal(dates.opensAt.toISOString(), "2026-08-21T16:00:00.000Z");
  assert.equal(dates.dueAt.toISOString(), "2026-08-28T16:00:00.000Z");
});

test("parent availability keeps valid weekly choices and drops malformed values", () => {
  const result = normalizeMonthlyAvailability({
    selectionMode: "weekly",
    weekdays: ["MON", "SAT", "INVALID"],
    timeRanges: [{ start: "16:00", end: "19:00" }, { start: "20:00", end: "18:00" }],
    dateSelections: [],
  });
  assert.deepEqual(result.weekdays, ["MON", "SAT"]);
  assert.deepEqual(result.timeRanges, [{ start: "16:00", end: "19:00" }]);
});

test("parent availability rejects impossible times and calendar dates", () => {
  const result = normalizeMonthlyAvailability({
    selectionMode: "calendar",
    weekdays: [],
    timeRanges: [{ start: "25:00", end: "26:00" }],
    dateSelections: [
      { date: "2026-02-30", start: "09:00", end: "10:00" },
      { date: "2026-09-03", start: "09:00", end: "10:00" },
    ],
  });
  assert.deepEqual(result.timeRanges, []);
  assert.deepEqual(result.dateSelections, [{ date: "2026-09-03", start: "09:00", end: "10:00" }]);
});

test("one family message lists siblings and their courses separately", () => {
  const message = monthlySchedulingParentMessage({
    parentName: "Ms Su",
    month: "2026-09",
    dueAt: new Date("2026-08-28T16:00:00.000Z"),
    students: [
      { studentName: "Student A", courseName: "Grade 6 Math" },
      { studentName: "Student B", courseName: "Grade 3 English" },
    ],
  });
  assert.match(message, /Student A：Grade 6 Math/);
  assert.match(message, /Student B：Grade 3 English/);
  assert.match(message, /2026-08-29/);
});

test("calendar weekday matching uses the Singapore date without UTC day drift", () => {
  assert.equal(monthlySchedulingWeekdayCode("2026-09-01"), "TUE");
  assert.equal(monthlySchedulingWeekdayCode("2026-09-05"), "SAT");
});

test("shared-package students keep course demand separate by real lesson history", () => {
  const courses = ["grade-3-english", "grade-6-math"];
  assert.deepEqual(monthlySchedulingRelevantCourseIds({
    availableCourseIds: courses,
    targetMonthCourseIds: [],
    recentCourseIds: ["grade-3-english"],
    packageOwner: false,
    baseCourseId: "grade-6-math",
  }), ["grade-3-english"]);
  assert.deepEqual(monthlySchedulingRelevantCourseIds({
    availableCourseIds: courses,
    targetMonthCourseIds: ["grade-6-math"],
    recentCourseIds: ["grade-3-english"],
    packageOwner: false,
    baseCourseId: "grade-3-english",
  }), ["grade-6-math"]);
});

test("one-to-one lesson history follows the explicit session student", () => {
  assert.deepEqual(monthlySchedulingSessionStudentIds({
    studentId: "sibling-a",
    class: {
      capacity: 1,
      oneOnOneStudentId: "sibling-b",
      enrollments: [{ studentId: "sibling-a" }, { studentId: "sibling-b" }],
    },
  }), ["sibling-a"]);
});

test("staffing capacity subtracts only busy time overlapping real date availability", () => {
  const intervals = [{ date: "2026-09-01", startMin: 9 * 60, endMin: 12 * 60 }];
  const busy = [
    { date: "2026-09-01", startMin: 8 * 60, endMin: 10 * 60 },
    { date: "2026-09-01", startMin: 9 * 60 + 30, endMin: 10 * 60 + 30 },
    { date: "2026-09-01", startMin: 14 * 60, endMin: 15 * 60 },
  ];
  assert.equal(monthlySchedulingBusyOverlapMinutes(intervals, busy), 90);
});

test("staffing capacity is allocated once across courses", () => {
  const allocations = allocateMonthlyCourseCapacity([
    { courseId: "math", unscheduledMinutes: 240, qualifiedTeacherIds: ["teacher-1"] },
    { courseId: "english", unscheduledMinutes: 240, qualifiedTeacherIds: ["teacher-1"] },
  ], new Map([["teacher-1", 300]]));
  const allocated = (allocations.get("math") ?? 0) + (allocations.get("english") ?? 0);
  const gap = Math.max(0, 240 - (allocations.get("math") ?? 0)) + Math.max(0, 240 - (allocations.get("english") ?? 0));
  assert.equal(allocated, 300);
  assert.equal(gap, 180);
});

test("temporary offers conflict only when actual teacher dates overlap", () => {
  const first = [
    { date: "2026-09-01", startAt: "2026-09-01T08:00:00.000Z", endAt: "2026-09-01T09:00:00.000Z" },
    { date: "2026-09-08", startAt: "2026-09-08T08:00:00.000Z", endAt: "2026-09-08T09:00:00.000Z" },
  ];
  assert.equal(monthlySchedulingOffersConflict(first, [
    { date: "2026-09-01", startAt: "2026-09-01T08:30:00.000Z", endAt: "2026-09-01T09:30:00.000Z" },
  ]), true);
  assert.equal(monthlySchedulingOffersConflict(first, [
    { date: "2026-09-01", startAt: "2026-09-01T09:00:00.000Z", endAt: "2026-09-01T10:00:00.000Z" },
  ]), false);
});
