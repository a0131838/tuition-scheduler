import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path: string) {
  return readFileSync(path, "utf8");
}

test("shared admin shell does not rebuild the full approval inbox on every navigation", () => {
  const layout = read("app/admin/layout.tsx");
  const inbox = read("lib/approval-inbox.ts");

  assert.match(layout, /Promise\.all\(\[/);
  assert.match(layout, /getApprovalInboxShellData/);
  assert.doesNotMatch(layout, /getApprovalInboxData\(/);
  assert.match(inbox, /approval-inbox-shell-v1/);
  assert.match(inbox, /revalidate:\s*20/);
});

test("ticket filtering uses client navigation and bounded pagination", () => {
  const tickets = read("app/admin/tickets/page.tsx");

  assert.match(tickets, /<Form action="\/admin\/tickets" scroll=\{false\}/);
  assert.match(tickets, /take:\s*51/);
  assert.match(tickets, /skip:\s*\(page - 1\) \* 50/);
  assert.match(tickets, /aria-label="工单分页"/);
  assert.doesNotMatch(tickets, /take:\s*200/);
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
