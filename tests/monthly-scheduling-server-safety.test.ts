import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const service = fs.readFileSync(path.join(process.cwd(), "lib/monthly-scheduling.ts"), "utf8");
const adminPage = fs.readFileSync(path.join(process.cwd(), "app/admin/monthly-scheduling/page.tsx"), "utf8");
const parentRoute = fs.readFileSync(path.join(process.cwd(), "app/api/miniapp/monthly-scheduling/route.ts"), "utf8");
const staffRoute = fs.readFileSync(path.join(process.cwd(), "app/api/miniapp/staff/monthly-scheduling/route.ts"), "utf8");
const exportRoute = fs.readFileSync(path.join(process.cwd(), "app/admin/monthly-scheduling/export/route.ts"), "utf8");

test("monthly scheduling status writes use stale-state guards", () => {
  assert.match(service, /expectedStatus\?: MonthlySchedulingItemStatus/);
  assert.match(service, /status: input\.expectedStatus/);
  assert.match(staffRoute, /expectedStatus/);
  assert.match(adminPage, /name="expectedStatus"/);
});

test("parent submissions cannot overwrite matched or scheduled work", () => {
  assert.match(service, /status: \{ notIn: \["MATCHED", "SCHEDULED"\] \}/);
  assert.match(service, /campaign: \{ status: "OPEN" \}/);
  assert.match(parentRoute, /\["MATCHED", "SCHEDULED"\]\.includes\(row\.status\)/);
});

test("scheduled completion requires a real target-month lesson", () => {
  assert.match(service, /Create the formal lesson before marking this item as scheduled/);
  assert.match(service, /monthlySchedulingSessionStudentIds\(session\)\.includes\(item\.studentId\)/);
});

test("teacher-exception creation claims the item in the ticket transaction", () => {
  assert.match(adminPage, /prisma\.\$transaction/);
  assert.match(adminPage, /tx\.monthlySchedulingItem\.updateMany/);
  assert.match(adminPage, /claimed\.count !== 1/);
  assert.match(adminPage, /MONTHLY_SCHEDULING_ITEM:/);
  assert.match(adminPage, /item\.intent !== "CHANGE"/);
  assert.match(adminPage, /intent: "CHANGE"/);
});

test("CSV export rejects invalid months and neutralizes spreadsheet formulas", () => {
  assert.match(exportRoute, /Invalid month/);
  assert.ok(exportRoute.includes("const text = /^[=+\\-@]/.test(raw)"));
});
