export const CANCELLATION_REQUESTERS = ["PARENT", "TEACHER", "SCHOOL"] as const;
export type CancellationRequester = typeof CANCELLATION_REQUESTERS[number];

export function cancellationRequesterLabel(value: string | null | undefined, lang = "BILINGUAL") {
  const labels: Record<string, [string, string]> = {
    PARENT: ["Parent / student", "家长／学生"], TEACHER: ["Teacher", "老师"],
    SCHOOL: ["School / management", "校方／管理"],
  };
  const [en, zh] = labels[value || ""] || ["Historical reason unclassified", "历史记录未分类"];
  return lang === "EN" ? en : lang === "ZH" ? zh : `${en} / ${zh}`;
}

/** Counts are advisory. Only an explicit parent request may carry a cancellation deduction. */
export function resolveLessonCancellation(input: { requestedBy?: unknown; note?: unknown; charge?: unknown }) {
  const requestedBy = String(input.requestedBy ?? "").trim();
  if (!(CANCELLATION_REQUESTERS as readonly string[]).includes(requestedBy)) {
    throw new Error("Select who requested cancellation. Update the mini program if this field is missing / 请选择取消发起方；小程序缺少此项时请更新版本");
  }
  const note = String(input.note ?? "").trim();
  if (!note || note.length > 500) throw new Error("Enter a cancellation reason (1–500 characters) / 请填写取消原因（1–500字）");
  if(input.charge !== undefined && typeof input.charge !== "boolean") throw new Error("Invalid deduction choice / 扣课选择无效");
  const charge = input.charge === true;
  if (requestedBy !== "PARENT" && charge) throw new Error("Teacher and school cancellations cannot deduct student hours / 老师及校方取消固定免扣学生课时");
  return { requestedBy: requestedBy as CancellationRequester, note, charge };
}

export function resolveCancellationDeduction(mode: "HOURS_MINUTES" | "GROUP_MINUTES" | "GROUP_COUNT" | "MONTHLY", durationMin: number) {
  if (mode === "MONTHLY") return { units: 0, deductedMinutes: 0, deductedCount: 0 };
  if (mode === "GROUP_COUNT") return { units: 1, deductedMinutes: 0, deductedCount: 1 };
  const minutes = Math.max(1, Math.round(durationMin));
  return { units: minutes, deductedMinutes: minutes, deductedCount: 0 };
}
