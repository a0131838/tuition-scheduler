import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import {
  acknowledgeManagerTeacherFeedback,
  categoryLabel,
  getTeacherManagerFeedbackState,
} from "@/lib/manager-teacher-feedback";

function cardStyle(background: string, border: string) {
  return {
    border: `1px solid ${border}`,
    borderRadius: 14,
    padding: 14,
    background,
    display: "grid",
    gap: 8,
  } as const;
}

async function acknowledgeAction(formData: FormData) {
  "use server";
  const { user, teacher } = await requireTeacherProfile();
  if (!teacher) redirect("/teacher?err=Teacher+profile+not+linked");
  await acknowledgeManagerTeacherFeedback({
    feedbackId: String(formData.get("feedbackId") ?? ""),
    teacherId: teacher.id,
    userId: user.id,
  });
  revalidatePath("/teacher");
  revalidatePath("/teacher/manager-feedback");
  redirect("/teacher/manager-feedback?ack=1");
}

export default async function TeacherManagerFeedbackPage({
  searchParams,
}: {
  searchParams?: Promise<{ ack?: string }>;
}) {
  const lang = await getLang();
  const { teacher } = await requireTeacherProfile();
  const sp = await searchParams;

  if (!teacher) {
    return (
      <div>
        <h2>{t(lang, "Teacher Profile Not Linked", "老师资料未关联")}</h2>
        <p style={{ color: "#b00" }}>
          {t(lang, "Ask admin to link your teacher account before viewing manager feedback.", "请先联系管理把老师账号和老师档案关联。")}
        </p>
      </div>
    );
  }

  const state = await getTeacherManagerFeedbackState(teacher.id);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={cardStyle("linear-gradient(135deg, #eef2ff 0%, #ffffff 100%)", "#c7d2fe")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{t(lang, "Manager Feedback", "管理反馈")}</div>
            <div style={{ color: "#475569", marginTop: 4 }}>
              {t(lang, "Private quality comments from management for your teaching work.", "管理给你的内部课堂质量反馈。")}
            </div>
          </div>
          <a href="/teacher">{t(lang, "Back to dashboard", "返回工作台")}</a>
        </div>
      </section>

      {sp?.ack === "1" ? (
        <section style={cardStyle("#f0fdf4", "#bbf7d0")}>{t(lang, "Acknowledgement saved.", "已确认知悉。")}</section>
      ) : null}

      <section style={cardStyle("#ffffff", "#e2e8f0")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <strong>{t(lang, "Pending acknowledgement", "待确认")}</strong>
          <span style={{ color: state.pendingAckCount > 0 ? "#b45309" : "#166534", fontWeight: 800 }}>
            {state.pendingAckCount}
          </span>
        </div>
      </section>

      {state.feedbacks.length === 0 ? (
        <section style={cardStyle("#f8fafc", "#e2e8f0")}>{t(lang, "No manager feedback right now.", "目前没有管理反馈。")}</section>
      ) : (
        state.feedbacks.map((feedback) => {
          const pendingAck = feedback.requiresAck && !feedback.acknowledgedAt;
          return (
            <section key={feedback.id} style={cardStyle(pendingAck ? "#fffbeb" : "#ffffff", pendingAck ? "#f59e0b" : "#e2e8f0")}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 800 }}>{categoryLabel(feedback.category, lang)}</div>
                <div style={{ color: pendingAck ? "#b45309" : "#166534", fontSize: 12, fontWeight: 800 }}>
                  {pendingAck
                    ? t(lang, "Needs acknowledgement", "需确认")
                    : feedback.acknowledgedAt
                      ? t(lang, "Acknowledged", "已确认")
                      : t(lang, "Read-only", "无需确认")}
                </div>
              </div>
              <div style={{ color: "#64748b", fontSize: 12 }}>
                {t(lang, "Sent", "发送时间")}: {feedback.createdAt}
                {feedback.managerName ? ` · ${t(lang, "By", "来自")}: ${feedback.managerName}` : ""}
              </div>
              {feedback.sessionSummary ? <div style={{ color: "#475569", fontSize: 13 }}>{feedback.sessionSummary}</div> : null}
              <div style={{ color: "#334155", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{feedback.body}</div>
              {feedback.acknowledgedAt ? (
                <div style={{ color: "#166534", fontSize: 12 }}>
                  {t(lang, "Acknowledged at", "确认时间")}: {feedback.acknowledgedAt}
                </div>
              ) : null}
              {pendingAck ? (
                <form action={acknowledgeAction}>
                  <input type="hidden" name="feedbackId" value={feedback.id} />
                  <button
                    type="submit"
                    style={{
                      border: "1px solid #4f46e5",
                      background: "#4f46e5",
                      color: "#ffffff",
                      borderRadius: 8,
                      padding: "9px 12px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {t(lang, "Acknowledge", "确认知悉")}
                  </button>
                </form>
              ) : null}
            </section>
          );
        })
      )}
    </div>
  );
}
