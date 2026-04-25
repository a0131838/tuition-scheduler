import test from "node:test";
import assert from "node:assert/strict";
import { buildParentFeedbackText } from "../lib/parent-feedback-format";
import { evaluateParentFeedbackQuality, isParentFeedbackQualityRisk } from "../lib/parent-feedback-quality";

test("scores concrete structured feedback as good", () => {
  const content = buildParentFeedbackText({
    lessonFocus: "今天主要训练议论文段落结构和主题句展开。",
    currentFinding: "孩子能理解题目，但论据和观点之间的连接还不稳定。",
    classPerformance: "课堂上独立改好了 5 个主题句中的 3 个，后半节能主动检查逻辑。",
    nextPlan: "接下来两周继续训练段落展开和连接词使用。",
    parentNote: "这是写作结构习惯问题，不是学习态度问题，家里不需要额外施压，只需要稳定完成小练习。",
  });

  const result = evaluateParentFeedbackQuality(content);
  assert.equal(result.status, "good");
  assert.equal(result.score, 100);
});

test("flags thin and generic parent feedback", () => {
  const result = evaluateParentFeedbackQuality("很好");

  assert.equal(isParentFeedbackQualityRisk("很好"), true);
  assert.equal(result.status, "risk");
  assert.ok(result.issueLabels.includes("课堂表现缺少可观察证据"));
  assert.ok(result.issueLabels.includes("下一步计划缺少时间范围"));
});
