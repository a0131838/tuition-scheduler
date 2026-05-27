import assert from "node:assert/strict";
import test from "node:test";
import { summarizeManagerReflectionHistory } from "../lib/manager-reflection-summary";

type ManagerReflectionChecklistKey =
  | "receiptsInvoicesClaimsChecked"
  | "feedbackQualityChecked"
  | "midtermReportsChecked"
  | "finalReportsChecked";

const MANAGER_REFLECTION_CHECKLIST: Array<{ key: ManagerReflectionChecklistKey; en: string; zh: string }> = [
  { key: "receiptsInvoicesClaimsChecked", en: "Outstanding receipts / invoices / claims approval checked", zh: "" },
  { key: "feedbackQualityChecked", en: "Teacher feedback quality checked", zh: "" },
  { key: "midtermReportsChecked", en: "Mid-term report follow-up checked", zh: "" },
  { key: "finalReportsChecked", en: "End-term report follow-up checked", zh: "" },
];

type ManagerReflectionEntry = {
  id: string;
  date: string;
  managerEmail: string;
  checklist: Record<ManagerReflectionChecklistKey, boolean>;
  wentWell: string;
  didNotGoWell: string;
  couldBeBetter: string;
  followUpActions: string;
  createdAt: string;
  updatedAt: string;
};

function entry(date: string, checklist: ManagerReflectionEntry["checklist"]): ManagerReflectionEntry {
  return {
    id: date,
    date,
    managerEmail: "manager@example.com",
    checklist,
    wentWell: "",
    didNotGoWell: "",
    couldBeBetter: "",
    followUpActions: "",
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  };
}

test("summarize manager reflection history calculates log and checklist completion rates", () => {
  const summary = summarizeManagerReflectionHistory<ManagerReflectionChecklistKey>(
    [
      entry("2026-05-01", {
        receiptsInvoicesClaimsChecked: true,
        feedbackQualityChecked: true,
        midtermReportsChecked: true,
        finalReportsChecked: true,
      }),
      entry("2026-05-02", {
        receiptsInvoicesClaimsChecked: true,
        feedbackQualityChecked: false,
        midtermReportsChecked: true,
        finalReportsChecked: false,
      }),
    ],
    MANAGER_REFLECTION_CHECKLIST,
  );

  assert.equal(summary.logDays, 2);
  assert.equal(summary.completedLogDays, 1);
  assert.equal(summary.completionRate, 50);
  assert.equal(summary.checklistItemsDone, 6);
  assert.equal(summary.checklistItemsTotal, 8);
  assert.equal(summary.checklistCompletionRate, 75);
  assert.deepEqual(
    summary.itemStats.map((item) => [item.key, item.done, item.total, item.rate]),
    [
      ["receiptsInvoicesClaimsChecked", 2, 2, 100],
      ["feedbackQualityChecked", 1, 2, 50],
      ["midtermReportsChecked", 2, 2, 100],
      ["finalReportsChecked", 1, 2, 50],
    ],
  );
});

test("summarize manager reflection history handles empty history", () => {
  const summary = summarizeManagerReflectionHistory([], MANAGER_REFLECTION_CHECKLIST);
  assert.equal(summary.logDays, 0);
  assert.equal(summary.completionRate, 0);
  assert.equal(summary.checklistCompletionRate, 0);
  assert.equal(summary.itemStats.every((item) => item.rate === 0), true);
});
