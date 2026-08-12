import test from "node:test";
import assert from "node:assert/strict";
import { campusDeliveryMode } from "../lib/teacher-delivery-mode";

test("delivery mode distinguishes online, campus and home visit", () => {
  assert.equal(campusDeliveryMode({ name: "ClassIn", isOnline: true }), "ONLINE");
  assert.equal(campusDeliveryMode({ name: "Orchard Plaza", isOnline: false }), "CAMPUS");
  assert.equal(campusDeliveryMode({ name: "Home Visit · East", isOnline: false }), "HOME");
  assert.equal(campusDeliveryMode({ name: "学生家上门", isOnline: false }), "HOME");
});
