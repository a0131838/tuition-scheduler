import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import Link from "next/link";

const SOP_BLOCKS = [
  {
    titleZh: "最终依据",
    titleEn: "Final Source of Truth",
    lines: [
      "最终排课以系统记录为准，群消息只做通知。",
      "System record is final. Group chat messages are notifications only.",
    ],
  },
  {
    titleZh: "统一入口",
    titleEn: "Single Intake Entry",
    lines: [
      "所有需求先走工单录入链接，避免口头漏单。",
      "All requests must enter via ticket intake link to avoid missing verbal requests.",
    ],
  },
  {
    titleZh: "标准流程",
    titleEn: "Standard Flow",
    lines: [
      "录入 -> 确认信息 -> 找老师 -> 确认家长 -> 系统更新 -> 完成。",
      "Intake -> Confirm info -> Find teacher -> Confirm parent -> System update -> Complete.",
    ],
  },
  {
    titleZh: "SLA",
    titleEn: "SLA",
    lines: [
      "紧急工单优先处理；所有工单需写清下一步和截止时间。",
      "Urgent tickets get priority; every ticket needs clear next action and due date.",
    ],
  },
  {
    titleZh: "分工",
    titleEn: "Ownership by Role",
    lines: [
      "客服 CS：接单、补全信息、更新状态、催办。",
      "CS: intake, complete info, update status, and follow-up reminders.",
      "教务 Ops：排课协调、老师沟通、家长确认、执行落地。",
      "Ops: scheduling, teacher coordination, parent confirmation, and execution.",
      "管理 Mgmt：处理升级异常、跨部门协调、关键决策。",
      "Mgmt: escalation handling, cross-team coordination, and final decisions.",
      "每张工单必须有明确负责人角色（CS/Ops/Mgmt）与截止时间。",
      "Every ticket must have a clear owner role (CS/Ops/Mgmt) and deadline.",
    ],
  },
  {
    titleZh: "完成定义",
    titleEn: "Definition of Done",
    lines: [
      "已通知家长 + 已完成系统更新 + 已写入交接记录。",
      "Parent informed + system updated + handover recorded.",
    ],
  },
  {
    titleZh: "群治理",
    titleEn: "Group Governance",
    lines: [
      "群里不追溯历史，以工单状态和交接表为准。",
      "Do not rely on chat history; rely on ticket status and handover log.",
    ],
  },
];

export default async function TicketSopPage() {
  await requireAdmin();
  const lang = await getLang();
  return (
    <div>
      <h2>{t(lang, "Ticket SOP One Pager", "工单SOP一页纸")}</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Link scroll={false} href="/admin/tickets">{t(lang, "Back to Tickets", "返回工单中心")}</Link>
        <Link scroll={false} href="/admin/tickets/handover">{t(lang, "Daily Handover", "每日交接")}</Link>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {SOP_BLOCKS.map((b) => (
          <section key={b.titleEn} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, background: "#fff" }}>
            <h3 style={{ margin: "0 0 6px" }}>
              {b.titleZh} / {b.titleEn}
            </h3>
            {b.lines.map((line) => (
              <div key={line} style={{ color: "#334155", lineHeight: 1.5 }}>
                {line}
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
