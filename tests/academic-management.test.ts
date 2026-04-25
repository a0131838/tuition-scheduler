import test from "node:test";
import assert from "node:assert/strict";
import {
  academicStudentLaneLabel,
  academicLanePackageWarning,
  matchesAcademicStudentLane,
  normalizeAcademicStudentLane,
  packageAcademicStudentLane,
  studentAcademicStudentLane,
} from "../lib/academic-management";

test("classifies package settlement mode for academic management warnings", () => {
  assert.equal(packageAcademicStudentLane(null), "own");
  assert.equal(packageAcademicStudentLane(""), "own");
  assert.equal(packageAcademicStudentLane("ONLINE_PACKAGE_END"), "partner");
  assert.equal(packageAcademicStudentLane("OFFLINE_MONTHLY"), "partner");
});

test("normalizes and labels academic management lanes", () => {
  assert.equal(normalizeAcademicStudentLane("own"), "own");
  assert.equal(normalizeAcademicStudentLane("partner"), "partner");
  assert.equal(normalizeAcademicStudentLane("unclassified"), "unclassified");
  assert.equal(normalizeAcademicStudentLane("bad-value"), "all");
  assert.equal(academicStudentLaneLabel("partner"), "合作方学生");
});

test("matches academic management filters by student type only", () => {
  assert.equal(matchesAcademicStudentLane({ studentTypeName: "自己学生-新生" }, "own"), true);
  assert.equal(matchesAcademicStudentLane({ studentTypeName: "合作方学生" }, "partner"), true);
  assert.equal(matchesAcademicStudentLane({ studentTypeName: "" }, "unclassified"), true);
  assert.equal(matchesAcademicStudentLane({ studentTypeName: "自己学生-新生" }, "partner"), false);
  assert.equal(studentAcademicStudentLane({ studentTypeName: "合作方学生" }), "partner");
  assert.equal(studentAcademicStudentLane({ studentTypeName: "自己学生-新生" }), "own");
  assert.equal(studentAcademicStudentLane({ studentTypeName: "直客学生" }), "own");
  assert.equal(studentAcademicStudentLane({ studentTypeName: null }), "unclassified");
});

test("reports package settlement warnings without changing the student lane", () => {
  assert.equal(
    academicLanePackageWarning({ studentTypeName: "合作方学生", settlementModes: ["ONLINE_PACKAGE_END"] }),
    null
  );
  assert.equal(
    academicLanePackageWarning({ studentTypeName: "自己学生-新生", settlementModes: ["OFFLINE_MONTHLY"] }),
    "学生类型与课包结算模式不一致"
  );
  assert.equal(
    academicLanePackageWarning({ studentTypeName: null, settlementModes: ["OFFLINE_MONTHLY"] }),
    "学生类型缺失"
  );
});
