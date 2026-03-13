import { prisma } from "@/lib/prisma";
import IntakeForm from "../IntakeForm";

function isOpenStatus(status: string) {
  return !["Completed", "Cancelled"].includes(status);
}

function overdueLabel(nextActionDue: Date | null, status: string) {
  if (!nextActionDue || !isOpenStatus(status)) return "-";
  const diffMinutes = Math.floor((Date.now() - nextActionDue.getTime()) / 60000);
  if (diffMinutes <= 0) return "On track / 未超时";
  if (diffMinutes < 60) return `${diffMinutes} min overdue`;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m overdue` : `${hours}h overdue`;
}

export default async function TicketIntakeByTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const intakeToken = await prisma.ticketIntakeToken.findUnique({
    where: { token },
    select: { isActive: true, expiresAt: true, label: true },
  });
  const valid =
    !!intakeToken &&
    intakeToken.isActive &&
    (!intakeToken.expiresAt || intakeToken.expiresAt.getTime() > Date.now());

  if (!valid) {
    return (
      <div style={{ maxWidth: 760, margin: "24px auto", padding: "0 12px" }}>
        <h2>录入链接不可用 / Intake Link Unavailable</h2>
        <div style={{ color: "#334155" }}>
          链接失效或已停用，请联系管理员获取新链接。
        </div>
        <div style={{ color: "#334155" }}>
          Link expired or disabled. Contact admin for a new link.
        </div>
      </div>
    );
  }

  const encoded = encodeURIComponent(token);
  const viewerName = intakeToken.label?.trim() || "";
  const ownTickets = viewerName
    ? await prisma.ticket.findMany({
        where: {
          isArchived: false,
          createdByName: { equals: viewerName, mode: "insensitive" },
        },
        orderBy: [{ createdAt: "desc" }],
        take: 50,
        select: {
          id: true,
          ticketNo: true,
          studentName: true,
          type: true,
          status: true,
          owner: true,
          nextAction: true,
          nextActionDue: true,
          createdAt: true,
        },
      })
    : [];
  const openTickets = ownTickets.filter((row) => isOpenStatus(row.status));
  const overdueTickets = openTickets.filter((row) => row.nextActionDue && row.nextActionDue.getTime() < Date.now());
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {viewerName ? (
        <div style={{ maxWidth: 920, margin: "0 auto", width: "100%", padding: "14px 12px 0" }}>
          <div style={{ border: "1px solid #dbeafe", background: "#f8fbff", borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{viewerName} 工单看板 / {viewerName} Ticket Board</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <div style={{ border: "1px solid #cbd5e1", borderRadius: 999, padding: "4px 10px", background: "#fff" }}>
                全部 / Total: {ownTickets.length}
              </div>
              <div style={{ border: "1px solid #fdba74", borderRadius: 999, padding: "4px 10px", background: "#fff7ed" }}>
                未完成 / Open: {openTickets.length}
              </div>
              <div style={{ border: "1px solid #fca5a5", borderRadius: 999, padding: "4px 10px", background: "#fef2f2", color: "#b91c1c" }}>
                超时待追 / Overdue: {overdueTickets.length}
              </div>
            </div>
            {ownTickets.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: 13 }}>当前还没有这位录入人的工单。/ No tickets yet for this intake agent.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table cellPadding={8} style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                  <thead>
                    <tr style={{ background: "#eef6ff" }}>
                      <th align="left">Ticket</th>
                      <th align="left">学生 / Student</th>
                      <th align="left">类型 / Type</th>
                      <th align="left">状态 / Status</th>
                      <th align="left">负责人 / Owner</th>
                      <th align="left">下一步 / Next</th>
                      <th align="left">截止 / Due</th>
                      <th align="left">录入时间 / Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownTickets.map((row) => {
                      const overdue = row.nextActionDue && row.nextActionDue.getTime() < Date.now() && isOpenStatus(row.status);
                      return (
                        <tr key={row.id} style={{ borderTop: "1px solid #e2e8f0", background: overdue ? "#fff7f7" : "#fff" }}>
                          <td style={{ fontFamily: "monospace", fontSize: 12 }}>{row.ticketNo}</td>
                          <td>{row.studentName}</td>
                          <td>{row.type}</td>
                          <td>
                            <div>{row.status}</div>
                            {overdue ? <div style={{ color: "#b91c1c", fontSize: 12, fontWeight: 700 }}>{overdueLabel(row.nextActionDue, row.status)}</div> : null}
                          </td>
                          <td>{row.owner ?? "-"}</td>
                          <td style={{ whiteSpace: "pre-wrap" }}>{row.nextAction ?? "-"}</td>
                          <td>{row.nextActionDue ? row.nextActionDue.toLocaleString() : "-"}</td>
                          <td>{row.createdAt.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <IntakeForm
        apiPath={`/api/tickets/intake/${encoded}`}
        uploadPath={`/api/tickets/upload/${encoded}`}
        studentLookupPath={`/api/tickets/intake/${encoded}/students/lookup`}
        teacherLookupPath={`/api/tickets/intake/${encoded}/teachers/lookup`}
        createdByNameDefault={viewerName || undefined}
        lockCreatedByName={Boolean(viewerName)}
      />
    </div>
  );
}
