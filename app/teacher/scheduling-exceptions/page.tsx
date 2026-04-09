import { redirect } from "next/navigation";
import { requireTeacherProfile } from "@/lib/auth";
import { formatBusinessDateTime } from "@/lib/date-only";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import TeacherWorkspaceHero from "../_components/TeacherWorkspaceHero";
import { composeTicketSituation, parseTicketSituationSummary, SCHEDULING_COORDINATION_TICKET_TYPE } from "@/lib/tickets";

const primaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  padding: "0 14px",
  borderRadius: 10,
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: 700,
  textDecoration: "none",
} as const;

const secondaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  padding: "0 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 700,
  textDecoration: "none",
} as const;

const emptyStateCardStyle = {
  border: "1px solid #dbeafe",
  background: "#f8fbff",
  borderRadius: 16,
  padding: 18,
  display: "grid",
  gap: 10,
} as const;

function fmt(d?: Date | null) {
  if (!d) return "-";
  return formatBusinessDateTime(new Date(d));
}

function statusBadge(status: string) {
  if (status === "Exception") {
    return {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 999,
      background: "#fff7ed",
      color: "#c2410c",
      border: "1px solid #fdba74",
      fontSize: 12,
      fontWeight: 700,
    } as const;
  }
  return {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    fontSize: 12,
    fontWeight: 700,
  } as const;
}

function decode(v: string | undefined) {
  return v ? decodeURIComponent(v) : "";
}

export default async function TeacherSchedulingExceptionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ msg?: string; err?: string }>;
}) {
  const lang = await getLang();
  const { teacher } = await requireTeacherProfile();
  const sp = await searchParams;
  const msg = decode(sp?.msg);
  const err = decode(sp?.err);

  if (!teacher) {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        <TeacherWorkspaceHero
          title={t(lang, "Scheduling Exceptions", "排课例外确认")}
          subtitle={t(lang, "Review only the requests that fall outside your submitted availability.", "这里只处理那些超出你已提交 availability 的特殊时间请求。")}
          actions={[{ href: "/teacher", label: t(lang, "Back to dashboard", "返回工作台") }]}
        />
        <section style={emptyStateCardStyle}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#b91c1c" }}>
            {t(lang, "Your teacher profile is not linked yet", "老师账号暂时还未绑定档案")}
          </div>
        </section>
      </div>
    );
  }

  async function respondToSchedulingException(formData: FormData) {
    "use server";
    const { teacher: currentTeacher } = await requireTeacherProfile();
    if (!currentTeacher) redirect("/teacher");

    const ticketId = String(formData.get("ticketId") ?? "").trim();
    const decision = String(formData.get("decision") ?? "").trim() as "can" | "cannot" | "alternative";
    const note = String(formData.get("note") ?? "").trim();
    if (!ticketId || !["can", "cannot", "alternative"].includes(decision)) {
      redirect("/teacher/scheduling-exceptions?err=Invalid+request");
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        student: {
          include: {
            enrollments: {
              where: { class: { teacherId: currentTeacher.id } },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });
    if (!ticket || ticket.type !== SCHEDULING_COORDINATION_TICKET_TYPE || ticket.isArchived) {
      redirect("/teacher/scheduling-exceptions?err=Ticket+not+found");
    }

    const teacherMatches =
      ticket.teacher === currentTeacher.name ||
      Boolean(ticket.student?.enrollments?.length);
    if (!teacherMatches) {
      redirect("/teacher/scheduling-exceptions?err=This+ticket+is+not+assigned+to+you");
    }

    const previousSummary = parseTicketSituationSummary(ticket.summary);
    const teacherReplyLine = note
      ? `${currentTeacher.name}: ${note}`
      : decision === "can"
        ? `${currentTeacher.name}: ${t(lang, "Requested special time works from my side.", "这个特殊时间我这边可以。")}`
        : decision === "cannot"
          ? `${currentTeacher.name}: ${t(lang, "Requested special time does not work from my side.", "这个特殊时间我这边不行。")}`
          : `${currentTeacher.name}: ${t(lang, "I suggested another nearby time.", "我建议改用邻近的替代时间。")}`;

    const nextAction =
      decision === "can"
        ? "Teacher confirmed the requested special time is available. Ops can now confirm with the parent and schedule it."
        : decision === "cannot"
          ? "Teacher cannot take the requested special time. Send fresh availability-based options to the parent and keep the coordination ticket open."
          : "Teacher suggested an alternative time. Send the note back to the parent and confirm the preferred slot before scheduling.";

    const nextStatus = decision === "can" ? "Confirmed" : "Waiting Parent";
    const nextDue = decision === "can" ? null : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const currentIssue = previousSummary.currentIssue || ticket.summary || "Scheduling coordination follow-up";
    const requiredActionBody = [previousSummary.requiredAction, `Teacher exception reply: ${teacherReplyLine}`, nextAction]
      .filter(Boolean)
      .join("\n\n");

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: nextStatus,
        teacherAvailability: teacherReplyLine,
        nextAction,
        nextActionDue: nextDue,
        lastUpdateAt: new Date(),
        summary: composeTicketSituation({
          currentIssue,
          requiredAction: requiredActionBody,
          latestDeadlineText: nextDue ? formatBusinessDateTime(nextDue) : "Teacher confirmed; ready for ops follow-up.",
        }),
      },
    });

    redirect(
      `/teacher/scheduling-exceptions?msg=${encodeURIComponent(
        decision === "can"
          ? "Exception confirmed"
          : decision === "cannot"
            ? "Marked unavailable"
            : "Alternative sent back to ops"
      )}`
    );
  }

  const rows = await prisma.ticket.findMany({
    where: {
      type: SCHEDULING_COORDINATION_TICKET_TYPE,
      isArchived: false,
      status: { in: ["Waiting Teacher", "Exception"] },
      OR: [
        { teacher: teacher.name },
        {
          student: {
            is: {
              enrollments: {
                some: {
                  class: { teacherId: teacher.id },
                },
              },
            },
          },
        },
      ],
    },
    include: {
      student: true,
    },
    orderBy: [{ nextActionDue: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  const waitingTeacher = rows.filter((row) => row.status === "Waiting Teacher");
  const exceptionRows = rows.filter((row) => row.status === "Exception");

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <TeacherWorkspaceHero
        title={t(lang, "Scheduling Exceptions", "排课例外确认")}
        subtitle={t(
          lang,
          "Only review parent requests that fall outside your submitted availability. Regular scheduling should continue to use your availability directly without extra confirmation.",
          "这里只处理超出你已提交 availability 的特殊时间请求。普通排课默认应直接使用你的 availability，不需要重复确认。"
        )}
        actions={[
          { href: "/teacher/availability", label: t(lang, "Open my availability", "打开我的可上课时间") },
          { href: "/teacher", label: t(lang, "Back to dashboard", "返回工作台") },
        ]}
      />

      {msg ? (
        <div style={{ padding: 12, borderRadius: 12, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#166534" }}>{msg}</div>
      ) : null}
      {err ? (
        <div style={{ padding: 12, borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c" }}>{err}</div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <div style={{ padding: 14, borderRadius: 16, border: "1px solid #bfdbfe", background: "#eff6ff" }}>
          <div style={{ color: "#1d4ed8", fontSize: 12 }}>{t(lang, "Waiting teacher", "等老师")}</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{waitingTeacher.length}</div>
        </div>
        <div style={{ padding: 14, borderRadius: 16, border: "1px solid #fdba74", background: "#fff7ed" }}>
          <div style={{ color: "#c2410c", fontSize: 12 }}>{t(lang, "Exceptions", "异常升级")}</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{exceptionRows.length}</div>
        </div>
        <div style={{ padding: 14, borderRadius: 16, border: "1px solid #dbeafe", background: "#f8fbff" }}>
          <div style={{ color: "#334155", fontSize: 12 }}>{t(lang, "Open requests", "待处理请求")}</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{rows.length}</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <section style={emptyStateCardStyle}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1d4ed8" }}>
            {t(lang, "No scheduling exceptions need you right now", "现在没有需要你确认的排课例外请求")}
          </div>
          <div style={{ color: "#475569", lineHeight: 1.6 }}>
            {t(
              lang,
              "This means operations can keep using your submitted availability directly. You only need to come here when a parent asks for a time that sits outside it.",
              "这表示教务目前可以直接使用你提交的 availability 排课。只有家长提出 availability 之外的特殊时间时，才需要回来这里确认。"
            )}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/teacher/availability" style={primaryButtonStyle}>{t(lang, "Review my availability", "查看我的可上课时间")}</a>
            <a href="/teacher" style={secondaryButtonStyle}>{t(lang, "Back to dashboard", "返回工作台")}</a>
          </div>
        </section>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {rows.map((row) => {
            const summary = parseTicketSituationSummary(row.summary);
            return (
              <section key={row.id} style={{ border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, background: "#fff", display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{row.studentName}</div>
                    <div style={{ color: "#475569" }}>
                      {row.course || t(lang, "Scheduling coordination", "排课协调")}
                      {row.teacher ? ` | ${row.teacher}` : ""}
                    </div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>{row.ticketNo}</div>
                  </div>
                  <span style={statusBadge(row.status)}>{row.status}</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#f8fafc" }}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Next follow-up", "下次跟进")}</div>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>{fmt(row.nextActionDue)}</div>
                  </div>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#f8fafc" }}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Current owner", "当前负责人")}</div>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>{row.owner || "-"}</div>
                  </div>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#f8fafc" }}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Latest ops note", "当前教务说明")}</div>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>{row.nextAction || summary.requiredAction || "-"}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Parent request summary", "家长请求摘要")}</div>
                  <div style={{ padding: 12, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", whiteSpace: "pre-wrap" }}>
                    {summary.currentIssue || row.summary || "-"}
                  </div>
                  {row.teacherAvailability ? (
                    <div style={{ color: "#475569", fontSize: 13 }}>
                      {t(lang, "Latest teacher reply", "上次老师回复")}: {row.teacherAvailability}
                    </div>
                  ) : null}
                </div>

                <form action={respondToSchedulingException} style={{ display: "grid", gap: 10 }}>
                  <input type="hidden" name="ticketId" value={row.id} />
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Teacher reply note", "老师回复备注")}</span>
                    <textarea
                      name="note"
                      rows={3}
                      placeholder={t(
                        lang,
                        "Write a short note such as the exact time you can accept, what does not work, or the nearest alternative you want ops to send back.",
                        "补一句简短说明，例如你能接受的具体时间、不能上的原因，或建议教务回家长的邻近替代时间。"
                      )}
                      style={{ width: "100%" }}
                    />
                  </label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="submit" name="decision" value="can">
                      {t(lang, "Can do", "这个时间可以")}
                    </button>
                    <button type="submit" name="decision" value="cannot">
                      {t(lang, "Cannot do", "这个时间不行")}
                    </button>
                    <button type="submit" name="decision" value="alternative">
                      {t(lang, "Suggest another slot", "给一个替代时间")}
                    </button>
                    <a
                      href={`/admin/tickets/${row.id}?back=${encodeURIComponent("/teacher/scheduling-exceptions")}`}
                      style={secondaryButtonStyle}
                    >
                      {t(lang, "Open full ticket", "打开完整工单")}
                    </a>
                  </div>
                </form>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
