import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ticketSourceFromStudentSourceName } from "../lib/tickets";

const read = (path: string) => readFileSync(path, "utf8");

test("student source mapping never guesses when the profile source is missing", () => {
  assert.equal(ticketSourceFromStudentSourceName(null), null);
  assert.equal(ticketSourceFromStudentSourceName(""), null);
  assert.equal(ticketSourceFromStudentSourceName("新东方学生"), "新东方外包");
  assert.equal(ticketSourceFromStudentSourceName("上海新卓思 （Sister Company)"), "上海新卓思外包");
  assert.equal(ticketSourceFromStudentSourceName("北伦敦学校介绍"), "自营学生");
});

test("linked student tickets use the student profile source and block missing source", () => {
  const route = read("app/api/tickets/intake/[token]/route.ts");
  assert.match(route, /ticketSourceFromStudentSourceName\(linkedStudent\.sourceChannel\?\.name\)/);
  assert.match(route, /code: "STUDENT_SOURCE_MISSING"/);
  assert.match(route, /const source = linkedStudentSource \?\? requestedSource/);
});

test("ticket editing keeps request entry read-only and shows separate source dimensions", () => {
  const detail = read("app/admin/tickets/[id]/page.tsx");
  assert.doesNotMatch(detail, /name="source"/);
  assert.doesNotMatch(detail, /source,\n\s+type,/);
  assert.match(detail, /工单入口 \/ Request Entry/);
  assert.match(detail, /沟通渠道 \/ Communication Channel/);
  assert.match(detail, /学生来源 \/ Student Source/);
  assert.match(detail, /打开学生档案补充/);
});

test("student desk exposes a dedicated missing-source review queue", () => {
  const page = read("app/admin/students/page.tsx");
  assert.match(page, /MISSING_SOURCE_FILTER = "__missing__"/);
  assert.match(page, /where\.sourceChannelId = null/);
  assert.match(page, /学生来源未设置/);
});

test("guided intake displays the profile source and does not fall back to in-house", () => {
  const form = read("app/tickets/intake/GuidedIntakeForm.tsx");
  assert.match(form, /sourceChannelName: string \| null/);
  assert.match(form, /if \(!student\.ticketSource\)/);
  assert.match(form, /source: student\.ticketSource/);
  assert.doesNotMatch(form, /student\.ticketSource \|\| "自营学生"/);
});
