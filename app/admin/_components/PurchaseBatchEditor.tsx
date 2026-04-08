"use client";

export type PurchaseBatchDraft = {
  minutes: string;
  note: string;
};

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
          Total / 合计: <strong>{totalMinutes}</strong> mins
        </div>
      </div>

      {isXdfPartner ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => onChange([{ minutes: "360", note: "6h tranche / 6小时批次" }, { minutes: "1800", note: "30h tranche / 30小时批次" }])}
            style={{ minHeight: 34, padding: "0 12px", borderRadius: 999, border: "1px solid #93c5fd", background: "#fff", color: "#1d4ed8" }}
          >
            Use 6h + 30h / 套用 6小时 + 30小时
          </button>
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
              <span style={{ fontSize: 12, color: "#475569" }}>Minutes / 分钟</span>
              <input
                type="number"
                min={1}
                step={1}
                value={row.minutes}
                onChange={(e) => updateRow(index, { minutes: e.target.value })}
                style={{ minHeight: 38 }}
              />
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
