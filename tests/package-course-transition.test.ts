import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { AttendanceStatus } from "@prisma/client";
import {
  COURSE_CHANGE_REMINDER_REQUEUE_ERROR,
  matchCourseTransitionLevel,
  matchCourseTransitionSubject,
  sharedCourseIdsAfterTransition,
  transitionPackageCourse,
} from "../lib/package-course-transition";
import {
  STANDARD_PACKAGE_DEFAULT_MINUTES,
  STANDARD_PACKAGE_HOUR_PRESETS,
} from "../lib/package-hour-presets";

test("standard package suggestions are fixed at 15, 50 and 100 hours", () => {
  assert.equal(STANDARD_PACKAGE_DEFAULT_MINUTES, 900);
  assert.deepEqual(
    STANDARD_PACKAGE_HOUR_PRESETS.map((preset) => preset.minutes),
    [900, 3000, 6000]
  );
});

test("course transition matches bilingual subject and level aliases", () => {
  const subjects = [
    {
      id: "subject-math",
      name: "数学 / Math",
      levels: [{ id: "level-6", name: "Grade 6 / 六年级" }],
    },
    {
      id: "subject-english",
      name: "英语 / English",
      levels: [],
    },
  ];
  const subject = matchCourseTransitionSubject("Math / 数学", subjects);
  assert.equal(subject?.id, "subject-math");
  assert.equal(matchCourseTransitionLevel("六年级", subject?.levels ?? [])?.id, "level-6");
});

test("old primary course remains available for historical deductions after transition", () => {
  assert.deepEqual(
    sharedCourseIdsAfterTransition({
      selectedSharedCourseIds: ["course-target", "course-extra"],
      oldCourseId: "course-old",
      targetCourseId: "course-target",
    }).sort(),
    ["course-extra", "course-old"]
  );
});

test("transition moves only safe future one-to-one sessions and invalidates pending reminders", async () => {
  const now = new Date("2026-07-23T00:00:00.000Z");
  const movedSessions: Array<{ id: string; classId: string }> = [];
  const createdClasses: any[] = [];
  const enrollments: any[] = [];
  const reminderUpdates: any[] = [];
  const classBase = {
    id: "class-old",
    teacherId: "teacher-1",
    courseId: "course-old",
    subjectId: "subject-old",
    levelId: "level-old",
    campusId: "campus-1",
    roomId: "room-1",
    capacity: 1,
    oneOnOneStudentId: "student-1",
    subject: { name: "Math / 数学" },
    level: { name: "六年级" },
    enrollments: [{ studentId: "student-1" }],
  };
  const sessionBase = {
    startAt: new Date("2026-07-25T02:00:00.000Z"),
    endAt: new Date("2026-07-25T03:00:00.000Z"),
    studentId: "student-1",
    class: classBase,
  };
  const fakeDb = {
    coursePackage: {
      findUnique: async () => ({
        id: "package-1",
        studentId: "student-1",
        courseId: "course-old",
        course: { name: "International School Admission" },
        sharedStudents: [{ studentId: "student-2" }],
      }),
    },
    course: {
      findUnique: async () => ({
        id: "course-target",
        name: "Academic Subject Bridging",
        subjects: [
          {
            id: "subject-target",
            name: "数学 / Math",
            levels: [{ id: "level-target", name: "Grade 6 / 六年级" }],
          },
        ],
      }),
    },
    session: {
      findMany: async () => [
        {
          ...sessionBase,
          id: "session-movable",
          feedbacks: [],
          attendances: [
            {
              studentId: "student-1",
              status: AttendanceStatus.UNMARKED,
              deductedMinutes: 0,
              deductedCount: 0,
            },
          ],
        },
        {
          ...sessionBase,
          id: "session-protected",
          feedbacks: [{ id: "feedback-1" }],
          attendances: [],
        },
        {
          ...sessionBase,
          id: "session-ambiguous",
          studentId: null,
          class: {
            ...classBase,
            oneOnOneStudentId: null,
            enrollments: [{ studentId: "student-1" }, { studentId: "student-2" }],
          },
          feedbacks: [],
          attendances: [],
        },
      ],
      count: async () => 2,
      findFirst: async () => null,
      update: async ({ where, data }: any) => {
        movedSessions.push({ id: where.id, classId: data.classId });
        return { id: where.id };
      },
    },
    class: {
      findFirst: async () => null,
      create: async ({ data }: any) => {
        createdClasses.push(data);
        return { id: "class-target" };
      },
    },
    enrollment: {
      upsert: async (input: any) => {
        enrollments.push(input);
        return input.create;
      },
    },
    miniappNotificationOutbox: {
      updateMany: async (input: any) => {
        reminderUpdates.push(input);
        return { count: 1 };
      },
    },
  };

  const result = await transitionPackageCourse(fakeDb as any, {
    packageId: "package-1",
    targetCourseId: "course-target",
    now,
  });

  assert.deepEqual(result.migratedSessionIds, ["session-movable"]);
  assert.equal(result.futureGroupSessions, 2);
  assert.equal(result.protectedSessions, 1);
  assert.equal(result.ambiguousSessions, 1);
  assert.deepEqual(movedSessions, [{ id: "session-movable", classId: "class-target" }]);
  assert.equal(createdClasses[0].courseId, "course-target");
  assert.equal(createdClasses[0].subjectId, "subject-target");
  assert.equal(createdClasses[0].levelId, "level-target");
  assert.equal(enrollments.length, 1);
  assert.equal(reminderUpdates[0].data.error, COURSE_CHANGE_REMINDER_REQUEUE_ERROR);
  assert.equal(result.invalidatedReminderCount, 1);
});

test("package edit API keeps course migration and reminder refresh in one controlled flow", async () => {
  const apiSource = await readFile(
    new URL("../app/api/admin/packages/[id]/route.ts", import.meta.url),
    "utf8"
  );
  const modalSource = await readFile(
    new URL("../app/admin/_components/PackageEditModal.tsx", import.meta.url),
    "utf8"
  );
  const notificationSource = await readFile(
    new URL("../lib/miniapp-notifications.ts", import.meta.url),
    "utf8"
  );

  assert.match(apiSource, /transitionPackageCourse\(tx/);
  assert.match(apiSource, /courseId:\s*targetCourseId/);
  assert.match(apiSource, /action:\s*"CHANGE_COURSE"/);
  assert.match(modalSource, /previewCourseId/);
  assert.match(modalSource, /Reason \/ 修改原因/);
  assert.match(notificationSource, /COURSE_CHANGE_REMINDER_REQUEUE_ERROR/);
});
