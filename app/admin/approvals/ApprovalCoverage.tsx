import { t, type Lang } from "@/lib/i18n";
import type { ApprovalInboxData, ApprovalInboxType } from "@/lib/approval-inbox";

// Keep this guide aligned with getApprovalInboxData; it describes visibility,
// not authority to approve. Source workflows still enforce their own permissions.
export default function ApprovalCoverage({ lang, visibility }: {
  lang: Lang;
  visibility: ApprovalInboxData["visibility"];
}) {
  const sources: Record<ApprovalInboxType, { title: string; detail: string; visible: boolean }> = {
    PACKAGE_INVOICE: {
      title: t(lang, "Package invoices", "课包发票"),
      detail: t(lang, "Submitted invoices awaiting manager approval before scheduling.", "已提交、等待管理审批以放行排课的发票。"),
      visible: visibility.manager,
    },
    PARENT_RECEIPT: {
      title: t(lang, "Parent receipts", "家长收据"),
      detail: t(lang, "Created receipts awaiting finance approval; rejected receipts are reviewed in the receipt workflow.", "已创建、等待财务审批的收据；已驳回收据回收据流程处理。"),
      visible: visibility.finance,
    },
    PARTNER_RECEIPT: {
      title: t(lang, "Partner receipts", "合作方收据"),
      detail: t(lang, "Created receipts awaiting finance approval. Partner settlement approval is a separate workflow.", "已创建、等待财务审批的收据。合作方结算审批属于独立流程。"),
      visible: visibility.finance,
    },
    TEACHER_PAYROLL: {
      title: t(lang, "Teacher payroll", "老师工资"),
      detail: t(lang, "Confirmed payroll awaiting manager approval, finance confirmation or a payout record. Unconfirmed drafts are excluded.", "已确认工资中待管理审批、财务确认或登记付款的项目；未确认草稿不纳入。"),
      visible: visibility.manager || visibility.finance,
    },
    EXPENSE_CLAIM: {
      title: t(lang, "Expense claims", "报销单"),
      detail: t(lang, "Submitted claims awaiting approval. Drafts and completed claims are excluded.", "已提交、等待审批的报销单；草稿及已完成项目不纳入。"),
      visible: visibility.expense,
    },
  };

  return <details style={{ border: "1px solid #dbe4f0", borderRadius: 12, padding: "12px 16px", background: "#fff" }}>
    <summary style={{ cursor: "pointer", fontWeight: 700 }}>
      {t(lang, "Coverage and visibility — what is included?", "覆盖范围与可见权限：这里包含哪些事项？")}
    </summary>
    <p style={{ color: "#475569", lineHeight: 1.6 }}>
      {t(lang, "This inbox covers the five categories below. Each queue follows its existing role rules; being able to see an item does not grant permission to approve it.", "本中心接入以下五类事项，各队列沿用既有角色规则；能看到事项不代表可以执行审批。")}
    </p>
    <ul style={{ display: "grid", gap: 12, paddingLeft: 22, lineHeight: 1.6 }}>
      {Object.entries(sources).map(([type, source]) => <li key={type}>
        <strong>{source.title}</strong>
        {" · "}{source.visible
          ? t(lang, "Within your visible queues", "属于你的可见队列")
          : t(lang, "Outside your visible queues", "不属于你的可见队列")}
        <div style={{ color: "#475569" }}>{source.detail}</div>
      </li>)}
    </ul>
    <p style={{ color: "#475569", lineHeight: 1.6, marginBottom: 0 }}>
      {t(lang, "HR leave, employee payroll, partner settlement approval and other business workflows remain on their own pages and are not counted here. Review rejected receipts in the receipt workflow; do not treat their absence from this inbox as approval.", "人事请假、员工工资、合作方结算审批及其他业务流程仍在各自页面处理，不计入本中心数量。已驳回收据请回收据流程查看，不能因本中心未显示就视为通过。")}
    </p>
  </details>;
}
