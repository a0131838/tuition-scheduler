import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  resolvePayrollPaymentTreatment,
  type PayrollEmploymentContext,
} from "../lib/teacher-employment-payroll";

const teacherId = "teacher-1";
const effectiveFrom = new Date("2026-08-09T16:00:00.000Z");

function context(input?: { effectiveTo?: Date | null; withOverride?: boolean }): PayrollEmploymentContext {
  return {
    termsByTeacher: new Map([
      [
        teacherId,
        [{
          id: "term-1",
          teacherId,
          employmentType: "FULL_TIME",
          lessonPayMode: "INCLUDED_IN_SALARY",
          effectiveFrom,
          effectiveTo: input?.effectiveTo ?? null,
          note: "Full-time from 10 Aug 2026",
          createdBy: "manager@example.com",
        }],
      ],
    ]),
    overridesBySession: new Map(
      input?.withOverride
        ? [["session-exception", {
            id: "override-1",
            sessionId: "session-exception",
            teacherId,
            payMode: "SEPARATELY_PAYABLE",
            reason: "Approved weekend event",
            createdBy: "manager@example.com",
          }]]
        : [],
    ),
  };
}

test("full-time lesson pay starts exactly on the effective business date", () => {
  const before = resolvePayrollPaymentTreatment({
    teacherId,
    sessionId: "before",
    startAt: new Date("2026-08-09T15:59:59.999Z"),
    context: context(),
  });
  const atEffectiveDate = resolvePayrollPaymentTreatment({
    teacherId,
    sessionId: "after",
    startAt: effectiveFrom,
    context: context(),
  });

  assert.equal(before.payMode, "SEPARATELY_PAYABLE");
  assert.equal(before.source, "DEFAULT_HOURLY");
  assert.equal(atEffectiveDate.payMode, "INCLUDED_IN_SALARY");
  assert.equal(atEffectiveDate.employmentType, "FULL_TIME");
  assert.equal(atEffectiveDate.source, "EMPLOYMENT_TERM");
});

test("employment end is exclusive so historical terms do not leak forward", () => {
  const effectiveTo = new Date("2026-09-01T16:00:00.000Z");
  const result = resolvePayrollPaymentTreatment({
    teacherId,
    sessionId: "after-term",
    startAt: effectiveTo,
    context: context({ effectiveTo }),
  });
  assert.equal(result.payMode, "SEPARATELY_PAYABLE");
  assert.equal(result.source, "DEFAULT_HOURLY");
});

test("management session override wins without changing the employment term", () => {
  const result = resolvePayrollPaymentTreatment({
    teacherId,
    sessionId: "session-exception",
    startAt: new Date("2026-08-10T02:00:00.000Z"),
    context: context({ withOverride: true }),
  });
  assert.equal(result.payMode, "SEPARATELY_PAYABLE");
  assert.equal(result.source, "SESSION_OVERRIDE");
  assert.equal(result.reason, "Approved weekend event");
  assert.equal(result.employmentType, "FULL_TIME");
});

test("migration seeds the approved employees with effective-date terms", () => {
  const migration = fs.readFileSync(
    path.join(process.cwd(), "prisma/migrations/20260817143000_add_effective_teacher_employment_payroll/migration.sql"),
    "utf8",
  );
  assert.match(migration, /66c22126-ae26-42b0-bbcf-ac3578a555ca/);
  assert.match(migration, /aad58934-c4b3-4e30-b207-e7026af12f22/);
  assert.match(migration, /c52362c1-97f9-4e49-a525-48c46d4a8289/);
  assert.match(migration, /2026-08-09 16:00:00/);
  assert.match(migration, /2026-05-31 16:00:00/);
  assert.doesNotMatch(migration, /SessionFeedback/);
});

test("payroll calculations keep contractual rates and apply payment treatment separately", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "lib/teacher-payroll.ts"), "utf8");
  assert.ok(source.match(/resolvePayrollPaymentTreatment/g)?.length === 4);
  assert.match(source, /const amountCents = includedInSalary \? 0 : contractualAmountCents/g);
  assert.match(source, /matchedPayableSessions: row\.separatelyPayableSessions/);
});
