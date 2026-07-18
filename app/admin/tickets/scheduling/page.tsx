import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatBusinessDateTime } from "@/lib/date-only";
import { prisma } from "@/lib/prisma";
import { schedulingActionDefinition, schedulingActionStatusLabel, TICKET_SCHEDULING_ACTION_TYPES } from "@/lib/ticket-scheduling-actions";

const closed = ["Completed", "Cancelled"];

function tone(status: string) {
  if (status === "APPLIED") return { background: "#ecfdf3", border: "#86efac", color: "#166534" };
  if (status === "CONFLICT") return { background: "#fff1f2", border: "#fda4af", color: "#9f1239" };
  if (status === "READY") return { background: "#fff7ed", border: "#fdba74", color: "#9a3412" };
  return { background: "#f8fafc", border: "#cbd5e1", color: "#475569" };
}

export default async function SchedulingTicketWorkbenchPage() {
  await requireAdmin();
  const schedulingTypes: string[] = Array.from(new Set<string>([...TICKET_SCHEDULING_ACTION_TYPES.map((item) => item.ticketType), "新排课"]));
  const tickets = await prisma.ticket.findMany({
    where: { isArchived: false, status: { notIn: closed }, type: { in: schedulingTypes } },
    include: {
      schedulingActions: { include: { sourceSession: { include: { teacher: true, class: { include: { course: true, teacher: true } } } } }, orderBy: { sequence: "asc" } },
    },
    orderBy: [{ nextActionDue: "asc" }, { updatedAt: "desc" }],
  });
  const actions = tickets.flatMap((ticket) => ticket.schedulingActions.map((action) => ({ ticket, action })));
  const unresolved = actions.filter(({ action }) => !["APPLIED", "CANCELLED"].includes(action.status));
  const legacy = tickets.filter((ticket) => ticket.schedulingActions.length === 0);
  const overdue = tickets.filter((ticket) => ticket.nextActionDue && ticket.nextActionDue < new Date()).length;
  const lanes = ["NEED_INFO", "WAITING_PARENT", "WAITING_TEACHER", "READY", "CONFLICT"];

  return <div style={{ display: "grid", gap: 18 }}>
    <div style={{ borderBottom: "4px solid #1c1917", paddingBottom: 16, display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
      <div><div style={{ color: "#9a3412", fontSize: 12, fontWeight: 850 }}>教务排课工作台</div><h1 style={{ margin: "4px 0 0" }}>排课执行工单</h1><p style={{ margin: "8px 0 0", color: "#57534e" }}>只展示未关闭排课工单。正式修改仍通过现有课表权限、冲突和课包校验。</p></div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}><Link href="/admin/tickets">全部工单</Link><Link href="/admin/schedule">正式课表</Link></div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 1, background: "#d6d3d1", border: "1px solid #d6d3d1" }}>
      {[{ label: "开放工单", value: tickets.length }, { label: "待执行动作", value: unresolved.length }, { label: "旧工单待结构化", value: legacy.length }, { label: "已逾期", value: overdue }].map((item) => <div key={item.label} style={{ background: "#fff", padding: 16 }}><div style={{ color: "#78716c", fontSize: 12 }}>{item.label}</div><div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>{item.value}</div></div>)}
    </div>
    {legacy.length ? <div style={{ border: "1px solid #fcd34d", background: "#fffbeb", padding: 14 }}><b>{legacy.length} 张历史排课工单还没有执行动作。</b><div style={{ marginTop: 6, color: "#78350f" }}>打开工单后人工选择动作和原课程；系统不会根据旧文字自动修改课表。</div><div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>{legacy.slice(0, 8).map((ticket) => <Link key={ticket.id} href={`/admin/tickets/${ticket.id}#scheduling-actions`}>{ticket.ticketNo} · {ticket.studentName}</Link>)}</div></div> : null}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14, alignItems: "start" }}>
      {lanes.map((status) => {
        const rows = unresolved.filter(({ action }) => action.status === status);
        return <section key={status} style={{ minWidth: 0 }}><div style={{ display: "flex", justifyContent: "space-between", borderBottom: "3px solid #292524", paddingBottom: 8 }}><b>{schedulingActionStatusLabel(status)}</b><span>{rows.length}</span></div><div style={{ display: "grid" }}>{rows.length ? rows.map(({ ticket, action }) => {
          const definition = schedulingActionDefinition(action.actionType);
          const style = tone(action.status);
          return <Link key={action.id} href={`/admin/tickets/${ticket.id}#scheduling-actions`} style={{ display: "grid", gap: 6, padding: "14px 0", borderBottom: `1px solid ${style.border}`, color: "inherit", textDecoration: "none" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b>{ticket.studentName}</b><span style={{ color: style.color, fontSize: 12 }}>{ticket.ticketNo}</span></div><div>{definition?.label ?? action.actionType}</div><div style={{ color: "#78716c", fontSize: 12 }}>{action.sourceSession ? `${formatBusinessDateTime(action.sourceSession.startAt)} · ${action.sourceSession.class.course.name}` : definition?.needsSource ? "还缺原课程" : ticket.course || "待补课程"}</div><div style={{ color: "#78716c", fontSize: 12 }}>负责人：{ticket.owner || "未分配"}</div></Link>;
        }) : <div style={{ color: "#a8a29e", padding: "18px 0" }}>当前没有</div>}</div></section>;
      })}
    </div>
  </div>;
}
