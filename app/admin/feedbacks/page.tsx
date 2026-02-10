import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";
import CopyTextButton from "@/app/admin/_components/CopyTextButton";

function fmtRange(startAt: Date, endAt: Date) {
  return `${new Date(startAt).toLocaleString()} - ${new Date(endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function buildSessionLine(session: any) {
  const plannedTime = fmtRange(session.startAt, session.endAt);
  const courseLine = `${session.class.course.name}${session.class.subject ? ` / ${session.class.subject.name}` : ""}${
    session.class.level ? ` / ${session.class.level.name}` : ""
  }`;
  return `${plannedTime} | ${courseLine}`;
}

function buildForwardText(row: any) {
  const classLine = `${row.session.class.course.name}${row.session.class.subject ? ` / ${row.session.class.subject.name}` : ""}${
    row.session.class.level ? ` / ${row.session.class.level.name}` : ""
  }`;
  const studentNames = row.session.class.enrollments.map((e: any) => e.student.name).filter(Boolean);
  return [
    `Session / 课次: ${fmtRange(row.session.startAt, row.session.endAt)}`,
    `Class / 班级: ${classLine}`,
    `Teacher / 老师: ${row.teacher?.name ?? "-"}`,
    `Students / 学生: ${studentNames.length > 0 ? studentNames.join(", ") : "-"}`,
    `Campus/Room / 校区教室: ${row.session.class.campus.name}${row.session.class.room ? ` / ${row.session.class.room.name}` : ""}`,
    `Status / 状态: ${row.status ?? "-"}`,
    "",
    "Feedback / 反馈:",
    "Original / 原文:",
    row.content ?? "",
  ].join("\n");
}

function toBilingualFeedbackText(content: string | null | undefined) {
  if (!content) return "";
  return content
    .replace(/^\[Class Feedback - /m, "[Class Feedback / 课堂反馈 - ")
    .replace(/\bSubject:/g, "Subject / 科目:")
    .replace(/\bTime:/g, "Time / 时间:")
    .replace(/\bPlanned\b/g, "Planned / 计划")
    .replace(/\bActual\b/g, "Actual / 实际")
    .replace(/\bClass performance:/g, "Class performance / 课堂表现:")
    .replace(/\bHomework:/g, "Homework / 作业:")
    .replace(/\bPrevious homework done:/g, "Previous homework done / 之前作业完成情况:")
    .replace(/\bReason:/g, "Reason / 原因:")
    .replace(/\bNote:/g, "Note / 备注:");
}

function isFinalTeacherFeedback(feedback: { isProxyDraft?: boolean | null; status?: string | null }) {
  if (!feedback) return false;
  if (feedback.isProxyDraft) return false;
  if (feedback.status === "PROXY_DRAFT") return false;
  return true;
}

async function markForwarded(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const channel = String(formData.get("channel") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const status = String(formData.get("status") ?? "pending");
  if (!id) redirect(`/admin/feedbacks?status=${encodeURIComponent(status)}&err=Missing+id`);

  await prisma.sessionFeedback.update({
    where: { id },
    data: {
      forwardedAt: new Date(),
      forwardedBy: admin.name,
      forwardChannel: channel || null,
      forwardNote: note || null,
    },
  });

  redirect(`/admin/feedbacks?status=${encodeURIComponent(status)}&msg=Forwarded`);
}

async function createProxyDraft(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const sessionId = String(formData.get("sessionId") ?? "");
  const teacherId = String(formData.get("teacherId") ?? "");
  const status = String(formData.get("status") ?? "missing");
  const note = String(formData.get("note") ?? "").trim();
  if (!sessionId || !teacherId) redirect(`/admin/feedbacks?status=${encodeURIComponent(status)}&err=Missing+session+or+teacher`);

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      class: { include: { course: true, subject: true, level: true } },
    },
  });
  if (!session) redirect(`/admin/feedbacks?status=${encodeURIComponent(status)}&err=Session+not+found`);

  const deadline = new Date(new Date(session.endAt).getTime() + 12 * 60 * 60 * 1000);
  const content = [
    "[Proxy Draft / 代填草稿 - Admin / 教务]",
    `Session / 课次: ${buildSessionLine(session)}`,
    "Reason / 原因: Teacher feedback overdue more than 12 hours. / 老师反馈超过12小时未提交。",
    `Note / 备注: ${note || "Pending teacher completion / 待老师补全"}`,
  ].join("\n");

  await prisma.sessionFeedback.upsert({
    where: { sessionId_teacherId: { sessionId, teacherId } },
    update: {
      content,
      classPerformance: "Proxy draft by admin. Pending teacher completion.",
      homework: "Pending teacher completion.",
      status: "PROXY_DRAFT",
      dueAt: deadline,
      isProxyDraft: true,
      proxyNote: note || "Auto-created due to >12h overdue feedback.",
      submittedByRole: "ADMIN",
      submittedByUserId: admin.id,
      submittedAt: new Date(),
    },
    create: {
      sessionId,
      teacherId,
      content,
      classPerformance: "Proxy draft by admin. Pending teacher completion.",
      homework: "Pending teacher completion.",
      status: "PROXY_DRAFT",
      dueAt: deadline,
      isProxyDraft: true,
      proxyNote: note || "Auto-created due to >12h overdue feedback.",
      submittedByRole: "ADMIN",
      submittedByUserId: admin.id,
      submittedAt: new Date(),
    },
  });

  redirect(`/admin/feedbacks?status=${encodeURIComponent(status)}&msg=Proxy+draft+created`);
}

export default async function AdminFeedbacksPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; msg?: string; err?: string }>;
}) {
  const lang = await getLang();
  await requireAdmin();

  const sp = await searchParams;
  const status = sp?.status ?? "missing";
  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";

  const now = new Date();
  const overdueAt = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const lookback = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const allFeedbackRows = await prisma.sessionFeedback.findMany({
    include: {
      teacher: true,
      session: {
        include: {
          class: {
            include: {
              course: true,
              subject: true,
              level: true,
              campus: true,
              room: true,
              enrollments: { include: { student: true } },
            },
          },
        },
      },
    },
    orderBy: [{ submittedAt: "desc" }],
    take: 800,
  });
  const finalFeedbackRows = allFeedbackRows.filter((r) => isFinalTeacherFeedback(r));
  const pendingRows = finalFeedbackRows.filter((r) => !r.forwardedAt);
  const forwardedRows = finalFeedbackRows.filter((r) => !!r.forwardedAt);
  const proxyDraftRows = allFeedbackRows.filter((r) => !isFinalTeacherFeedback(r));
  const rows =
    status === "pending"
      ? pendingRows
      : status === "forwarded"
      ? forwardedRows
      : status === "proxy"
      ? proxyDraftRows
      : status === "all"
      ? finalFeedbackRows
      : [];

  const overdueSessions = await prisma.session.findMany({
    where: { endAt: { gte: lookback, lte: overdueAt } },
    include: {
      teacher: true,
      class: {
        include: {
          teacher: true,
          course: true,
          subject: true,
          level: true,
          campus: true,
          room: true,
          enrollments: { include: { student: true } },
        },
      },
      feedbacks: true,
    },
    orderBy: { endAt: "desc" },
    take: 600,
  });

  const overdueItems = overdueSessions
    .map((s) => {
      const responsibleTeacherId = s.teacherId ?? s.class.teacherId;
      const responsibleTeacherName = s.teacher?.name ?? s.class.teacher.name;
      const feedback = s.feedbacks.find((f) => f.teacherId === responsibleTeacherId) ?? null;
      if (feedback && isFinalTeacherFeedback(feedback)) return null;
      return {
        session: s,
        teacherId: responsibleTeacherId,
        teacherName: responsibleTeacherName,
        feedback,
        kind: feedback ? "proxy" : "missing",
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .slice(0, 500);

  const missingRows = overdueItems.filter((x) => x.kind === "missing");
  const overdueProxyRows = overdueItems.filter((x) => x.kind === "proxy");

  const pendingCount = pendingRows.length;
  const forwardedCount = forwardedRows.length;
  const proxyCount = overdueProxyRows.length;
  const allCount = finalFeedbackRows.length;
  const missingCount = missingRows.length;
  const isOverdueTab = status === "missing" || status === "proxy";
  const shownOverdueRows = status === "proxy" ? overdueProxyRows : missingRows;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h2 style={{ marginBottom: 0 }}>{t(lang, "Teacher Feedback Desk", "老师课后反馈工作台")}</h2>
      {err && <div style={{ color: "#b00", marginBottom: 10 }}>{err}</div>}
      {msg && <div style={{ color: "#087", marginBottom: 10 }}>{msg}</div>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <a
          href="/admin/feedbacks?status=missing"
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #fecaca",
            background: status === "missing" ? "#fee2e2" : "#fff",
          }}
        >
          {t(lang, "Missing > 12h", "超过12小时未反馈")} ({missingCount})
        </a>
        <a
          href="/admin/feedbacks?status=proxy"
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #fcd34d",
            background: status === "proxy" ? "#fef3c7" : "#fff",
          }}
        >
          {t(lang, "Proxy draft pending teacher", "代填草稿待老师补全")} ({proxyCount})
        </a>
        <a
          href="/admin/feedbacks?status=pending"
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #bfdbfe",
            background: status === "pending" ? "#dbeafe" : "#fff",
          }}
        >
          {t(lang, "Pending Forward", "待转发")} ({pendingCount})
        </a>
        <a
          href="/admin/feedbacks?status=forwarded"
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #86efac",
            background: status === "forwarded" ? "#dcfce7" : "#fff",
          }}
        >
          {t(lang, "Forwarded", "已转发")} ({forwardedCount})
        </a>
        <a
          href="/admin/feedbacks?status=all"
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #d1d5db",
            background: status === "all" ? "#f3f4f6" : "#fff",
          }}
        >
          {t(lang, "All Final Feedback", "全部正式反馈")} ({allCount})
        </a>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 8,
        }}
      >
        <div style={{ border: "1px solid #fecaca", background: "#fff7f7", borderRadius: 10, padding: 10 }}>
          <div style={{ fontSize: 12, color: "#7f1d1d" }}>{t(lang, "Missing > 12h", "超过12小时未反馈")}</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{missingCount}</div>
        </div>
        <div style={{ border: "1px solid #fcd34d", background: "#fffbeb", borderRadius: 10, padding: 10 }}>
          <div style={{ fontSize: 12, color: "#92400e" }}>{t(lang, "Proxy Pending", "代填待补全")}</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{proxyCount}</div>
        </div>
        <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 10, padding: 10 }}>
          <div style={{ fontSize: 12, color: "#1d4ed8" }}>{t(lang, "Pending Forward", "待转发")}</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{pendingCount}</div>
        </div>
        <div style={{ border: "1px solid #86efac", background: "#f0fdf4", borderRadius: 10, padding: 10 }}>
          <div style={{ fontSize: 12, color: "#166534" }}>{t(lang, "Forwarded", "已转发")}</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{forwardedCount}</div>
        </div>
      </div>

      {isOverdueTab ? (
        shownOverdueRows.length === 0 ? (
          <div style={{ color: "#999" }}>{t(lang, "No overdue feedbacks.", "暂无超时反馈。")}</div>
        ) : (
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))" }}>
            {shownOverdueRows.map((r) => {
              const studentNames = r.session.class.enrollments.map((e) => e.student.name).filter(Boolean);
              const cardTone =
                r.kind === "proxy"
                  ? { border: "1px solid #fcd34d", background: "#fffbeb" }
                  : { border: "1px solid #fecaca", background: "#fff7f7" };
              return (
                <div key={r.session.id} style={{ ...cardTone, borderRadius: 12, padding: 12, display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ fontWeight: 700 }}>{fmtRange(r.session.startAt, r.session.endAt)}</div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <ClassTypeBadge capacity={r.session.class.capacity} compact />
                        <span>
                          {r.session.class.course.name}
                          {r.session.class.subject ? ` / ${r.session.class.subject.name}` : ""}
                          {r.session.class.level ? ` / ${r.session.class.level.name}` : ""}
                        </span>
                      </div>
                      <div style={{ color: "#666", fontSize: 12 }}>
                        {r.session.class.campus.name}
                        {r.session.class.room ? ` / ${r.session.class.room.name}` : ""}
                      </div>
                    </div>
                    <div
                      style={{
                        alignSelf: "start",
                        padding: "4px 8px",
                        borderRadius: 999,
                        fontSize: 12,
                        border: r.kind === "proxy" ? "1px solid #f59e0b" : "1px solid #ef4444",
                        color: r.kind === "proxy" ? "#92400e" : "#991b1b",
                        background: "#fff",
                      }}
                    >
                      {r.kind === "proxy"
                        ? t(lang, "Proxy draft exists", "已有代填草稿")
                        : t(lang, "Missing", "缺失")}
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 2, fontSize: 13 }}>
                    <div>
                      <b>{t(lang, "Teacher", "老师")}:</b> {r.teacherName}
                    </div>
                    <div>
                      <b>{t(lang, "Students", "学生")}:</b> {studentNames.length > 0 ? studentNames.join(", ") : "-"}
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <a href={`/teacher/sessions/${r.session.id}`}>{t(lang, "Open teacher page", "打开老师页")}</a>
                    <form action={createProxyDraft} style={{ display: "grid", gap: 6 }}>
                      <input type="hidden" name="sessionId" value={r.session.id} />
                      <input type="hidden" name="teacherId" value={r.teacherId} />
                      <input type="hidden" name="status" value={status} />
                      <textarea
                        name="note"
                        rows={2}
                        defaultValue={r.feedback?.proxyNote ?? ""}
                        placeholder={t(lang, "Proxy note", "代填备注")}
                      />
                      <div>
                        <button type="submit">
                          {r.kind === "proxy"
                            ? t(lang, "Update Proxy Draft", "更新代填草稿")
                            : t(lang, "Create Proxy Draft", "创建代填草稿")}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : rows.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No feedback records.", "暂无反馈记录。")}</div>
      ) : (
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))" }}>
          {rows.map((r) => {
            const studentNames = r.session.class.enrollments.map((e) => e.student.name).filter(Boolean);
            return (
              <div key={r.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontWeight: 700 }}>{fmtRange(r.session.startAt, r.session.endAt)}</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <ClassTypeBadge capacity={r.session.class.capacity} compact />
                      <span>
                        {r.session.class.course.name}
                        {r.session.class.subject ? ` / ${r.session.class.subject.name}` : ""}
                        {r.session.class.level ? ` / ${r.session.class.level.name}` : ""}
                      </span>
                    </div>
                    <div style={{ color: "#666", fontSize: 12 }}>
                      {r.session.class.campus.name}
                      {r.session.class.room ? ` / ${r.session.class.room.name}` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 12 }}>
                    <div>{t(lang, "Submitted", "提交时间")}: {new Date(r.submittedAt).toLocaleString()}</div>
                    <div>{t(lang, "Teacher", "老师")}: {r.teacher.name}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 2, fontSize: 13 }}>
                  <div>
                    <b>{t(lang, "Students", "学生")}:</b> {studentNames.length > 0 ? studentNames.join(", ") : "-"}
                  </div>
                  <div>
                    <b>{t(lang, "Status", "状态")}:</b> {r.status}
                    {r.isProxyDraft ? ` (${t(lang, "Proxy draft", "代填草稿")})` : ""}
                  </div>
                  {r.proxyNote ? (
                    <div>
                      <b>{t(lang, "Proxy note", "代填备注")}:</b> {r.proxyNote}
                    </div>
                  ) : null}
                </div>

                <details>
                  <summary>{t(lang, "Formatted text", "格式化文本")}</summary>
                  <div style={{ marginTop: 6, color: "#666", whiteSpace: "pre-wrap" }}>{toBilingualFeedbackText(r.content)}</div>
                </details>

                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 8 }}>
                  <div style={{ marginBottom: 8 }}>
                    <CopyTextButton
                      text={buildForwardText(r)}
                      label={t(lang, "Copy Feedback", "复制反馈")}
                      copiedLabel={t(lang, "Copied", "已复制")}
                    />
                  </div>
                  {r.forwardedAt ? (
                    <div
                      style={{
                        border: "1px solid #86efac",
                        background: "#f0fdf4",
                        color: "#166534",
                        borderRadius: 10,
                        padding: 8,
                        fontSize: 12,
                        display: "grid",
                        gap: 2,
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{t(lang, "Forwarded", "已转发")}</div>
                      <div>{new Date(r.forwardedAt).toLocaleString()}</div>
                      <div>{r.forwardedBy ?? "-"}</div>
                      <div>{r.forwardChannel ?? "-"}</div>
                      {r.forwardNote ? <div style={{ whiteSpace: "pre-wrap" }}>{r.forwardNote}</div> : null}
                    </div>
                  ) : (
                    <form action={markForwarded} style={{ display: "grid", gap: 6, maxWidth: 360 }}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value={status} />
                      <input name="channel" placeholder={t(lang, "Channel (e.g. WeChat)", "渠道(如微信)")} />
                      <textarea name="note" rows={3} placeholder={t(lang, "Forward note", "转发备注")} />
                      <div>
                        <button type="submit">{t(lang, "Mark as Forwarded", "标记已转发")}</button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

