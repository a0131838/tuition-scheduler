import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNextPath,
  isProtectedPath,
  isPublicAuthPath,
  sanitizeNextPath,
} from "../lib/route-guards";

test("protected path detection", () => {
  assert.equal(isProtectedPath("/admin"), true);
  assert.equal(isProtectedPath("/admin/classes"), true);
  assert.equal(isProtectedPath("/teacher/sessions"), true);
  assert.equal(isProtectedPath("/"), false);
  assert.equal(isProtectedPath("/api/courses"), false);
});

test("public auth path whitelist", () => {
  assert.equal(isPublicAuthPath("/admin/login"), true);
  assert.equal(isPublicAuthPath("/admin/setup"), true);
  assert.equal(isPublicAuthPath("/admin/logout"), true);
  assert.equal(isPublicAuthPath("/admin/students"), false);
  assert.equal(isPublicAuthPath("/teacher"), false);
});

test("build next path keeps query string", () => {
  assert.equal(buildNextPath("/teacher/sessions", ""), "/teacher/sessions");
  assert.equal(
    buildNextPath("/admin/students", "?page=2&name=lee"),
    "/admin/students?page=2&name=lee"
  );
});

test("sanitize next path blocks open redirect and login loop", () => {
  assert.equal(sanitizeNextPath("/teacher/sessions"), "/teacher/sessions");
  assert.equal(sanitizeNextPath("/admin/reports/monthly-schedule?month=2026-02"), "/admin/reports/monthly-schedule?month=2026-02");
  assert.equal(sanitizeNextPath("https://evil.example"), "");
  assert.equal(sanitizeNextPath("//evil.example"), "");
  assert.equal(sanitizeNextPath("/admin/login"), "");
  assert.equal(sanitizeNextPath(""), "");
});
