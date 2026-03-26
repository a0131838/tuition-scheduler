import assert from "node:assert/strict";
import test from "node:test";
import { overlapsMinutes } from "../lib/availability-conflict";

test("availability overlap detects true overlaps", () => {
  assert.equal(overlapsMinutes(540, 720, 600, 780), true);
  assert.equal(overlapsMinutes(540, 720, 540, 720), true);
});

test("availability overlap ignores adjacent ranges", () => {
  assert.equal(overlapsMinutes(540, 720, 720, 780), false);
  assert.equal(overlapsMinutes(720, 780, 540, 720), false);
});
