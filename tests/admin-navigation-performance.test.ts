import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path: string) {
  return readFileSync(path, "utf8");
}

test("shared admin shell does not rebuild the full approval inbox on every navigation", () => {
  const layout = read("app/admin/layout.tsx");

  assert.match(layout, /Promise\.all\(\[/);
  assert.doesNotMatch(layout, /getApprovalInboxShellData/);
  assert.doesNotMatch(layout, /getApprovalInboxData\(/);
  assert.match(layout, /const approvalInboxLabel = t\(lang, "Approval Inbox", "审批提醒"\)/);
});

test("request auth is memoized by session token", () => {
  const auth = read("lib/auth.ts");

  assert.match(auth, /const getCurrentUserByToken = cache\(async \(token: string\)/);
  assert.match(auth, /return getCurrentUserByToken\(token\)/);
});

test("slow secondary work is parallelized or deferred", () => {
  const alerts = read("app/admin/alerts/page.tsx");
  const monthly = read("app/admin/reports/monthly-schedule/page.tsx");
  const ticket = read("app/admin/tickets/[id]/page.tsx");
  const todos = read("app/admin/todos/page.tsx");

  assert.match(alerts, /after\(async \(\) =>/);
  assert.doesNotMatch(alerts, /await syncSignInAlerts\(\)\)\.thresholdMin/);
  assert.match(alerts, /const \[thresholdMin, alerts\] = await Promise\.all/);
  assert.match(monthly, /const \[data, monthlySchedulingCampaign\] = await Promise\.all/);
  assert.match(ticket, /const aiPlanPromise =/);
  assert.match(ticket, /const sessionsPromise =/);
  assert.match(ticket, /const \[aiPlanResult, \[upcomingSessions, existingResultSessions\]\] = await Promise\.all/);
  assert.match(todos, /const operationsDataPromise = Promise\.all/);
  assert.match(todos, /await operationsDataPromise/);
});

test("ticket filtering uses native GET navigation and bounded pagination", () => {
  const tickets = read("app/admin/tickets/page.tsx");
  const filterForm = read("app/admin/tickets/_components/TicketPrimaryFilterForm.tsx");

  assert.match(tickets, /<TicketPrimaryFilterForm showClear=\{activeFilterCount > 0\}>/);
  assert.match(tickets, /!clearDesk && !applyDesk/);
  assert.match(tickets, /take:\s*51/);
  assert.match(tickets, /skip:\s*\(page - 1\) \* 50/);
  assert.match(tickets, /aria-label="工单分页"/);
  assert.doesNotMatch(tickets, /take:\s*200/);
  assert.match(filterForm, /action="\/admin\/tickets"/);
  assert.match(filterForm, /method="get"/);
  assert.match(filterForm, /<input type="hidden" name="applyDesk" value="1" \/>/);
  assert.match(filterForm, /<button type="submit">筛选<\/button>/);
  assert.doesNotMatch(filterForm, /useTransition/);
  assert.doesNotMatch(filterForm, /router\.replace/);
  assert.doesNotMatch(filterForm, /正在筛选/);
});

test("todo attendance window is loaded once instead of once per day bucket", () => {
  const todos = read("app/admin/todos/page.tsx");
  const optimizedBlock = todos.slice(todos.indexOf("const [sessionsHistoryWindow"), todos.indexOf("const tomorrowClassIds"));

  assert.match(optimizedBlock, /sessionsHistoryWindow/);
  assert.match(optimizedBlock, /historyEnrollmentsByClass/);
  assert.match(optimizedBlock, /historyAttendanceBySession/);
  assert.equal((optimizedBlock.match(/prisma\.session\.findMany/g) ?? []).length, 2);
  assert.equal((optimizedBlock.match(/prisma\.enrollment\.findMany/g) ?? []).length, 1);
  assert.equal((optimizedBlock.match(/prisma\.attendance\.findMany/g) ?? []).length, 1);
});

test("admin navigation exposes an immediate loading state", () => {
  const loading = read("app/admin/loading.tsx");

  assert.match(loading, /role="status"/);
  assert.match(loading, /页面正在加载，请勿重复点击/);
});
