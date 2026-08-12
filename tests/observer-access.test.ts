import assert from "node:assert/strict";
import test from "node:test";
import { issueAiMiniappDelegation } from "../lib/ai-miniapp-delegation";
import { observerSessionToken, validObserverSessionToken } from "../lib/observer-mode";

const secret = "observer-test-secret-that-is-long-enough";

test("observer web session token is signed and tamper resistant", async () => {
  process.env.OBSERVER_MODE_SECRET = secret;
  const token = await observerSessionToken("session-base-token");
  assert.equal(await validObserverSessionToken(token), true);
  assert.equal(await validObserverSessionToken(token.replace("session-base-token", "different-token")), false);
  assert.equal(await validObserverSessionToken("session-base-token"), false);
});

test("observer AI delegation is always VIEWER even when primary role is ADMIN", () => {
  const token = issueAiMiniappDelegation(
    { id: "observer-1", name: "Wang Jie", role: "ADMIN", isObserver: true },
    "test-ai-miniapp-shared-secret-32-characters",
    Date.parse("2026-08-12T00:00:00Z"),
  );
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  assert.equal(payload.role, "VIEWER");
  assert.equal(payload.sub, "observer-1");
});
