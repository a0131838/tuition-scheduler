import { HrLeaveType } from "@prisma/client";
import { hrLeaveTypeLabel } from "@/lib/hr-leave";
import { leaveDays, type LeaveSummaryRow } from "@/lib/hr-leave-summary";
import { t, type Lang } from "@/lib/i18n";

export default function HrLeaveSummaryCards({ summary, lang }: { summary: Map<HrLeaveType, LeaveSummaryRow>; lang: Lang }) {
  const labels: [keyof LeaveSummaryRow, string, string][] = [
    ["openingMinutes", "Starting balance (1 Jan)", "期初余额（1月1日）"],
    ["grantedMinutes", "Credited this year", "本年已入账额度"],
    ["adjustedMinutes", "Manual adjustment", "人工调整净额"],
    ["expiredMinutes", "Expired this year", "本年到期净额"],
    ["utilisedMinutes", "Taken (approved, ended)", "已休（已批准且结束）"],
    ["ongoingApprovedMinutes", "Approved, in progress", "已批准进行中"],
    ["futureApprovedMinutes", "Approved, upcoming", "已批准未开始"],
    ["pendingMinutes", "Pending approval", "待审批"],
  ];
  return <>
    <p style={{ color: "#475569", fontSize: 13, marginTop: 0 }}>{t(lang,
      "All figures use 8 hours per accounting day. Approved leave is already deducted from the available balance; pending leave is not. Starting balance is the recorded ledger balance at 1 January.",
      "所有数字按每个记账日8小时换算。已批准假期已从可用余额扣除；待审批尚未扣除。期初余额为1月1日的流水账面余额。")}</p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 12 }}>
      {Object.values(HrLeaveType).map(type => {
        const row = summary.get(type);
        if (!row) return null;
        return <div key={type} style={{ border: "1px solid #dbe4f0", borderRadius: 8, padding: 14, background: "#fff" }}>
          <b>{hrLeaveTypeLabel(type, lang)}</b>
          <div style={{ margin: "8px 0 10px", color: "#1d4ed8", fontSize: 26, fontWeight: 900 }}>
            {row.tracksBalance ? `${leaveDays(row.remainingMinutes)} ${t(lang,"days available","天可用")}` : t(lang,"No balance tracking","不按余额扣减")}
          </div>
          <dl style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "6px 10px", margin: 0, fontSize: 13 }}>
            {labels.filter(([key]) => row.tracksBalance || !["openingMinutes", "grantedMinutes", "adjustedMinutes", "expiredMinutes"].includes(key)).map(([key, en, zh]) => <div key={key} style={{ display: "contents" }}><dt>{t(lang,en,zh)}</dt><dd style={{ margin: 0, fontWeight: 700 }}>{leaveDays(row[key] as number | null)}</dd></div>)}
            {row.tracksBalance && <><dt style={{ borderTop: "1px solid #e2e8f0", paddingTop: 7 }}>{t(lang,"If all pending approved","若待审批全部批准")}</dt><dd style={{ margin: 0, borderTop: "1px solid #e2e8f0", paddingTop: 7, fontWeight: 800, color: (row.afterPendingMinutes ?? 0) < 0 ? "#b91c1c" : "#166534" }}>{leaveDays(row.afterPendingMinutes)}</dd></>}
          </dl>
          {row.ledgerMismatch && <p style={{ color: "#b45309", fontSize: 12, marginBottom: 0 }}>{t(lang,"Approved requests and ledger differ; ask HR to reconcile.","已批准申请与余额流水不一致，请联系 HR 核对。")}</p>}
        </div>;
      })}
    </div>
  </>;
}
