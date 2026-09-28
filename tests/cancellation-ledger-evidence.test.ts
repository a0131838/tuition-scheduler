import assert from "node:assert/strict";
import test from "node:test";
import { cancellationLedgerEvidence as verify } from "../lib/cancellation-ledger-evidence";

const student = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const attendance = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", studentId: student, packageId: "p1", deductedMinutes: 0, deductedCount: 0, excusedCharge: false, package: { id: "p1", type: "HOURS", note: null as string | null } };
const base = { studentId: student, exclusiveStudentId: student, durationMinutes: 60, attendances: [attendance], transactions: [] as Array<{ id: string; packageId: string; kind: string; deltaMinutes: number; note: string | null }> };
const txn = (deltaMinutes: number, overrides = {}) => ({ id: `txn${deltaMinutes}`, packageId: "p1", kind: deltaMinutes < 0 ? "DEDUCT" : "ROLLBACK", deltaMinutes, note: null, ...overrides });

test("uncharged cancellation requires both attendance and net ledger to be clear", () => {
  assert.equal(verify(base).status, "VERIFIED");
  assert.equal(verify({ ...base, transactions: [txn(-60)] }).status, "MISMATCH");
  assert.equal(verify({ ...base, attendances: [{ ...attendance, deductedMinutes: 60 }] }).status, "MISMATCH");
  assert.equal(verify({ ...base, transactions: [txn(-60), txn(60)] }).status, "VERIFIED");
});
test("duplicate refund and cross-package refunds never cancel the original deduction", () => {
  assert.equal(verify({ ...base, transactions: [txn(-60), txn(60), txn(60, { id: "duplicate" })] }).status, "MISMATCH");
  assert.equal(verify({ ...base, transactions: [txn(-60), txn(60, { packageId: "p2" })] }).status, "MISMATCH");
});
test("charged hour package must have matching full lesson deduction", () => {
  const charged = { ...base, attendances: [{ ...attendance, excusedCharge: true, deductedMinutes: 60 }] };
  assert.equal(verify({ ...charged, transactions: [txn(-60)] }).status, "VERIFIED");
  assert.equal(verify(charged).status, "MISMATCH");
  assert.equal(verify({ ...charged, transactions: [txn(-30)] }).status, "MISMATCH");
  assert.equal(verify({ ...charged, attendances: [{ ...charged.attendances[0], packageId: null, package: null }] }).status, "MISMATCH");
});
test("monthly and group-count packages use their own units", () => {
  const monthly = { ...base, attendances: [{ ...attendance, excusedCharge: true, package: { ...attendance.package, type: "MONTHLY" } }] };
  assert.equal(verify(monthly).status, "VERIFIED");
  assert.equal(verify({ ...monthly, transactions: [txn(-60)] }).status, "MISMATCH");
  const count = { ...base, attendances: [{ ...attendance, excusedCharge: true, deductedCount: 1, package: { ...attendance.package, note: "[GROUP_PACK]" } }] };
  assert.equal(verify({ ...count, transactions: [txn(-1)] }).status, "VERIFIED");
  assert.equal(verify({ ...count, transactions: [txn(-60)] }).status, "MISMATCH");
});
test("shared package transactions are attributed by explicit references, never amount", () => {
  const shared = { ...base, exclusiveStudentId: null, attendances: [attendance, { ...attendance, id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", studentId: other, deductedMinutes: 60 }] };
  assert.equal(verify({ ...shared, transactions: [txn(-60)] }).status, "AMBIGUOUS");
  assert.equal(verify({ ...shared, transactions: [txn(-60, { note: `studentId=${other}` })] }).status, "VERIFIED");
  assert.equal(verify({ ...shared, transactions: [txn(-60, { note: `studentId=${student}` })] }).status, "MISMATCH");
  assert.equal(verify({ ...shared, transactions: [txn(-60, { note: `attendanceId=${attendance.id}` }), txn(60, { note: `studentId=${student}` })] }).status, "VERIFIED");
});
test("missing or conflicting historical references block verification", () => {
  assert.equal(verify({ ...base, transactions: [txn(-60, { note: `studentId=${other}; attendanceId=${attendance.id}` })] }).status, "AMBIGUOUS");
  assert.equal(verify({ ...base, transactions: [txn(-60, { note: "attendanceId=dddddddd-dddd-4ddd-8ddd-dddddddddddd" })] }).status, "AMBIGUOUS");
  assert.equal(verify({ ...base, exclusiveStudentId: null, transactions: [txn(-60), txn(60)] }).status, "AMBIGUOUS");
});
test("evidence retains exact transaction IDs and package nets for audit", () => {
  const evidence = verify({ ...base, transactions: [txn(-60), txn(60)] });
  assert.deepEqual(evidence.transactionIds, ["txn-60", "txn60"]);
  assert.deepEqual(evidence.packageNets, [{ packageId: "p1", netUnits: 0 }]);
});
