import assert from "node:assert/strict";
import test from "node:test";
import { isOperationsAdminPathAllowed } from "../lib/operations-admin-access";

test("operations staff can reach only the individual payslip PDF handler", () => {
  assert.equal(isOperationsAdminPathAllowed("/staff/hr"), true);
  assert.equal(isOperationsAdminPathAllowed("/api/hr/payslips/example/pdf"), true);
  assert.equal(isOperationsAdminPathAllowed("/api/hr/payslips/example/pdf?download=1"), true);
  for (const path of ["/api/hr/payslips", "/api/hr/payslips/example", "/api/hr/payslips/example/approve", "/api/hr/payslips/example/pdf/extra", "/api/hr/payslips//pdf", "/api/hr/employees", "/admin/hr/payslips", "/admin/finance/workbench", "/api/exports/teacher-payroll/example"]) {
    assert.equal(isOperationsAdminPathAllowed(path), false, path);
  }
});
