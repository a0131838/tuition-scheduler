import assert from "node:assert/strict";
import test from "node:test";
import { PackageFinanceGateStatus, PackageType } from "@prisma/client";
import { firstSchedulingPackageState, studentSchedulingTicketType } from "@/lib/miniapp-first-scheduling";
import { normalizeMiniappRequestType, normalizeMiniappStaffRequestType } from "@/lib/miniapp-parent-requests";
import { canCreateSessionFromTicketType, MOBILE_SCHEDULING_TICKET_TYPES } from "@/lib/miniapp-scheduling-coordination-board";
import { buildTicketNewSessionStartTimes, createTicketNewSessionToken, verifyTicketNewSessionToken } from "@/lib/miniapp-ticket-new-session";

function pkg(input?: { subjects?: number; gate?: PackageFinanceGateStatus }) {
  return {
    id: "package-1",
    type: PackageType.HOURS,
    remainingMinutes: 600,
    validFrom: new Date("2026-07-01T00:00:00.000Z"),
    validTo: null,
    financeGateStatus: input?.gate ?? PackageFinanceGateStatus.SCHEDULABLE,
    financeGateReason: null,
    course: { id: "course-1", name: "Mathematics", _count: { subjects: input?.subjects ?? 1 } },
  };
}

test("first scheduling marks a configured and finance-ready package as ready", () => {
  assert.deepEqual(firstSchedulingPackageState([pkg()]), { ready: true, readyCount: 1, reasons: [] });
});

test("first scheduling explains missing subjects and finance gate blockers", () => {
  assert.deepEqual(firstSchedulingPackageState([]), {
    ready: false,
    readyCount: 0,
    reasons: ["没有可用于排课的有效课包"],
  });
  assert.deepEqual(firstSchedulingPackageState([pkg({ subjects: 0 })]), {
    ready: false,
    readyCount: 0,
    reasons: ["有效课包对应课程尚未配置科目"],
  });
  assert.deepEqual(firstSchedulingPackageState([pkg({ gate: PackageFinanceGateStatus.INVOICE_PENDING_MANAGER })]), {
    ready: false,
    readyCount: 0,
    reasons: ["课包财务门禁尚未放行"],
  });
});

test("student scheduling creates the correct operational ticket type", () => {
  assert.equal(studentSchedulingTicketType(false), "新排课");
  assert.equal(studentSchedulingTicketType(true), "补课加课");
});

test("parent scheduling requests and staff new-session tickets enter the coordination flow", () => {
  assert.equal(MOBILE_SCHEDULING_TICKET_TYPES.includes("排课要求"), true);
  for (const type of ["排课要求", "排课协调", "新排课", "补课加课"]) {
    assert.equal(canCreateSessionFromTicketType(type), true);
  }
  assert.equal(canCreateSessionFromTicketType("临时取消&请假课程"), false);
});

test("staff can create operational scheduling types without exposing them as parent request types", () => {
  assert.equal(normalizeMiniappStaffRequestType("新排课"), "新排课");
  assert.equal(normalizeMiniappStaffRequestType("补课加课"), "补课加课");
  assert.equal(normalizeMiniappRequestType("新排课"), "其他");
});

test("first scheduling builds one-to-twelve weekly starts and rejects unsafe ranges", () => {
  const starts = buildTicketNewSessionStartTimes(new Date("2026-07-20T02:00:00.000Z"), 3);
  assert.deepEqual(starts.map((row) => row.toISOString()), [
    "2026-07-20T02:00:00.000Z",
    "2026-07-27T02:00:00.000Z",
    "2026-08-03T02:00:00.000Z",
  ]);
  assert.throws(() => buildTicketNewSessionStartTimes(new Date(), 0), /1 到 12 周/);
  assert.throws(() => buildTicketNewSessionStartTimes(new Date(), 13), /1 到 12 周/);
});

test("first scheduling preview token binds the continuous week count", () => {
  const secret = "test-secret";
  const token = createTicketNewSessionToken({
    userId: "user-1",
    ticketId: "ticket-1",
    subjectId: "subject-1",
    levelId: null,
    teacherId: "teacher-1",
    campusId: "campus-1",
    roomId: null,
    startAt: "2026-07-20T02:00:00.000Z",
    durationMin: 60,
    weeks: 6,
  }, secret);
  assert.equal(verifyTicketNewSessionToken(token, secret)?.weeks, 6);
  assert.equal(verifyTicketNewSessionToken(token, "wrong-secret"), null);
});
