import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { classifyRenewalRisk, renewalCohortForSourceName } from "../lib/renewal-management";

test("renewal risk uses scheduled overrun as exhausted", () => {
  assert.equal(classifyRenewalRisk({
    remainingMinutes: 120,
    scheduledMinutes: 180,
    daysToDepletion: 20,
    lessonsRemaining: 2,
    expiryDays: 30,
  }), "EXHAUSTED");
});

test("renewal thresholds classify red orange yellow and safe", () => {
  assert.equal(classifyRenewalRisk({ remainingMinutes: 600, scheduledMinutes: 0, daysToDepletion: 5, lessonsRemaining: 5, expiryDays: 30 }), "RED");
  assert.equal(classifyRenewalRisk({ remainingMinutes: 600, scheduledMinutes: 0, daysToDepletion: 10, lessonsRemaining: 5, expiryDays: 30 }), "ORANGE");
  assert.equal(classifyRenewalRisk({ remainingMinutes: 600, scheduledMinutes: 0, daysToDepletion: 21, lessonsRemaining: 5, expiryDays: 30 }), "YELLOW");
  assert.equal(classifyRenewalRisk({ remainingMinutes: 600, scheduledMinutes: 0, daysToDepletion: 22, lessonsRemaining: 5, expiryDays: 30 }), null);
});

test("New Oriental students use a dedicated renewal cohort", () => {
  assert.equal(renewalCohortForSourceName("新东方学生"), "XDF");
  assert.equal(renewalCohortForSourceName(" 新东方学生 "), "XDF");
  assert.equal(renewalCohortForSourceName("上海新卓思 （Sister Company)"), "BOSS_OTHER");
  assert.equal(renewalCohortForSourceName(null), "BOSS_OTHER");
});

test("renewal APIs and miniapp expose separate cohort controls", () => {
  const service = readFileSync("lib/renewal-management.ts", "utf8");
  const miniapp = readFileSync("miniapp/boss-academic-parent/pages/staff-renewals/staff-renewals.js", "utf8");
  const web = readFileSync("app/admin/renewals/RenewalWorkbenchClient.tsx", "utf8");
  assert.match(service, /LEGACY_XDF_SOURCE_CHANNEL_NAME/);
  assert.match(service, /buildXdfMessage/);
  assert.match(miniapp, /cohort:\s*"BOSS_OTHER"/);
  assert.match(miniapp, /新东方项目对接群/);
  assert.match(web, /新东方学生/);
});

test("teacher miniapp has no renewal or student operations capability", () => {
  const actionCenter = readFileSync("app/api/miniapp/staff/action-center/route.ts", "utf8");
  const studentRoute = readFileSync("app/api/miniapp/staff/students/route.ts", "utf8");
  assert.match(actionCenter, /studentWorkspace: false/);
  assert.match(studentRoute, /Student operations workspace permission required/);
  assert.doesNotMatch(actionCenter.split("if (user.role === \"TEACHER\"")[1].split("const canAcademic")[0], /renewalTask/);
});

test("renewal task migration enforces one open task per package", () => {
  const sql = readFileSync("prisma/migrations/20260723090000_add_renewal_followup_center/migration.sql", "utf8");
  assert.match(sql, /RenewalTask_one_open_per_package_idx/);
  assert.match(sql, /WHERE "completedAt" IS NULL/);
});

test("renewal completion requires evidence and suppresses immediate duplicate tasks", () => {
  const source = readFileSync("lib/renewal-management.ts", "utf8");
  assert.match(source, /status === "PARENT_NOTIFIED" && !task\.evidenceUrl/);
  assert.match(source, /suppressedPackageIds/);
  assert.match(source, /snoozedUntil/);
});
