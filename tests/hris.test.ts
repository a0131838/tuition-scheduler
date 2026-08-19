import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { calculateWorkingLeaveMinutes } from "../lib/hr-leave";
import { calculateHrPayslipTotals, normalizeHrMonth } from "../lib/hr-payslip";
import { hrChecklistTemplate } from "../lib/hr-checklist";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("HRIS migration is additive and keeps private HR data separate", () => {
  const sql = read("prisma/migrations/20260819183000_add_hris_core/migration.sql");
  assert.match(sql, /CREATE TABLE "EmployeeProfile"/);
  assert.match(sql, /CREATE TABLE "HrLeaveRequest"/);
  assert.match(sql, /CREATE TABLE "HrPayslip"/);
  assert.match(sql, /ALTER TYPE "StaffWorkspace" ADD VALUE 'HR'/);
  assert.doesNotMatch(sql, /DROP TABLE|DROP COLUMN|TRUNCATE/);
  assert.doesNotMatch(read("lib/hr-private-files.ts"), /public["',)]/);
});

test("local and foreign employee lifecycle checklists cover required filing stages", () => {
  const local = hrChecklistTemplate(false);
  const foreign = hrChecklistTemplate(true);
  for (const code of ["MANPOWER_REQUISITION", "CONTRACT", "PAYROLL_SETUP", "LEAVE", "DISCIPLINARY", "FINAL_PAYROLL", "FILE_ARCHIVED", "CPF", "IR8A"]) assert.ok(local.some(item => item.code === code), code);
  for (const code of ["PASSPORT", "WORK_PASS_APPLICATION", "MEDICAL_INSURANCE", "PASS_ISSUANCE", "WORK_PASS_RENEWAL", "WORK_PASS_CANCEL", "IR21"]) assert.ok(foreign.some(item => item.code === code), code);
});

test("leave duration follows workdays, half-days and hourly requests", () => {
  const monday = new Date("2026-08-17T00:00:00+08:00");
  const tuesday = new Date("2026-08-18T23:59:59+08:00");
  assert.equal(calculateWorkingLeaveMinutes({ startAt: monday, endAt: tuesday }), 960);
  assert.equal(calculateWorkingLeaveMinutes({ startAt: monday, endAt: monday, portion: "HALF_DAY" }), 240);
  assert.equal(calculateWorkingLeaveMinutes({ startAt: monday, endAt: monday, portion: "HOURLY", hourlyMinutes: 90 }), 90);
});

test("payslip totals remain deterministic and month input is strict", () => {
  assert.deepEqual(calculateHrPayslipTotals({ basicSalaryCents: 300000, allowanceCents: 20000, deductionCents: 5000, employeeCpfCents: 60000, employerCpfCents: 0, reimbursementCents: 1200 }), { basicSalaryCents: 300000, allowanceCents: 20000, deductionCents: 5000, employeeCpfCents: 60000, reimbursementCents: 1200, grossPayCents: 320000, netPayCents: 256200 });
  assert.equal(normalizeHrMonth("2026-08"), "2026-08");
  assert.throws(() => normalizeHrMonth("08/2026"));
});

test("HR permissions, self service, miniapp and scheduling guard are wired", () => {
  assert.match(read("lib/hr-access.ts"), /role === "FINANCE"/);
  assert.match(read("app/api/hr/documents/[id]/route.ts"), /HIGHLY_RESTRICTED/);
  assert.match(read("app/_components/HrSelfService.tsx"), /Apply for leave/);
  assert.match(read("app/api/miniapp/staff/hr/leave/route.ts"), /submitLeaveRequest/);
  assert.match(read("lib/teacher-scheduling-availability.ts"), /hrLeaveRequest\.findFirst/);
  assert.match(read("lib/teacher-scheduling-availability.ts"), /status: "APPROVED"/);
});

test("payslip approval separates HR, finance, director and employee visibility", () => {
  const page = read("app/admin/hr/payslips/page.tsx");
  const pdf = read("app/api/hr/payslips/[id]/pdf/route.ts");
  assert.match(page, /HR_VERIFIED/);
  assert.match(page, /FINANCE_CONFIRMED/);
  assert.match(page, /DIRECTOR_APPROVED/);
  assert.match(page, /paymentReference/);
  assert.match(pdf, /DIRECTOR_APPROVED/);
  assert.match(pdf, /row\.employee\.userId === actor\.id/);
});
