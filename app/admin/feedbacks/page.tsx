import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

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

export default async function AdminFeedbacksPage({
  searchParams,
}: {
  searchParams?: { status?: string; msg?: string; err?: string };
}) {
  const lang = await getLang();
  await requireAdmin();
  const status = searchParams?.status ?? "pending";
  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";

  const rows = await prisma.sessionFeedback.findMany({
    where:
      status === "pending"
        ? { forwardedAt: null }
        : status === "forwarded"
        ? { forwardedAt: { not: null } }
        : undefined,
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
    take: 500,
  });

  return (
    <div>
      <h2>{t(lang, "Teacher Feedbacks", "老师课后反馈")}</h2>
      {err && <div style={{ color: "#b00", marginBottom: 10 }}>{err}</div>}
      {msg && <div style={{ color: "#087", marginBottom: 10 }}>{msg}</div>}

      <form method="GET" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <select name="status" defaultValue={status}>
          <option value="pending">{t(lang, "Pending Forward", "待转发")}</option>
          <option value="forwarded">{t(lang, "Forwarded", "已转发")}</option>
          <option value="all">{t(lang, "All", "全部")}</option>
        </select>
        <button type="submit">{t(lang, "Apply", "应用")}</button>
      </form>

      {rows.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No feedback records.", "暂无反馈记录。")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Submitted", "提交时间")}</th>
              <th align="left">{t(lang, "Teacher", "老师")}</th>
              <th align="left">{t(lang, "Session", "课次")}</th>
              <th align="left">{t(lang, "Students", "学生")}</th>
              <th align="left">{t(lang, "Feedback", "反馈内容")}</th>
              <th align="left">{t(lang, "Forward", "转发")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const studentNames = r.session.class.enrollments.map((e) => e.student.name).filter(Boolean);
              const plannedTime = `${new Date(r.session.startAt).toLocaleString()} - ${new Date(r.session.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
              const sessionLine = `${plannedTime} | ${r.session.class.course.name}${r.session.class.subject ? ` / ${r.session.class.subject.name}` : ""}${r.session.class.level ? ` / ${r.session.class.level.name}` : ""}`;
              const actualTime =
                r.actualStartAt && r.actualEndAt
                  ? `${new Date(r.actualStartAt).toLocaleString()} - ${new Date(r.actualEndAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : r.actualStartAt
                  ? `${new Date(r.actualStartAt).toLocaleString()} - ${t(lang, "Not set", "未填写")}`
                  : null;
              return (
                <tr key={r.id} style={{ borderTop: "1px solid #eee", verticalAlign: "top" }}>
                  <td>{new Date(r.submittedAt).toLocaleString()}</td>
                  <td>{r.teacher.name}</td>
                  <td>
                    <div>{sessionLine}</div>
                    <div style={{ color: "#666", fontSize: 12 }}>
                      {r.session.class.campus.name}
                      {r.session.class.room ? ` / ${r.session.class.room.name}` : ""}
                    </div>
                  </td>
                  <td>{studentNames.length > 0 ? studentNames.join(", ") : "-"}</td>
                  <td style={{ maxWidth: 420, whiteSpace: "pre-wrap" }}>
                    {r.focusStudentName && (
                      <div style={{ marginBottom: 4 }}>
                        <b>{t(lang, "Focus", "重点学生")}: </b>
                        {r.focusStudentName}
                      </div>
                    )}
                    <div style={{ marginBottom: 4 }}>
                      <b>{t(lang, "Planned", "计划时间")}: </b>
                      {plannedTime}
                    </div>
                    {actualTime && (
                      <div style={{ marginBottom: 4 }}>
                        <b>{t(lang, "Actual", "实际时间")}: </b>
                        {actualTime}
                      </div>
                    )}
                    {r.classPerformance && (
                      <div style={{ marginBottom: 4 }}>
                        <b>{t(lang, "Class performance", "课堂表现")}: </b>
                        {r.classPerformance}
                      </div>
                    )}
                    {r.homework && (
                      <div style={{ marginBottom: 4 }}>
                        <b>{t(lang, "Homework", "作业")}: </b>
                        {r.homework}
                      </div>
                    )}
                    {r.previousHomeworkDone !== null && (
                      <div style={{ marginBottom: 4 }}>
                        <b>{t(lang, "Prev homework", "之前作业")}: </b>
                        {r.previousHomeworkDone ? t(lang, "Done", "完成") : t(lang, "Not done", "未完成")}
                      </div>
                    )}
                    <details>
                      <summary>{t(lang, "Formatted text", "格式化文本")}</summary>
                      <div style={{ marginTop: 4, color: "#666" }}>{r.content}</div>
                    </details>
                  </td>
                  <td style={{ minWidth: 260 }}>
                    {r.forwardedAt ? (
                      <div>
                        <div style={{ color: "#087", fontWeight: 700 }}>{t(lang, "Forwarded", "已转发")}</div>
                        <div style={{ fontSize: 12 }}>{new Date(r.forwardedAt).toLocaleString()}</div>
                        <div style={{ fontSize: 12 }}>{r.forwardedBy ?? "-"}</div>
                        <div style={{ fontSize: 12 }}>{r.forwardChannel ?? "-"}</div>
                        <div style={{ fontSize: 12, color: "#666", whiteSpace: "pre-wrap" }}>{r.forwardNote ?? ""}</div>
                      </div>
                    ) : (
                      <form action={markForwarded}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value={status} />
                        <div style={{ display: "grid", gap: 6 }}>
                          <input name="channel" placeholder={t(lang, "Channel (e.g. WeChat)", "渠道（如微信）")} />
                          <textarea name="note" rows={3} placeholder={t(lang, "Forward note", "转发备注")} />
                          <button type="submit">{t(lang, "Mark as Forwarded", "标记已转发")}</button>
                        </div>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
