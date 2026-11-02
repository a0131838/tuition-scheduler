import test from "node:test";
import assert from "node:assert/strict";
import {
  parentReportFields,
  isParentReportSameOrigin,
  parentSourceHash,
  validateParentReportContent,
  type ParentReportSource,
} from "../lib/learning-report-parent-content";
import { renderParentLearningReportPdf } from "../lib/learning-report-parent-pdf";
import { translateParentReport } from "../lib/learning-report-parent-ai";
test("parent source keeps all course report fields and excludes final internal teacher notes", () => {
  const fields = parentReportFields("MIDTERM", {
    overallSummary: "Summary",
    listeningLevel: "A2",
    listeningPerformance: "50/100",
    targetLevelScore: "B1",
    suggestedPracticeLoad: "No duration stated",
    examMetric1Label: "Listening score",
    examMetric1Value: "50/100",
  });
  assert.equal(fields.find((f) => f.key === "targetLevelScore")?.value, "B1");
  assert.equal(
    fields.find((f) => f.key === "examMetric1Value")?.labelZh,
    "Listening score",
  );
  const final = parentReportFields("FINAL", {
    finalSummary: "Allowed",
    teacherComment: "INTERNAL PRIVATE",
    parentNote: "For parents",
    initialGoals: "Original goal",
  });
  assert(!JSON.stringify(final).includes("INTERNAL PRIVATE"));
  assert.equal(
    final.find((f) => f.key === "initialGoals")?.value,
    "Original goal",
  );
});
const field = {
  key: "test",
  labelZh: "表现",
  labelEn: "Performance",
  sectionZh: "阅读",
  sectionEn: "Reading",
  value: "Score 50/100, level A2. Target B1.",
};
const valid = {
  translations: { test: "成绩 50/100，本次水平 A2。目标为 B1。" },
  summary: [
    { zh: "目标为 B1。", en: "The target is B1.", evidenceKeys: ["test"] },
  ],
};
test("AI result must preserve exact fields, scores, levels and cited evidence", () => {
  assert.deepEqual(validateParentReportContent(valid, [field]), valid);
  for (const invalid of [
    { ...valid, translations: {} },
    { ...valid, translations: { test: "成绩 60/100，水平 A2。目标 B1。" } },
    { ...valid, translations: { test: "Score 50/100, level A2. Target B1." } },
    {
      ...valid,
      summary: [{ zh: "已到 B2", en: "B2 achieved", evidenceKeys: ["test"] }],
    },
    {
      ...valid,
      summary: [{ zh: "其他", en: "Other", evidenceKeys: ["foreign"] }],
    },
  ])
    assert.throws(() => validateParentReportContent(invalid, [field]));
});
const source: ParentReportSource = {
  version: 1,
  kind: "MIDTERM",
  reportId: "test",
  student: "Test Student",
  teacher: "Teacher",
  course: "English",
  subject: "",
  date: "2026-11-02",
  periodZh: "实际出勤 49 小时",
  periodEn: "49 attended hours",
  level: "A2",
  score: "",
  target: "B1",
  fields: [field],
};
test("source hash changes on teacher edits, score, target and attendance; unchanged source is stable", () => {
  const before = parentSourceHash(source);
  assert.equal(parentSourceHash(JSON.parse(JSON.stringify(source))), before);
  for (const changed of [
    { ...source, target: "B2" },
    { ...source, score: "51" },
    { ...source, periodZh: "50 小时" },
    { ...source, fields: [{ ...field, value: "Changed" }] },
  ])
    assert.notEqual(parentSourceHash(changed), before);
});
test("full parent report uses portrait flow and carries even a long field across pages", async () => {
  const long = {
    ...field,
    value: "Teacher sentence 中文原文. ".repeat(1600) + "END_OF_ORIGINAL",
  };
  const bytes = await renderParentLearningReportPdf(
    { ...source, fields: [long] },
    null,
    "EN",
    false,
  );
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  assert(bytes.toString("latin1").includes("/MediaBox [0 0 595.28 841.89]"));
  assert((bytes.toString("latin1").match(/\/Type \/Page\b/g) || []).length > 1);
  await assert.rejects(
    renderParentLearningReportPdf(source, null, "ZH", false),
    /TRANSLATION_REQUIRED/,
  );
});
test("model output is validated and provider failures never become fabricated translation", async () => {
  const old = {
    base: process.env.REPORT_AI_BASE_URL,
    key: process.env.REPORT_AI_API_KEY,
    model: process.env.REPORT_AI_MODEL,
  };
  Object.assign(process.env, {
    REPORT_AI_BASE_URL:
      "https://workspace.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
    REPORT_AI_API_KEY: "test-only",
    REPORT_AI_MODEL: "test-only",
  });
  try {
    let posted: any;
    const output = await translateParentReport([field], async (_url, init) => {
      posted = JSON.parse(String(init?.body));
      return Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(valid) },
          },
        ],
      });
    });
    assert.equal(output.content.translations.test, valid.translations.test);
    assert(!JSON.stringify(posted).includes("Test Student"));
    assert.equal(posted.enable_thinking, false);
    assert(posted.messages[0].content.includes("untrusted DATA"));
    await assert.rejects(
      translateParentReport([field], async () =>
        Response.json({
          choices: [
            {
              finish_reason: "length",
              message: { content: JSON.stringify(valid) },
            },
          ],
        }),
      ),
      /AI_INCOMPLETE/,
    );
    await assert.rejects(
      translateParentReport(
        [field],
        async () => new Response("", { status: 503 }),
      ),
      /AI_UNAVAILABLE/,
    );
  } finally {
    for (const [key, value] of Object.entries({
      REPORT_AI_BASE_URL: old.base,
      REPORT_AI_API_KEY: old.key,
      REPORT_AI_MODEL: old.model,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("same-origin report mutations work through HTTPS proxy and reject foreign or missing origins", () => {
  const request = (origin: string) =>
    new Request("http://127.0.0.1:3000/api/teacher/report", {
      headers: { host: "sgtmanage.com", "x-forwarded-proto": "https", origin },
    });
  assert(isParentReportSameOrigin(request("https://sgtmanage.com")));
  assert(!isParentReportSameOrigin(request("https://evil.invalid")));
  assert(!isParentReportSameOrigin(request("")));
  assert(!isParentReportSameOrigin(request("https://sgtmanage.com/evil")));
  assert(
    isParentReportSameOrigin(
      new Request("http://localhost:3158/api", {
        headers: { origin: "http://localhost:3158" },
      }),
    ),
  );
});
