import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { issueAiMiniappDelegation } from "../lib/ai-miniapp-delegation";

test("web SSO route reuses the formal session and never accepts or forwards a password", () => {
  const source = readFileSync(new URL("../app/api/admin/ai-os/sso/route.ts", import.meta.url), "utf8");
  assert.match(source, /getCurrentUser\(\)/);
  assert.match(source, /issueAiMiniappDelegation/);
  assert.match(source, /const AI_ORIGIN = "https:\/\/gtaisg\.com"/);
  assert.match(source, /new URL\("\/auth\/sso", AI_ORIGIN\)/);
  assert.doesNotMatch(source, /passwordHash|passwordSalt|verifyPassword|body\.password/);
});

test("web SSO next path rejects cross-origin redirects", () => {
  const source = readFileSync(new URL("../app/api/admin/ai-os/sso/route.ts", import.meta.url), "utf8");
  assert.match(source, /!value\.startsWith\("\/"\) \|\| value\.startsWith\("\/\/"\)/);
});

test("AI role override remains allowlisted and signed", () => {
  const token = issueAiMiniappDelegation(
    { id: "U-3", name: "Emily", role: "CS", aiRole: "CUSTOMER_SERVICE" },
    "test-ai-miniapp-shared-secret-32-characters",
    Date.parse("2026-08-13T00:00:00Z"),
    60,
  );
  const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  assert.deepEqual({ sub: claims.sub, role: claims.role, ttl: claims.exp - claims.iat }, { sub: "U-3", role: "CUSTOMER_SERVICE", ttl: 60 });
});
