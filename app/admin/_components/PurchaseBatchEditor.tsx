"use client";

export type PurchaseBatchDraft = {
  minutes: string;
  note: string;
};

export const XDF_LESSON_MINUTES = 45;
export const XDF_LESSON_BATCH_PRESETS = [6, 8, 10, 20, 40] as const;

export function buildXdfLessonBatchDraft(lessons: number): PurchaseBatchDraft {
  const safeLessons = Math.max(1, Math.round(lessons));
  return {
    minutes: String(safeLessons * XDF_LESSON_MINUTES),
    note: `${safeLessons} lessons tranche / ${safeLessons}课时批次`,
  };
}

export function buildXdfBatchDraftsFromTotalMinutes(totalMinutes: number): PurchaseBatchDraft[] {
  const safeMinutes = Math.round(Number(totalMinutes ?? 0));
  if (!Number.isFinite(safeMinutes) || safeMinutes <= 0) {
    return [{ minutes: "", note: "" }];
  }
  const lessons = safeMinutes / XDF_LESSON_MINUTES;
  if (Number.isInteger(lessons) && lessons > 0) {
    return [buildXdfLessonBatchDraft(lessons)];
  }
  return [{ minutes: String(safeMinutes), note: "" }];
}

function formatXdfLessons(minutes: number) {
  const lessons = minutes / XDF_LESSON_MINUTES;
  if (!Number.isFinite(lessons) || lessons <= 0) return "0";
  return Number.isInteger(lessons) ? String(lessons) : lessons.toFixed(2).replace(/\.?0+$/, "");
}

export function sumPurchaseBatchDraftMinutes(rows: PurchaseBatchDraft[]) {
  return rows.reduce((sum, row) => {
    const minutes = Number(row.minutes ?? 0);
    return sum + (Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : 0);
  }, 0);
}

export default function PurchaseBatchEditor({
  rows,
  onChange,
  isXdfPartner,
  title = "Purchase batches / 购买批次",
}: {
  rows: PurchaseBatchDraft[];
  onChange: (rows: PurchaseBatchDraft[]) => void;
  isXdfPartner?: boolean;
  title?: string;
}) {
  const totalMinutes = sumPurchaseBatchDraftMinutes(rows);

  function updateRow(index: number, next: Partial<PurchaseBatchDraft>) {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...next } : row)));
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, rowIndex) => rowIndex !== index));
  }

  return (
    <div style={{ border: "1px solid #dbeafe", borderRadius: 12, padding: 12, background: "#eff6ff", display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 700, color: "#1d4ed8" }}>{title}</div>
          <div style={{ fontSize: 13, color: "#475569" }}>
            Record each logical purchase separately so partner settlement can settle them one by one. /
            把每次逻辑购买分别记录，合作方结算才能逐笔结算。
          </div>
        </div>
        <div style={{ fontSize: 13, color: "#1e3a8a" }}>
          {isXdfPartner ? (
            <>
              Total / 合计: <strong>{formatXdfLessons(totalMinutes)}</strong> lessons ·{" "}
              <strong>{totalMinutes}</strong> mins
            </>
          ) : (
            <>
              Total / 合计: <strong>{totalMinutes}</strong> mins
            </>
          )}
        </div>
      </div>

      {isXdfPartner ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 13, color: "#92400e" }}>
            New Oriental bundles use lessons first. 1 lesson = 45 minutes. / 新东方课包按课时记录，1课时 = 45分钟。
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {XDF_LESSON_BATCH_PRESETS.map((lessons) => (
              <button
                key={lessons}
                type="button"
                onClick={() => {
                  const nextRow = buildXdfLessonBatchDraft(lessons);
                  const hasOnlyBlankRow =
                    rows.length === 1 && !rows[0]?.minutes?.trim() && !rows[0]?.note?.trim();
                  onChange(hasOnlyBlankRow ? [nextRow] : [...rows, nextRow]);
                }}
                style={{ minHeight: 34, padding: "0 12px", borderRadius: 999, border: "1px solid #93c5fd", background: "#fff", color: "#1d4ed8" }}
              >
                Add {lessons} lessons / 加 {lessons}课时
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((row, index) => (
          <div
            key={index}
            style={{
              display: "grid",
              gap: 8,
              gridTemplateColumns: "minmax(120px, 160px) minmax(0, 1fr) auto",
              alignItems: "center",
            }}
          >
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12, color: "#475569" }}>
                {isXdfPartner ? "Lessons / 课时" : "Minutes / 分钟"}
              </span>
              {isXdfPartner ? (
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={row.minutes ? formatXdfLessons(Number(row.minutes)) : ""}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    if (!nextValue) {
                      updateRow(index, { minutes: "" });
                      return;
                    }
                    const lessons = Number(nextValue);
                    updateRow(index, {
                      minutes:
                        Number.isFinite(lessons) && lessons > 0
                          ? String(Math.round(lessons * XDF_LESSON_MINUTES))
                          : "",
                    });
                  }}
                  style={{ minHeight: 38 }}
                />
              ) : (
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={row.minutes}
                  onChange={(e) => updateRow(index, { minutes: e.target.value })}
                  style={{ minHeight: 38 }}
                />
              )}
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12, color: "#475569" }}>Batch note / 批次备注</span>
              <input
                type="text"
                value={row.note}
                onChange={(e) => updateRow(index, { note: e.target.value })}
                placeholder="Optional / 可选"
                style={{ minHeight: 38 }}
              />
            </label>
            <button
              type="button"
              onClick={() => removeRow(index)}
              disabled={rows.length <= 1}
              style={{ minHeight: 38, padding: "0 12px", borderRadius: 10, border: "1px solid #fecaca", background: "#fff", color: "#b91c1c" }}
            >
              Remove / 删除
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => onChange([...rows, { minutes: "", note: "" }])}
          style={{ minHeight: 34, padding: "0 12px", borderRadius: 999, border: "1px solid #cbd5e1", background: "#fff" }}
        >
          Add batch / 新增批次
        </button>
      </div>
    </div>
  );
}
