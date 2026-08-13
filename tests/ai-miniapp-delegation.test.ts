import test from "node:test";
import assert from "node:assert/strict";
import { issueAiMiniappDelegation } from "../lib/ai-miniapp-delegation";

test("formal miniapp delegates a short-lived role without sharing staff passwords", () => {
  const token = issueAiMiniappDelegation({ id: "U-1", name: "Eva", role: "ADMIN" }, "test-ai-miniapp-shared-secret-32-characters", Date.parse("2026-08-11T00:00:00Z"));
  const [, encoded] = token.split(".");
  const claims = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  assert.equal(claims.sub, "U-1");
  assert.equal(claims.role, "OWNER");
  assert.equal(claims.exp - claims.iat, 300);
  assert.equal(token.split(".").length, 3);
});

test("formal delegation accepts a server-derived AI role and short web SSO lifetime", () => {
  const token = issueAiMiniappDelegation(
    { id: "U-2", name: "Jasmine", role: "ADMIN", aiRole: "MANAGER" },
    "test-ai-miniapp-shared-secret-32-characters",
    Date.parse("2026-08-13T00:00:00Z"),
    60,
  );
  const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  assert.equal(claims.role, "MANAGER");
  assert.equal(claims.exp - claims.iat, 60);
});
