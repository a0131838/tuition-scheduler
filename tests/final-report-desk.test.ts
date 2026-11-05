import assert from "node:assert/strict";
import test from "node:test";
import { parseFinalDeskParams, finalDeskUrl, finalDeskReturnUrl, finalDeskResultUrl, finalDeskReportWhere, filterFinalDeskCandidates, finalDeskPagination } from "../lib/final-report-desk";

test("legacy report links preserve their status while default entry is to assign", () => {
  assert.equal(parseFinalDeskParams({}).view, "unassigned");
  for (const status of ["active", "submitted", "pending-delivery", "delivered", "exempt", "archived", "shared", "expired-shares"]) {
    const p = parseFinalDeskParams({ view: status });
    assert.equal(p.view, "all"); assert.equal(p.status, status);
  }
});

test("result links preserve filters and page, and cannot become external redirects", () => {
  const state = parseFinalDeskParams({ view: "review", q: "李 Herman", teacherId: "teacher", page: 3, reportId: "report" });
  const back = finalDeskUrl(state), url = new URL(finalDeskResultUrl(back, "ok", "approved"), "https://example.test");
  assert.equal(url.searchParams.get("reportId"), "report"); assert.equal(url.searchParams.get("page"), "3");
  assert.equal(url.searchParams.get("q"), "李 Herman"); assert.equal(url.hash, "#final-report-operation-result");
  for (const unsafe of ["https://evil.test/admin/reports/final?reportId=bad", "//evil.test/admin/reports/final", "/admin/finance?reportId=bad", "javascript:alert(1)"]) {
    assert.equal(finalDeskReturnUrl(unsafe), "/admin/reports/final?view=unassigned");
  }
  assert.equal(finalDeskReturnUrl(back + "&untrusted=1").includes("untrusted"), false);
});

test("assignment returns to the original list with an independently addressable receipt", () => {
  const result = new URL(finalDeskResultUrl("/admin/reports/final?view=unassigned&q=Zack&page=2&packageId=p&studentId=s", "ok", "assigned", "new-report"), "https://example.test");
  assert.equal(result.searchParams.has("packageId"), false); assert.equal(result.searchParams.has("studentId"), false);
  assert.equal(result.searchParams.get("q"), "Zack"); assert.equal(result.searchParams.get("page"), "2");
  assert.equal(result.searchParams.get("assignedReportId"), "new-report"); assert.equal(result.hash, "#final-report-assignment-result");
});

test("exempting an unassigned candidate returns to its list instead of a removed candidate detail", () => {
  const candidate = "/admin/reports/final?view=unassigned&q=Zack&packageId=p&studentId=s";
  const result = new URL(finalDeskResultUrl(candidate, "ok", "exempt"), "https://example.test");
  assert.equal(result.searchParams.has("packageId"), false);
  assert.equal(result.searchParams.get("q"), "Zack");
  const detail = new URL(finalDeskResultUrl("/admin/reports/final?view=writing&reportId=r", "ok", "exempt"), "https://example.test");
  assert.equal(detail.searchParams.get("reportId"), "r");
});

test("hide handled teachers without hiding another teacher or another package for the student", () => {
  const base = { studentName: "Same student", courseName: "English", courseId: "c" };
  const done = { id: "t1", name: "First teacher", latestReportStatus: "ASSIGNED" }, pending = { id: "t2", name: "Other teacher", latestReportStatus: null };
  const rows = [ { ...base, packageId: "p1", teacherOptions: [done] }, { ...base, packageId: "p2", teacherOptions: [pending] }, { ...base, packageId: "p3", teacherOptions: [done,pending] } ];
  assert.deepEqual(filterFinalDeskCandidates(rows, parseFinalDeskParams({})).map(r => r.packageId), ["p2", "p3"]);
  assert.equal(filterFinalDeskCandidates(rows, parseFinalDeskParams({ showAssigned: "1" })).length, 3);
  assert.equal(filterFinalDeskCandidates(rows, parseFinalDeskParams({ teacherId: "t1" })).length, 0);
  assert.equal(filterFinalDeskCandidates(rows, parseFinalDeskParams({ q: "OTHER TEACHER", courseId: "c" })).length, 2);
});

test("report queues keep archived and delivered records out of pending work", () => {
  const p = parseFinalDeskParams({ q: "Zack", teacherId: "t", courseId: "c" });
  const writing = finalDeskReportWhere(p,"writing"), review = finalDeskReportWhere(p,"review");
  assert.equal(writing.status,"ASSIGNED"); assert.equal(writing.archivedAt,null); assert.equal(writing.deliveredAt,null);
  assert.deepEqual(review.status,{in:["SUBMITTED","FORWARDED"]}); assert.equal(review.archivedAt,null); assert.equal(review.deliveredAt,null);
  assert.equal(writing.teacherId,"t"); assert.equal(writing.courseId,"c"); assert.ok(writing.OR);
  assert.equal(finalDeskReportWhere({...p,status:"all"},"all").archivedAt,undefined);
  const shared = finalDeskReportWhere({...p,status:"shared"},"all",new Date("2026-11-05"));
  assert.ok(shared.OR); assert.ok(shared.AND); assert.equal(shared.shareRevokedAt,null);
});

test("20-row paging clamps empty, stale, negative and out-of-range pages", () => {
  assert.deepEqual(finalDeskPagination(0,8),{page:1,pages:1,skip:0,take:20});
  assert.deepEqual(finalDeskPagination(41,99),{page:3,pages:3,skip:40,take:20});
  assert.equal(finalDeskPagination(41,-1).page,1);
  assert.equal(parseFinalDeskParams({page:"not-a-number"}).page,1);
});
