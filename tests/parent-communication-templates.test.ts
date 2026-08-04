import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  communicationTemplateVariables,
  DEFAULT_PARENT_COMMUNICATION_TEMPLATES,
  renderCommunicationTemplate,
} from "../lib/parent-communication-templates";

test("controlled parent message catalog covers 18 unique business scenarios", () => {
  assert.equal(DEFAULT_PARENT_COMMUNICATION_TEMPLATES.length, 18);
  assert.equal(new Set(DEFAULT_PARENT_COMMUNICATION_TEMPLATES.map((row) => row.code)).size, 18);
  assert.ok(DEFAULT_PARENT_COMMUNICATION_TEMPLATES.some((row) => row.code === "MONTHLY_INITIAL"));
  assert.ok(DEFAULT_PARENT_COMMUNICATION_TEMPLATES.some((row) => row.code === "CONTRACT_SIGNING"));
  assert.ok(DEFAULT_PARENT_COMMUNICATION_TEMPLATES.some((row) => row.code === "FINANCE_PAYMENT"));
});

test("template rendering requires every declared variable and leaves no placeholders", () => {
  const content = "{{parentName}}您好，{{studentName}}的课程由{{teacherName}}负责。";
  assert.deepEqual(communicationTemplateVariables(content).map((row) => row.key), ["parentName", "studentName", "teacherName"]);
  assert.equal(renderCommunicationTemplate(content, { parentName: "王女士", studentName: "小明", teacherName: "Jasmine" }), "王女士您好，小明的课程由Jasmine负责。");
  assert.throws(() => renderCommunicationTemplate(content, { parentName: "王女士", studentName: "小明" }), /老师/);
});

test("teacher preference and template migration is additive only", () => {
  const sql = fs.readFileSync(path.join(process.cwd(), "prisma/migrations/20260804213000_add_teacher_preferences_and_communication_templates/migration.sql"), "utf8");
  assert.match(sql, /ADD COLUMN "preferredTeacherId"/);
  assert.match(sql, /CREATE TABLE "ParentCommunicationTemplate"/);
  assert.doesNotMatch(sql, /\bDROP\s+(?:TABLE|COLUMN)\b/i);
  assert.doesNotMatch(sql, /\bDELETE\s+FROM\b/i);
});
