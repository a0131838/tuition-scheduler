import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

type FeedbackFlatRow = {
  feedbackId: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  submittedAt: Date;
  content: string;
  classPerformance: string | null;
  homework: string | null;
  sessionStartAt: Date;
  sessionEndAt: Date;
  attendanceStatus: string;
  courseName: string;
  subjectName: string | null;
  levelName: string | null;
  campusName: string;
  roomName: string | null;
};

function parseDateRange(fromRaw?: string, toRaw?: string) {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 30);
  const from = fromRaw ? new Date(fromRaw) : defaultFrom;
  const to = toRaw ? new Date(toRaw) : now;
  const safeFrom = Number.isNaN(from.getTime()) ? defaultFrom : from;
  const safeTo = Number.isNaN(to.getTime()) ? now : to;
  const dayEnd = new Date(safeTo);
  dayEnd.setHours(23, 59, 59, 999);
  return { from: safeFrom, to: dayEnd };
}

function textMatch(row: FeedbackFlatRow, q: string) {
  if (!q) return true;
  const m = q.toLowerCase();
  const bag = [
    row.studentName,
    row.teacherName,
    row.content,
    row.courseName,
    row.subjectName ?? "",
    row.levelName ?? "",
    row.campusName,
    row.roomName ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return bag.includes(m);
}

function summarize(content: string, max = 80) {
  const s = (content ?? "").trim().replace(/\s+/g, " ");
  if (!s) return "-";
  if (s.length <= max) return s;
  return `${s.slice(0, max)}...`;
}

export default async function TeacherStudentFeedbacksPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    from?: string;
    to?: string;
    onlyOthers?: string;
    handoffRisk?: string;
    studentId?: string;
    page?: string;
  }>;
}) {
  const lang = await getLang();
  const { teacher, user } = await requireTeacherProfile();
  if (!teacher) {
    return <div style={{ color: "#b00" }}>{t(lang, "Teacher profile not linked.", "老师资料未关联。")}</div>;
  }

  const sp = await searchParams;
  const q = String(sp?.q ?? "").trim();
  const onlyOthers = String(sp?.onlyOthers ?? "") === "1";
  const handoffRisk = String(sp?.handoffRisk ?? "") === "1";
  const selectedStudentId = String(sp?.studentId ?? "").trim();
  const page = Math.max(1, Number(sp?.page ?? 1) || 1);
  const pageSize = 20;
  const { from, to } = parseDateRange(sp?.from, sp?.to);

  const taughtRows = await prisma.attendance.findMany({
    where: {
      session: {
        OR: [{ teacherId: teacher.id }, { teacherId: null, class: { teacherId: teacher.id } }],
      },
    },
    select: { studentId: true },
    distinct: ["studentId"],
  });
  const taughtStudentIds = taughtRows.map((x) => x.studentId);

  if (taughtStudentIds.length === 0) {
    return (
      <div>
        <h2>{t(lang, "Student Feedbacks", "学生课后反馈")}</h2>
        <div style={{ color: "#64748b" }}>
          {t(
            lang,
            "No students linked to your sessions yet.",
            "你当前还没有授课关系学生，暂无可查看反馈。"
          )}
        </div>
      </div>
    );
  }

  const feedbacks = await prisma.sessionFeedback.findMany({
    where: {
      submittedAt: { gte: from, lte: to },
      ...(onlyOthers ? { teacherId: { not: teacher.id } } : {}),
      session: {
        attendances: {
          some: {
            studentId: { in: taughtStudentIds },
          },
        },
      },
    },
    include: {
      teacher: { select: { id: true, name: true } },
      session: {
        select: {
          startAt: true,
          endAt: true,
          class: {
            select: {
              course: { select: { name: true } },
              subject: { select: { name: true } },
              level: { select: { name: true } },
              campus: { select: { name: true } },
              room: { select: { name: true } },
            },
          },
          attendances: {
            where: { studentId: { in: taughtStudentIds } },
            select: {
              status: true,
              student: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
    take: 3000,
  });

  const flat: FeedbackFlatRow[] = [];
  for (const fb of feedbacks) {
    for (const a of fb.session.attendances) {
      flat.push({
        feedbackId: fb.id,
        studentId: a.student.id,
        studentName: a.student.name,
        teacherId: fb.teacher.id,
        teacherName: fb.teacher.name,
        submittedAt: fb.submittedAt,
        content: fb.content ?? "",
        classPerformance: fb.classPerformance ?? null,
        homework: fb.homework ?? null,
        sessionStartAt: fb.session.startAt,
        sessionEndAt: fb.session.endAt,
        attendanceStatus: a.status,
        courseName: fb.session.class.course.name,
        subjectName: fb.session.class.subject?.name ?? null,
        levelName: fb.session.class.level?.name ?? null,
        campusName: fb.session.class.campus.name,
        roomName: fb.session.class.room?.name ?? null,
      });
    }
  }

  const filtered = flat.filter((r) => textMatch(r, q));

  const selectedOtherFeedbackIds = selectedStudentId
    ? Array.from(
        new Set(
          filtered
            .filter((r) => r.studentId === selectedStudentId && r.teacherId !== teacher.id)
            .map((r) => r.feedbackId)
        )
      )
    : [];
  if (selectedOtherFeedbackIds.length > 0) {
    await prisma.teacherFeedbackRead.createMany({
      data: selectedOtherFeedbackIds.map((feedbackId) => ({
        userId: user.id,
        feedbackId,
        studentId: selectedStudentId,
      })),
      skipDuplicates: true,
    });
  }

  const uniqueFeedbackIds = Array.from(new Set(filtered.map((r) => r.feedbackId)));
  const readRows =
    uniqueFeedbackIds.length > 0
      ? await prisma.teacherFeedbackRead.findMany({
          where: { userId: user.id, feedbackId: { in: uniqueFeedbackIds } },
          select: { feedbackId: true },
        })
      : [];
  const readSet = new Set(readRows.map((x) => x.feedbackId));

  const recentThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const byStudent = new Map<
    string,
    {
      studentId: string;
      studentName: string;
      latest: FeedbackFlatRow;
      count: number;
      unreadOtherCount: number;
      hasHandoffRisk: boolean;
    }
  >();

  for (const r of filtered) {
    const isUnreadOther = r.teacherId !== teacher.id && !readSet.has(r.feedbackId);
    const isRisk = isUnreadOther && r.sessionStartAt >= recentThreshold;
    const cur = byStudent.get(r.studentId);
    if (!cur) {
      byStudent.set(r.studentId, {
        studentId: r.studentId,
        studentName: r.studentName,
        latest: r,
        count: 1,
        unreadOtherCount: isUnreadOther ? 1 : 0,
        hasHandoffRisk: isRisk,
      });
      continue;
    }
    cur.count += 1;
    if (isUnreadOther) cur.unreadOtherCount += 1;
    if (isRisk) cur.hasHandoffRisk = true;
    if (r.submittedAt > cur.latest.submittedAt) cur.latest = r;
  }

  const students = Array.from(byStudent.values())
    .filter((s) => (handoffRisk ? s.hasHandoffRisk : true))
    .sort((a, b) => {
      if (a.hasHandoffRisk !== b.hasHandoffRisk) return a.hasHandoffRisk ? -1 : 1;
      if (a.unreadOtherCount !== b.unreadOtherCount) return b.unreadOtherCount - a.unreadOtherCount;
      return b.latest.submittedAt.getTime() - a.latest.submittedAt.getTime();
    });

  const totalStudents = students.length;
  const totalPages = Math.max(1, Math.ceil(totalStudents / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pageStudents = students.slice(startIdx, startIdx + pageSize);

  const selectedTimeline = selectedStudentId
    ? filtered
        .filter((x) => x.studentId === selectedStudentId)
        .sort((a, b) => b.sessionStartAt.getTime() - a.sessionStartAt.getTime())
    : [];

  const queryBase = `q=${encodeURIComponent(q)}&from=${encodeURIComponent(
    sp?.from ?? from.toISOString().slice(0, 10)
  )}&to=${encodeURIComponent(sp?.to ?? to.toISOString().slice(0, 10))}&onlyOthers=${
    onlyOthers ? "1" : "0"
  }&handoffRisk=${handoffRisk ? "1" : "0"}`;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <h2 style={{ marginBottom: 0 }}>{t(lang, "Student Feedbacks", "学生课后反馈")}</h2>
      <div style={{ color: "#64748b", fontSize: 12 }}>
        {t(
          lang,
          "View follow-up notes across all teachers for your students.",
          "查看你授课学生在所有老师下的课后跟进反馈。"
        )}
      </div>

      <form method="GET" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          name="q"
          defaultValue={q}
          placeholder={t(lang, "Search student / teacher / course / content", "搜索学生/老师/课程/反馈内容")}
          style={{ width: 320 }}
        />
        <label>
          {t(lang, "From", "开始")}:
          <input name="from" type="date" defaultValue={sp?.from ?? from.toISOString().slice(0, 10)} style={{ marginLeft: 6 }} />
        </label>
        <label>
          {t(lang, "To", "结束")}:
          <input name="to" type="date" defaultValue={sp?.to ?? to.toISOString().slice(0, 10)} style={{ marginLeft: 6 }} />
        </label>
        <label style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
          <input type="checkbox" name="onlyOthers" value="1" defaultChecked={onlyOthers} />
          {t(lang, "Only other teachers", "仅看其他老师")}
        </label>
        <label style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
          <input type="checkbox" name="handoffRisk" value="1" defaultChecked={handoffRisk} />
          {t(lang, "Only handoff risks (7d unread)", "仅看交接风险（7天未读）")}
        </label>
        <button type="submit">{t(lang, "Apply", "应用")}</button>
      </form>

      <div style={{ color: "#334155" }}>
        {t(lang, "Students", "学生")}:
        <b> {totalStudents}</b> | {t(lang, "Feedback entries", "反馈条数")}:
        <b> {filtered.length}</b>
      </div>

      {totalStudents === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No matching feedbacks.", "没有匹配的反馈记录。")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Student", "学生")}</th>
              <th align="left">{t(lang, "Latest Session", "最近课次")}</th>
              <th align="left">{t(lang, "Latest Teacher", "最近反馈老师")}</th>
              <th align="left">{t(lang, "Summary", "摘要")}</th>
              <th align="left">{t(lang, "Entries", "条数")}</th>
              <th align="left">{t(lang, "Unread (others)", "他人未读")}</th>
              <th align="left">{t(lang, "Action", "操作")}</th>
            </tr>
          </thead>
          <tbody>
            {pageStudents.map((s) => (
              <tr key={s.studentId} style={{ borderTop: "1px solid #eee" }}>
                <td>{s.studentName}</td>
                <td>{new Date(s.latest.sessionStartAt).toLocaleString()}</td>
                <td>
                  {s.latest.teacherName}
                  {s.latest.teacherId !== teacher.id ? (
                    <span style={{ marginLeft: 6, fontSize: 11, color: "#b45309" }}>
                      {t(lang, "(Substitute)", "（其他老师）")}
                    </span>
                  ) : null}
                </td>
                <td>{summarize(s.latest.content)}</td>
                <td>{s.count}</td>
                <td>
                  <span style={{ fontWeight: 700, color: s.unreadOtherCount > 0 ? "#b91c1c" : "#64748b" }}>
                    {s.unreadOtherCount}
                  </span>
                  {s.hasHandoffRisk ? (
                    <span style={{ marginLeft: 6, color: "#9a3412", fontSize: 11 }}>
                      {t(lang, "Risk", "风险")}
                    </span>
                  ) : null}
                </td>
                <td>
                  <a href={`/teacher/student-feedbacks?${queryBase}&studentId=${encodeURIComponent(s.studentId)}&page=${safePage}`}>
                    {t(lang, "Open Timeline", "查看时间线")}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalPages > 1 ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span>
            {t(lang, "Page", "页码")} {safePage}/{totalPages}
          </span>
          {safePage > 1 ? (
            <a href={`/teacher/student-feedbacks?${queryBase}&page=${safePage - 1}`}>{t(lang, "Prev", "上一页")}</a>
          ) : null}
          {safePage < totalPages ? (
            <a href={`/teacher/student-feedbacks?${queryBase}&page=${safePage + 1}`}>{t(lang, "Next", "下一页")}</a>
          ) : null}
        </div>
      ) : null}

      {selectedStudentId ? (
        <section style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>{t(lang, "Feedback Timeline", "反馈时间线")}</h3>
            <a href={`/teacher/student-feedbacks?${queryBase}&page=${safePage}`}>{t(lang, "Close", "关闭")}</a>
          </div>
          {selectedTimeline.length === 0 ? (
            <div style={{ color: "#999", marginTop: 8 }}>{t(lang, "No feedback timeline.", "暂无反馈时间线。")}</div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {selectedTimeline.slice(0, 150).map((item) => (
                <article key={`${item.feedbackId}-${item.studentId}`} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700 }}>
                      {new Date(item.sessionStartAt).toLocaleString()} -{" "}
                      {new Date(item.sessionEndAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div>
                      {item.teacherName}
                      {item.teacherId !== teacher.id ? (
                        <span style={{ marginLeft: 6, color: "#b45309", fontSize: 12 }}>
                          {t(lang, "(Other Teacher)", "（其他老师）")}
                        </span>
                      ) : null}
                      {item.teacherId !== teacher.id && !readSet.has(item.feedbackId) ? (
                        <span style={{ marginLeft: 6, color: "#b91c1c", fontSize: 12, fontWeight: 700 }}>
                          {t(lang, "NEW", "未读")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>
                    {item.courseName} / {item.subjectName ?? "-"} / {item.levelName ?? "-"} | {item.campusName}
                    {item.roomName ? ` / ${item.roomName}` : ""}
                  </div>
                  <div style={{ color: "#0f766e", fontSize: 12, marginTop: 2 }}>
                    {t(lang, "Attendance", "出勤")}: {item.attendanceStatus}
                  </div>
                  <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{item.content || "-"}</div>
                  <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
                    {item.classPerformance ? `${t(lang, "Performance", "课堂表现")}: ${item.classPerformance} | ` : ""}
                    {item.homework ? `${t(lang, "Homework", "作业")}: ${item.homework} | ` : ""}
                    {t(lang, "Submitted", "提交")}: {new Date(item.submittedAt).toLocaleString()}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

