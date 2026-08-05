import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("care project and operations require an explicit status choice", () => {
  const overview = read("app/admin/care/[id]/page.tsx");
  const operations = read("app/admin/care/[id]/operations/page.tsx");

  assert.match(overview, /name="nextStatus" defaultValue="" required/);
  assert.match(overview, /Select a status change/);
  assert.doesNotMatch(overview, /defaultValue=\{nextStatuses\(engagement\.status\)\[0\]\}/);
  assert.equal((operations.match(/name="nextStatus" defaultValue="" required/g) ?? []).length, 2);
  assert.match(operations, /Choose next status/);
});

test("legacy review only supports non-draft projects and preserves exact new-contract activation", () => {
  const overview = read("app/admin/care/[id]/page.tsx");
  const management = read("lib/care-management.ts");

  assert.match(overview, /LEGACY_FULL_CARE_CONTRACT_REVIEWED/);
  assert.match(overview, /engagement\.status !== "DRAFT"/);
  assert.match(overview, /Legacy Full Care agreement reviewed/);
  assert.match(management, /info\.careEngagementId === engagement\.id && info\.careProgramType === engagement\.programType/);
  assert.doesNotMatch(management, /LEGACY_FULL_CARE_CONTRACT_REVIEWED/);
});

test("signed parent receipt contains entitlement, next steps and a prominent PDF action", () => {
  const page = read("app/contract/[token]/page.tsx");

  assert.match(page, /Your confirmed plan \/ 您已确认的方案/);
  assert.match(page, /Lesson entitlement \/ 课时权益/);
  assert.match(page, /One-time total \/ 一次性付款总额/);
  assert.match(page, /What happens next \/ 接下来会发生什么/);
  assert.match(page, /Download signed PDF \/ 下载已签合同/);
});

test("public contract tokens expire and signed links receive a short post-sign window", () => {
  const contract = read("lib/student-contract.ts");
  const pdfRoute = read("app/api/exports/student-contract/[id]/route.ts");

  assert.match(contract, /signExpiresAt: addDays\(signedAt, 7\)/);
  assert.match(contract, /row\.signExpiresAt\.getTime\(\) < Date\.now\(\)/);
  assert.match(pdfRoute, /intakeTokenAllowed/);
  assert.match(pdfRoute, /signTokenAllowed/);
  assert.match(pdfRoute, /signExpiresAt\.getTime\(\) >= now/);
});

test("quality desk supports search, queue and urgency filters", () => {
  const quality = read("app/admin/care/quality/page.tsx");

  assert.match(quality, /Search student or item/);
  assert.match(quality, /name="queue"/);
  assert.match(quality, /name="urgency"/);
  assert.match(quality, /urgency !== "OVERDUE" \|\| item\.tone === "risk"/);
  assert.match(quality, /Launch configuration incomplete/);
  assert.match(quality, /Renewal follow-up/);
});

test("Full Care signing requires service boundaries and compliance evidence", () => {
  const workspace = read("app/admin/packages/[id]/contract/page.tsx");
  const contract = read("lib/student-contract.ts");

  assert.match(workspace, /name="careServiceHours" required/);
  assert.match(workspace, /name="careRoutineResponseTarget" required/);
  assert.match(workspace, /name="careIncludedOnsiteSupport" required/);
  assert.match(workspace, /name="careRefundRule" required/);
  assert.match(workspace, /name="careComplianceApprovalReference" required/);
  assert.match(contract, /StudentContractMode\.FULL_CARE_AGREEMENT/);
  assert.match(contract, /legal\/tax\/PDPA approval reference/);
});
