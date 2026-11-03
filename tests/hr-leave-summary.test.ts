import assert from "node:assert/strict";
import test from "node:test";
import { HrLeaveLedgerEntryType as Entry, HrLeaveStatus as Status, HrLeaveType as Type } from "@prisma/client";
import { calculateLeaveSummary } from "../lib/hr-leave-summary";

const now = new Date("2026-11-03T04:00:00Z");
const at = (date: string) => new Date(date);
const ledger = (entryType: Entry, minutes: number, createdAt = "2026-01-02T00:00:00Z", expiresAt: string | null = null) => ({
  leaveType: Type.ANNUAL, entryType, minutes, createdAt: at(createdAt), expiresAt: expiresAt ? at(expiresAt) : null,
});
const request = (status: Status, minutes: number, startAt: string, endAt: string) => ({
  leaveType: Type.ANNUAL, status, durationMinutes: minutes, startAt: at(startAt), endAt: at(endAt),
});

test("separates taken, ongoing, future approved and pending without double deducting pending", () => {
  const result = calculateLeaveSummary([
    ledger(Entry.OPENING, 4800, "2025-12-01T00:00:00Z"),
    ledger(Entry.ACCRUAL, 960),
    ledger(Entry.USED, -240), ledger(Entry.USED, -480), ledger(Entry.USED, -480),
  ], [
    request(Status.APPROVED, 240, "2026-09-01T00:00:00Z", "2026-09-01T16:00:00Z"),
    request(Status.APPROVED, 480, "2026-11-03T00:00:00Z", "2026-11-03T16:00:00Z"),
    request(Status.APPROVED, 480, "2026-12-01T00:00:00Z", "2026-12-01T16:00:00Z"),
    request(Status.SUBMITTED, 90, "2026-12-02T00:00:00Z", "2026-12-02T16:00:00Z"),
    request(Status.REJECTED, 480, "2026-10-01T00:00:00Z", "2026-10-01T16:00:00Z"),
    request(Status.CANCELLED, 480, "2026-10-02T00:00:00Z", "2026-10-02T16:00:00Z"),
  ], now).get(Type.ANNUAL)!;
  assert.equal(result.openingMinutes, 4800);
  assert.equal(result.grantedMinutes, 960);
  assert.equal(result.utilisedMinutes, 240);
  assert.equal(result.ongoingApprovedMinutes, 480);
  assert.equal(result.futureApprovedMinutes, 480);
  assert.equal(result.pendingMinutes, 90);
  assert.equal(result.remainingMinutes, 4560);
  assert.equal(result.afterPendingMinutes, 4470);
  assert.equal(result.ledgerMismatch, false);
});

test("restored cancellation and expired credit reconcile to the source ledger", () => {
  const result = calculateLeaveSummary([
    ledger(Entry.OPENING, 960, "2025-12-01T00:00:00Z", "2026-06-01T00:00:00Z"),
    ledger(Entry.ACCRUAL, 480),
    ledger(Entry.USED, -240), ledger(Entry.RESTORED, 240),
  ], [request(Status.CANCELLED, 240, "2026-02-01T00:00:00Z", "2026-02-01T16:00:00Z")], now).get(Type.ANNUAL)!;
  assert.equal(result.openingMinutes, 960);
  assert.equal(result.expiredMinutes, 960);
  assert.equal(result.remainingMinutes, 480);
  assert.equal(result.utilisedMinutes, 0);
  assert.equal(result.ledgerMismatch, false);
});

test("unpaid leave has pending and utilised figures but no invented entitlement", () => {
  const result = calculateLeaveSummary([], [{ leaveType: Type.UNPAID, status: Status.SUBMITTED, durationMinutes: 240, startAt: at("2026-12-01"), endAt: at("2026-12-02") }], now).get(Type.UNPAID)!;
  assert.equal(result.tracksBalance, false);
  assert.equal(result.pendingMinutes, 240);
  assert.equal(result.openingMinutes, null);
  assert.equal(result.remainingMinutes, null);
  assert.equal(result.afterPendingMinutes, null);
});
