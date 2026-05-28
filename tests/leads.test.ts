import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLeadFocusWhere,
  buildLeadSourceChannelName,
  buildLeadStudentNote,
  canHardDeleteLead,
  csvEscape,
  singaporeDayRange,
  singaporeWeekRange,
  summarizeLeadRows,
} from "../lib/leads";

test("build lead source channel name keeps main source and manual platform", () => {
  assert.equal(buildLeadSourceChannelName({ sourceType: "短视频/自媒体", sourcePlatform: "TikTok" }), "短视频/自媒体 - TikTok");
  assert.equal(buildLeadSourceChannelName({ sourceType: "小红书", sourcePlatform: "小红书" }), "小红书");
  assert.equal(buildLeadSourceChannelName({}), "其他");
});

test("build student note includes source details from lead", () => {
  const note = buildLeadStudentNote({
    leadNo: "L20260528-001",
    sourceType: "老客户介绍",
    sourcePlatform: "微信",
    sourceDetail: "Referred by parent A",
    parentName: "Mrs Tan",
    parentWechat: "tan123",
    needs: "IB English support",
  });
  assert.match(note, /L20260528-001/);
  assert.match(note, /老客户介绍 \/ 微信/);
  assert.match(note, /Referred by parent A/);
});

test("summarize lead rows counts open, hot, overdue, won, and lost", () => {
  const now = new Date("2026-05-28T12:00:00+08:00");
  const rows = [
    { status: "New Lead", intentLevel: "Hot", nextActionDue: new Date("2026-05-28T08:00:00+08:00") },
    { status: "Won", intentLevel: "Warm", nextActionDue: null },
    { status: "Lost", intentLevel: "Cold", nextActionDue: null },
    { status: "Contacted", intentLevel: "Hot", nextActionDue: new Date("2026-05-29T08:00:00+08:00") },
  ];
  assert.deepEqual(summarizeLeadRows(rows, now), {
    total: 4,
    open: 2,
    hot: 2,
    overdue: 1,
    won: 1,
    lost: 1,
  });
});

test("csv escape quotes only when needed", () => {
  assert.equal(csvEscape("plain"), "plain");
  assert.equal(csvEscape("a,b"), '"a,b"');
  assert.equal(csvEscape('say "hi"'), '"say ""hi"""');
});

test("hard delete guard only allows clearly marked test resources", () => {
  assert.equal(canHardDeleteLead({ studentName: "TEST CRM Student" }), true);
  assert.equal(canHardDeleteLead({ sourceDetail: "created for test run" }), true);
  assert.equal(canHardDeleteLead({ studentName: "Real Student", latestSummary: "normal inquiry" }), false);
});

test("lead focus filters use Singapore today and week boundaries", () => {
  const now = new Date("2026-05-28T04:00:00.000Z");
  assert.deepEqual(singaporeDayRange(now), {
    start: new Date("2026-05-27T16:00:00.000Z"),
    end: new Date("2026-05-28T16:00:00.000Z"),
  });
  assert.deepEqual(singaporeWeekRange(now), {
    start: new Date("2026-05-24T16:00:00.000Z"),
    end: new Date("2026-05-31T16:00:00.000Z"),
  });
  assert.deepEqual(buildLeadFocusWhere("mine", "Jasmine", now), { ownerName: "Jasmine" });
  assert.deepEqual(buildLeadFocusWhere("hot", "Jasmine", now), { intentLevel: "Hot" });
  assert.deepEqual(buildLeadFocusWhere("pending-assessment", "Jasmine", now), {
    assessmentRequests: { some: { status: { in: ["Pending", "Revision Requested"] } } },
  });
});
