import { prisma } from "@/lib/prisma";
import IntakeForm from "../IntakeForm";
import { formatBusinessDateTime } from "@/lib/date-only";
import { buildParentAvailabilityPath } from "@/lib/parent-availability";

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

function dueTone(nextActionDue: Date | null, status: string) {
  if (!nextActionDue || !isOpenStatus(status)) return { bg: "#f8fafc", border: "#e2e8f0", text: "#475569" };
  if (nextActionDue.getTime() >= Date.now()) return { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534" };
  return { bg: "#fff1f2", border: "#fecdd3", text: "#b91c1c" };
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
          parentAvailabilityRequest: {
            select: {
              token: true,
              submittedAt: true,
              expiresAt: true,
            },
          },
        },
      })
    : [];
  const openTickets = ownTickets.filter((row) => isOpenStatus(row.status));
  const overdueTickets = openTickets.filter((row) => row.nextActionDue && row.nextActionDue.getTime() < Date.now());
  const sortedTickets = [...ownTickets].sort((a, b) => {
    const aOverdue = a.nextActionDue && a.nextActionDue.getTime() < Date.now() && isOpenStatus(a.status) ? 1 : 0;
    const bOverdue = b.nextActionDue && b.nextActionDue.getTime() < Date.now() && isOpenStatus(b.status) ? 1 : 0;
    if (aOverdue !== bOverdue) return bOverdue - aOverdue;
    const aDue = a.nextActionDue?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bDue = b.nextActionDue?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (aDue !== bDue) return aDue - bDue;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
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
              <div style={{ display: "grid", gap: 10 }}>
                {sortedTickets.map((row) => {
                  const tone = dueTone(row.nextActionDue, row.status);
                  const overdue = row.nextActionDue && row.nextActionDue.getTime() < Date.now() && isOpenStatus(row.status);
                  return (
                    <div
                      key={row.id}
                      style={{
                        border: `1px solid ${tone.border}`,
                        background: tone.bg,
                        borderRadius: 10,
                        padding: 12,
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontFamily: "monospace", fontSize: 12, color: "#475569" }}>{row.ticketNo}</div>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{row.studentName}</div>
                        </div>
                        <div
                          style={{
                            border: `1px solid ${tone.border}`,
                            color: tone.text,
                            background: "#fff",
                            borderRadius: 999,
                            padding: "4px 10px",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {overdue ? overdueLabel(row.nextActionDue, row.status) : row.status}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ border: "1px solid #dbeafe", background: "#fff", borderRadius: 999, padding: "4px 10px", fontSize: 12 }}>
                          类型 / Type: {row.type}
                        </div>
                        <div style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 999, padding: "4px 10px", fontSize: 12 }}>
                          负责人 / Owner: {row.owner ?? "-"}
                        </div>
                        <div style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 999, padding: "4px 10px", fontSize: 12 }}>
                          状态 / Status: {row.status}
                        </div>
                      </div>

                      <div style={{ display: "grid", gap: 6, fontSize: 13, color: "#334155" }}>
                        <div>
                          <b>下一步 / Next:</b>{" "}
                          <span style={{ whiteSpace: "pre-wrap" }}>{row.nextAction ?? "-"}</span>
                        </div>
                        <div>
                          <b>截止 / Due:</b> {row.nextActionDue ? formatBusinessDateTime(row.nextActionDue) : "-"}
                        </div>
                        <div>
                          <b>录入时间 / Created:</b> {formatBusinessDateTime(row.createdAt)}
                        </div>
                        {row.parentAvailabilityRequest ? (
                          <div>
                            <b>家长时间表单 / Parent form:</b>{" "}
                            {row.parentAvailabilityRequest.submittedAt
                              ? `已提交 / Submitted @ ${formatBusinessDateTime(row.parentAvailabilityRequest.submittedAt)}`
                              : row.parentAvailabilityRequest.expiresAt
                                ? `等待家长 / Waiting (expires ${formatBusinessDateTime(row.parentAvailabilityRequest.expiresAt)})`
                                : "等待家长 / Waiting"}
                          </div>
                        ) : null}
                      </div>
                      {row.parentAvailabilityRequest ? (
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 13 }}>
                          <a href={buildParentAvailabilityPath(row.parentAvailabilityRequest.token)} target="_blank" rel="noreferrer">
                            打开家长表单 / Open parent form
                          </a>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
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
