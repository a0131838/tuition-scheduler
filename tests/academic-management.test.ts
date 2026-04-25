import test from "node:test";
import assert from "node:assert/strict";
import {
  academicStudentLaneLabel,
  matchesAcademicStudentLane,
  normalizeAcademicStudentLane,
  packageAcademicStudentLane,
  studentAcademicStudentLane,
} from "../lib/academic-management";

test("classifies academic management lane by package settlement mode", () => {
  assert.equal(packageAcademicStudentLane(null), "own");
  assert.equal(packageAcademicStudentLane(""), "own");
  assert.equal(packageAcademicStudentLane("ONLINE_PACKAGE_END"), "partner");
  assert.equal(packageAcademicStudentLane("OFFLINE_MONTHLY"), "partner");
});

test("normalizes and labels academic management lanes", () => {
  assert.equal(normalizeAcademicStudentLane("own"), "own");
  assert.equal(normalizeAcademicStudentLane("partner"), "partner");
  assert.equal(normalizeAcademicStudentLane("bad-value"), "all");
  assert.equal(academicStudentLaneLabel("partner"), "合作方学生");
});

test("matches filters and falls back to student type/source when package mode is not present", () => {
  assert.equal(matchesAcademicStudentLane({ settlementMode: null }, "own"), true);
  assert.equal(matchesAcademicStudentLane({ settlementMode: "OFFLINE_MONTHLY" }, "partner"), true);
  assert.equal(matchesAcademicStudentLane({ settlementMode: null }, "partner"), false);
  assert.equal(studentAcademicStudentLane({ studentTypeName: "合作方学生" }), "partner");
  assert.equal(studentAcademicStudentLane({ studentTypeName: "自己学生-新生" }), "own");
  assert.equal(studentAcademicStudentLane({ sourceChannelName: "新东方学生" }), "partner");
});
