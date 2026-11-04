import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseRenewalSnapshot, parseRenewalReportDraft, renewalParentFields, validateRenewalReportDraft } from "../lib/renewal-progress-report";
import { parentSourceHash, type ParentReportSource } from "../lib/learning-report-parent-content";

test("renewal report requires evidence and next steps, and only exposes the six parent fields", () => {
  const draft = { progress: "Learned to explain a main idea clearly.", strengths: "Uses evidence more consistently.", evidence: "In the last essay, cited two examples.", challenges: "Needs to organise longer answers.", nextSteps: "Practise outlining before writing.", familyNote: "Please encourage regular reading.", internalNote: "PRIVATE" };
  assert.equal(validateRenewalReportDraft(draft).progress, draft.progress);
  assert.equal(renewalParentFields(draft).length, 6);
  assert(!JSON.stringify(renewalParentFields(draft)).includes("PRIVATE"));
  assert.throws(() => validateRenewalReportDraft({ ...draft, nextSteps: "" }), /REPORT_FIELDS_REQUIRED/);
  assert.throws(() => validateRenewalReportDraft({ ...draft, evidence: "" }), /REPORT_FIELDS_REQUIRED/);
  assert.equal(parseRenewalReportDraft(null).progress, "");
});

test("renewal source hash is stable across later package top-ups because it uses the assignment snapshot", () => {
  const assignment = parseRenewalSnapshot({ studentName: "Student", teacherName: "Teacher", courseName: "English", packageType: "HOURS", totalMinutes: 8400, remainingMinutes: 480, attendedMinutes: 7560, sessionCount: 42, capturedAt: "2026-11-04T04:00:00.000Z" });
  const source: ParentReportSource = { version: 1, kind: "RENEWAL", reportId: "report-1", student: "Student", teacher: "Teacher", course: "English", subject: "", date: "2026-11-04", periodZh: "42 节", periodEn: "42 sessions", level: "", score: "", target: "", fields: [{ key: "packageSnapshot", labelZh: "课包", labelEn: "Package", sectionZh: "范围", sectionEn: "Scope", value: `${assignment.totalMinutes}/${assignment.remainingMinutes}` }, ...renewalParentFields({ progress: "Learned to write an argument." })] };
  const before = parentSourceHash(source);
  const currentPackage = { totalMinutes: 11400, remainingMinutes: 3480 };
  assert.equal(currentPackage.remainingMinutes - assignment.remainingMinutes, 3000);
  assert.equal(assignment.courseName, "English");
  assert.equal(parentSourceHash(source), before);
  assert.notEqual(parentSourceHash({ ...source, fields: source.fields.map(field => field.key === "progress" ? { ...field, value: "Teacher corrected the report." } : field) }), before);
});

test("schema and PDF route enforce one report per task and coordinator approval before family PDF", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const route = readFileSync("app/api/teacher/learning-reports/[kind]/[id]/parent-edition/pdf/route.ts", "utf8");
  const actions = readFileSync("app/admin/reports/renewal/actions.ts", "utf8");
  assert.match(schema, /renewalTaskId\s+String\s+@unique/);
  assert.match(route, /kind === "RENEWAL" && !preview && !\["APPROVED", "DELIVERED"\]/);
  assert.match(actions, /edition\.status !== "READY" \|\| !edition\.reviewedAt \|\| !edition\.pdfBilingual/);
});
