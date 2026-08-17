import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizeCommunicationReminderStatus } from "../lib/communication-reminders";

test("communication reminder states accept only the closed workflow vocabulary", () => {
  assert.equal(normalizeCommunicationReminderStatus("copied"), "COPIED");
  assert.equal(normalizeCommunicationReminderStatus("WAITING_REPLY"), "WAITING_REPLY");
  assert.equal(normalizeCommunicationReminderStatus("completed"), "COMPLETED");
  assert.equal(normalizeCommunicationReminderStatus("auto_send"), null);
  assert.equal(normalizeCommunicationReminderStatus(""), null);
});

test("web and miniapp both distinguish copy, send, reply and completion", () => {
  const web = readFileSync("app/admin/communication-reminders/CommunicationReminderClient.tsx", "utf8");
  const miniapp = readFileSync("miniapp/boss-academic-parent/pages/staff-reminder-attention/staff-reminder-attention.wxml", "utf8");
  for (const source of [web, miniapp]) {
    assert.match(source, /BILINGUAL/);
    assert.match(source, /WAITING_REPLY/);
    assert.match(source, /COMPLETED/);
    assert.match(source, /SNOOZED/);
    assert.match(source, /ESCALATED/);
  }
});

test("miniapp communication page keeps consent repair as a separate section", () => {
  const source = readFileSync("miniapp/boss-academic-parent/pages/staff-reminder-attention/staff-reminder-attention.wxml", "utf8");
  assert.match(source, /AI 沟通提醒/);
  assert.match(source, /微信通知授权补齐/);
  assert.match(source, /consentReminders/);
});

test("operational queue excludes stale reminder noise and narrows web permissions", () => {
  const projection = readFileSync("lib/communication-reminders.ts", "utf8");
  const webApi = readFileSync("app/api/admin/communication-reminders/route.ts", "utf8");
  const webPage = readFileSync("app/admin/communication-reminders/page.tsx", "utf8");
  const layout = readFileSync("app/admin/layout.tsx", "utf8");
  assert.match(projection, /2 \* DAY/);
  assert.match(projection, /\(isFill \? 30 : 14\) \* DAY/);
  assert.match(projection, /MiniappOperation/);
  assert.match(webApi, /user\.role === "CS"/);
  assert.match(webApi, /user\.workspaces\.includes\("CS"\)/);
  assert.match(webApi, /user\.operationsAdmin/);
  assert.match(webPage, /user\.operationsAdmin/);
  assert.match(layout, /user\.role === "CS" && pathname === "\/admin\/communication-reminders"/);
});
