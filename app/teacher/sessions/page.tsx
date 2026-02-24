import { prisma } from "@/lib/prisma";
import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";

type SessionWithMeta = {
  id: string;
  startAt: Date;
  endAt: Date;
  class: {
    capacity: number;
    oneOnOneStudent: { id: string; name: string } | null;
    enrollments: Array<{ studentId: string; student: { id: string; name: string } }>;
    course: { name: string };
    subject: { name: string } | null;
    level: { name: string } | null;
    campus: { name: string };
    room: { name: string } | null;
  };
  student: { id: string; name: string } | null;
  attendances: Array<{ studentId: string; status: string }>;
  feedbacks: Array<{ isProxyDraft: boolean; status: string }>;
};

function dayKey(d: Date) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

function classLabel(s: SessionWithMeta) {
  return `${s.class.course.name}${s.class.subject ? ` / ${s.class.subject.name}` : ""}${s.class.level ? ` / ${s.class.level.name}` : ""}`;
}

function sessionStudents(s: SessionWithMeta) {
  const cancelledSet = new Set(s.attendances.filter((a) => a.status === "EXCUSED").map((a) => a.studentId));
  if (s.class.capacity === 1) {
    const oneId = s.student?.id ?? s.class.oneOnOneStudent?.id ?? s.class.enrollments[0]?.student?.id ?? null;
    if (oneId && cancelledSet.has(oneId)) return [];
    const one = s.student?.name ?? s.class.oneOnOneStudent?.name ?? s.class.enrollments[0]?.student?.name ?? null;
    return one ? [{ id: oneId ?? one, name: one }] : [];
  }
  return s.class.enrollments
    .filter((e) => !cancelledSet.has(e.studentId))
    .map((e) => ({ id: e.student.id, name: e.student.name }))
    .filter((x) => !!x.name);
}

function attendancePill(marked: number, total: number) {
  if (total <= 0) {
    return { label: "0/0", bg: "#f1f5f9", color: "#334155", border: "#cbd5e1" };
  }
  if (marked >= total) {
    return { label: `${marked}/${total}`, bg: "#dcfce7", color: "#166534", border: "#bbf7d0" };
  }
  if (marked === 0) {
    return { label: `${marked}/${total}`, bg: "#fee2e2", color: "#b91c1c", border: "#fecaca" };
  }
  return { label: `${marked}/${total}`, bg: "#fef3c7", color: "#92400e", border: "#fde68a" };
}

function feedbackMeta(feedback: { isProxyDraft: boolean; status: string } | null, overdue: boolean, lang: string) {
  if (!feedback) {
    if (overdue) {
      return { label: lang === "EN" ? "Overdue" : "已超时", bg: "#fee2e2", color: "#b91c1c", border: "#fecaca" };
    }
    return { label: lang === "EN" ? "Pending" : "待提交", bg: "#fef3c7", color: "#92400e", border: "#fde68a" };
  }
  if (feedback.isProxyDraft) {
    return { label: lang === "EN" ? "Proxy draft" : "代填草稿", bg: "#e0f2fe", color: "#075985", border: "#bae6fd" };
  }
  if (feedback.status === "LATE") {
    return { label: lang === "EN" ? "Late submitted" : "迟交", bg: "#ffedd5", color: "#9a3412", border: "#fed7aa" };
  }
  return { label: lang === "EN" ? "Submitted" : "已提交", bg: "#dcfce7", color: "#166534", border: "#bbf7d0" };
}

export default async function TeacherSessionsPage() {
  const lang = await getLang();
  const { teacher } = await requireTeacherProfile();
  if (!teacher) {
    return <div style={{ color: "#b00" }}>{t(lang, "Teacher profile not linked.", "老师资料未关联。")}</div>;
  }

  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 1);
  const end = new Date(now);
  end.setDate(end.getDate() + 14);

  const sessions = (await prisma.session.findMany({
    where: {
      startAt: { gte: start, lte: end },
      OR: [{ teacherId: teacher.id }, { teacherId: null, class: { teacherId: teacher.id } }],
    },
    include: {
      student: { select: { id: true, name: true } },
      class: {
        include: {
          course: true,
          subject: true,
          level: true,
          campus: true,
          room: true,
          oneOnOneStudent: { select: { id: true, name: true } },
          enrollments: { include: { student: { select: { id: true, name: true } } } },
        },
      },
      attendances: { select: { studentId: true, status: true } },
      feedbacks: { where: { teacherId: teacher.id }, select: { isProxyDraft: true, status: true } },
    },
    orderBy: { startAt: "asc" },
    take: 300,
  })) as SessionWithMeta[];

  const grouped = new Map<string, SessionWithMeta[]>();
  for (const s of sessions) {
    const key = dayKey(s.startAt);
    const list = grouped.get(key) ?? [];
    list.push(s);
    grouped.set(key, list);
  }

  const dayRows = Array.from(grouped.entries()).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <h2 style={{ marginBottom: 0 }}>{t(lang, "My Sessions", "我的课次")}</h2>
      <div style={{ color: "#64748b", fontSize: 12 }}>
        {t(lang, "Timeline view for the next 14 days and recent sessions.", "按履历时间轴展示最近和未来14天课次。")}
      </div>

      {sessions.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No sessions in range.", "当前范围内没有课次。")}</div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {dayRows.map(([day, items]) => (
            <section key={day} style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff" }}>
              <div
                style={{
                  padding: "10px 12px",
                  borderBottom: "1px solid #eef2f7",
                  background: "linear-gradient(90deg, #f8fafc 0%, #ffffff 100%)",
                  fontWeight: 700,
                }}
              >
                {new Date(`${day}T00:00:00`).toLocaleDateString()} ({items.length})
              </div>

              <div style={{ padding: 12 }}>
                {items.map((s, idx) => {
                  const students = sessionStudents(s);
                  const studentNames = students.map((x) => x.name);
                  const statusByStudentId = new Map(s.attendances.map((a) => [a.studentId, a.status]));
                  const total = students.length;
                  const marked = students.filter((st) => (statusByStudentId.get(st.id) ?? "UNMARKED") !== "UNMARKED").length;
                  const feedback = s.feedbacks[0] ?? null;
                  const overdue = new Date() > new Date(new Date(s.endAt).getTime() + 12 * 60 * 60 * 1000);
                  const att = attendancePill(marked, total);
                  const fb = feedbackMeta(feedback, overdue, lang);

                  return (
                    <div key={s.id} style={{ display: "grid", gridTemplateColumns: "30px 1fr", gap: 10, marginBottom: idx === items.length - 1 ? 0 : 12 }}>
                      <div style={{ display: "grid", justifyItems: "center" }}>
                        <span style={{ width: 12, height: 12, borderRadius: 999, background: "#3b82f6", marginTop: 6 }} />
                        {idx === items.length - 1 ? null : <span style={{ width: 2, height: "100%", background: "#dbeafe", marginTop: 4 }} />}
                      </div>

                      <article
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: 12,
                          padding: 12,
                          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ fontWeight: 700 }}>
                            {new Date(s.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {" - "}
                            {new Date(s.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <a href={`/teacher/sessions/${s.id}`} style={{ color: "#1d4ed8", fontWeight: 600 }}>
                            {t(lang, "Open", "打开")}
                          </a>
                        </div>

                        <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <ClassTypeBadge capacity={s.class.capacity} compact />
                          <span>{classLabel(s)}</span>
                        </div>
                        <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                          {s.class.campus.name}
                          {s.class.room ? ` / ${s.class.room.name}` : ""}
                        </div>
                        <div style={{ color: "#0f766e", fontSize: 12, marginTop: 2 }}>
                          {t(lang, "Students", "学生")}: {studentNames.length > 0 ? studentNames.join(", ") : "-"}
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: att.bg,
                              color: att.color,
                              border: `1px solid ${att.border}`,
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {t(lang, "Attendance", "点名")}: {att.label}
                          </span>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: fb.bg,
                              color: fb.color,
                              border: `1px solid ${fb.border}`,
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {t(lang, "Feedback", "反馈")}: {fb.label}
                          </span>
                        </div>
                      </article>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}





