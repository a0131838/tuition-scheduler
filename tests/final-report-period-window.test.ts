import assert from "node:assert/strict";
import { test } from "node:test";
import { inferPeriodWindow } from "../lib/final-report-period-window";

type Evidence = Parameters<typeof inferPeriodWindow>[0];
const time = (day: number) => new Date(Date.UTC(2025, 0, day, 1));
function example(): Evidence {
  const credit = (id: string, day: number, minutes: number) => ({
    id,
    createdAt: time(day),
    kind: "PURCHASE" as const,
    sessionId: null,
    deltaMinutes: minutes,
    correctionEntry: null,
    correctionSources: [],
  });
  return {
    id: "package",
    totalMinutes: 8400,
    remainingMinutes: 8400,
    txns: [credit("A", 1, 2400), credit("B", 3, 6000)],
    attendances: [],
    finalReportPeriods: [],
  };
}
function lesson(pkg: Evidence, day: number, minutes: number, studentId = "student") {
  const sessionId = "lesson" + day;
  const startAt = time(day),
    endAt = new Date(+startAt + minutes * 60000);
  pkg.attendances.push({
    studentId,
    sessionId,
    status: "PRESENT",
    deductedMinutes: minutes,
    session: { startAt, endAt },
  });
  pkg.txns.push({
    id: "txn" + day,
    createdAt: endAt,
    kind: "DEDUCT",
    sessionId,
    deltaMinutes: -minutes,
    correctionEntry: null,
    correctionSources: [],
  });
  pkg.remainingMinutes -= minutes;
  return { startAt, endAt };
}
test("early renewal waits for actual second-period attendance and excludes old hours", () => {
  const pkg = example();
  lesson(pkg, 2, 1800);
  const window = () => inferPeriodWindow(pkg, "student", "B");
  assert.equal(window().state, "waiting");
  lesson(pkg, 6, 600);
  assert.equal(window().state, "waiting");
  const first = lesson(pkg, 7, 60);
  const latest = lesson(pkg, 12, 90);
  assert.deepEqual(window(), { state: "ready", start: first.startAt, end: latest.endAt });
  assert.equal(pkg.remainingMinutes, 5850);
});
test("shared hours allocate across the package but only the selected student's attendance sets dates", () => {
  const pkg = example();
  lesson(pkg, 2, 2400, "sibling");
  lesson(pkg, 7, 60, "sibling");
  assert.equal(inferPeriodWindow(pkg, "student", "B").state, "waiting");
  const first = lesson(pkg, 8, 60);
  assert.deepEqual(inferPeriodWindow(pkg, "student", "B"), {
    state: "ready",
    start: first.startAt,
    end: first.endAt,
  });
});
test("ambiguous crossing, unmatched ledger or overlapping frozen report boundaries need confirmation", () => {
  const pkg = example();
  lesson(pkg, 2, 2370);
  lesson(pkg, 6, 60);
  const window = () => inferPeriodWindow(pkg, "student", "B");
  assert.equal(window().state, "ambiguous");
  pkg.finalReportPeriods.push({
    purchaseTxnId: "A",
    studentId: "student",
    startsAt: time(2),
    endsAt: pkg.attendances[0].session.endAt,
    reports: [],
  });
  assert.equal(window().state, "ready");
  pkg.remainingMinutes++;
  assert.equal(window().state, "ambiguous");
  pkg.remainingMinutes--;
  pkg.finalReportPeriods[0].reports.push({
    reportJson: { _meta: { periodWindow: { start: time(6).toISOString(), end: time(7).toISOString() } } },
  });
  assert.equal(window().state, "ambiguous");
});
