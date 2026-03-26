import assert from "node:assert/strict";
import test from "node:test";
import {
  deleteTeacherAvailabilityDateSlot,
  deleteTeacherAvailabilityWeeklySlot,
} from "../lib/admin-teacher-availability";

test("date availability delete scopes by teacherId", async () => {
  let captured: { where: { id: string; teacherId: string } } | null = null;
  const db = {
    teacherAvailabilityDate: {
      async deleteMany(args: { where: { id: string; teacherId: string } }) {
        captured = args;
        return { count: 1 };
      },
    },
    teacherAvailability: {
      async deleteMany() {
        return { count: 0 };
      },
    },
  };

  const result = await deleteTeacherAvailabilityDateSlot(db, "teacher-1", "slot-1");

  assert.deepEqual(captured, { where: { id: "slot-1", teacherId: "teacher-1" } });
  assert.equal(result.count, 1);
});

test("weekly availability delete scopes by teacherId", async () => {
  let captured: { where: { id: string; teacherId: string } } | null = null;
  const db = {
    teacherAvailabilityDate: {
      async deleteMany() {
        return { count: 0 };
      },
    },
    teacherAvailability: {
      async deleteMany(args: { where: { id: string; teacherId: string } }) {
        captured = args;
        return { count: 0 };
      },
    },
  };

  const result = await deleteTeacherAvailabilityWeeklySlot(db, "teacher-9", "slot-7");

  assert.deepEqual(captured, { where: { id: "slot-7", teacherId: "teacher-9" } });
  assert.equal(result.count, 0);
});
