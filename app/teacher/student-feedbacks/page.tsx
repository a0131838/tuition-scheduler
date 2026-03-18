import { requireTeacherProfile } from "@/lib/auth";
import { formatDateOnly } from "@/lib/date-only";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  const from = fromRaw ? new Date(`${fromRaw}T00:00:00`) : defaultFrom;
  const to = toRaw ? new Date(`${toRaw}T00:00:00`) : now;
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

function summarizeHandoffItem(x: FeedbackFlatRow) {
  const parts: string[] = [];
  if (x.classPerformance) parts.push(`课堂:${summarize(x.classPerformance, 24)}`);
  if (x.homework) parts.push(`作业:${summarize(x.homework, 24)}`);
  if (!x.classPerformance && !x.homework) parts.push(`反馈:${summarize(x.content, 36)}`);
  return parts.join(" | ");
}

async function markFeedbackReadAction(formData: FormData) {
  "use server";
  const { user, teacher } = await requireTeacherProfile();
  if (!teacher) redirect("/teacher/student-feedbacks?err=teacher-not-linked");

  const feedbackId = String(formData.get("feedbackId") ?? "").trim();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const back = String(formData.get("back") ?? "/teacher/student-feedbacks").trim();
  if (!feedbackId || !studentId) redirect(`${back}${back.includes("?") ? "&" : "?"}err=missing-ids`);

  await prisma.teacherFeedbackRead.createMany({
    data: [{ userId: user.id, feedbackId, studentId }],
    skipDuplicates: true,
  });

  await logAudit({
    actor: user,
    module: "TEACHER_FEEDBACK",
    action: "MARK_READ",
    entityType: "SessionFeedback",
    entityId: feedbackId,
    meta: { feedbackId, studentId, teacherId: teacher.id },
  });

  revalidatePath("/teacher/student-feedbacks");
  redirect(`${back}${back.includes("?") ? "&" : "?"}msg=marked-read`);
}

export default async function TeacherStudentFeedbacksPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    from?: string;
    to?: string;
    onlyOthers?: string;
    onlyUnreadOthers?: string;
    handoffRisk?: string;
    studentId?: string;
    page?: string;
    msg?: string;
    err?: string;
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
  const onlyUnreadOthers = String(sp?.onlyUnreadOthers ?? "") === "1";
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
          {t(lang, "No students linked to your sessions yet.", "你当前还没有授课关系学生，暂无可查看反馈。")}
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

  const flatAll: FeedbackFlatRow[] = [];
  for (const fb of feedbacks) {
    for (const a of fb.session.attendances) {
      flatAll.push({
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

  const textFiltered = flatAll.filter((r) => textMatch(r, q));

  const uniqueFeedbackIds = Array.from(new Set(textFiltered.map((r) => r.feedbackId)));
  const readRows =
    uniqueFeedbackIds.length > 0
      ? await prisma.teacherFeedbackRead.findMany({
          where: { userId: user.id, feedbackId: { in: uniqueFeedbackIds } },
          select: { feedbackId: true },
        })
      : [];
  const readSet = new Set(readRows.map((x) => x.feedbackId));

  const selectedOtherFeedbackIds = selectedStudentId
    ? Array.from(
        new Set(
          textFiltered
            .filter((r) => r.studentId === selectedStudentId && r.teacherId !== teacher.id && !readSet.has(r.feedbackId))
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
    for (const id of selectedOtherFeedbackIds) readSet.add(id);

    await logAudit({
      actor: user,
      module: "TEACHER_FEEDBACK",
      action: "READ_TIMELINE_AUTO_MARK",
      entityType: "Student",
      entityId: selectedStudentId,
      meta: {
        studentId: selectedStudentId,
        feedbackCount: selectedOtherFeedbackIds.length,
        feedbackIds: selectedOtherFeedbackIds,
      },
    });
  }

  const visible = textFiltered.filter((r) => {
    if (!onlyUnreadOthers) return true;
    return r.teacherId !== teacher.id && !readSet.has(r.feedbackId);
  });

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

  for (const r of visible) {
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

  const selectedTimelineAll = selectedStudentId
    ? textFiltered
        .filter((x) => x.studentId === selectedStudentId)
        .sort((a, b) => b.sessionStartAt.getTime() - a.sessionStartAt.getTime())
    : [];
  const selectedTimeline = onlyUnreadOthers
    ? selectedTimelineAll.filter((x) => x.teacherId !== teacher.id && !readSet.has(x.feedbackId))
    : selectedTimelineAll;
  const selectedTimelineHead = selectedTimeline.slice(0, 3);
  const selectedTimelineRest = selectedTimeline.slice(3);

  const summaryItems = selectedTimelineAll
    .filter((x) => x.teacherId !== teacher.id && x.sessionStartAt >= recentThreshold)
    .slice(0, 3);
  const latestMine = selectedTimelineAll.find((x) => x.teacherId === teacher.id) ?? null;
  const latestOther = selectedTimelineAll.find((x) => x.teacherId !== teacher.id) ?? null;

  const queryBase = `q=${encodeURIComponent(q)}&from=${encodeURIComponent(
    sp?.from ?? formatDateOnly(from)
  )}&to=${encodeURIComponent(sp?.to ?? formatDateOnly(to))}&onlyOthers=${
    onlyOthers ? "1" : "0"
  }&onlyUnreadOthers=${onlyUnreadOthers ? "1" : "0"}&handoffRisk=${handoffRisk ? "1" : "0"}`;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <style>{`
        .filter-bar {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .page-shell.with-drawer {
          padding-right: 0;
        }
        .desktop-only { display: block; }
        .mobile-only { display: none; }
        .compare-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .read-btn {
          min-height: 34px;
          padding: 6px 10px;
        }
        .timeline-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.18);
          z-index: 60;
        }
        .timeline-drawer {
          position: fixed;
          top: 10px;
          right: 10px;
          bottom: 10px;
          width: min(520px, calc(100vw - 20px));
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
          overflow: auto;
          z-index: 70;
          animation: timelinePulse 0.7s ease-out 1;
          box-shadow: 0 10px 32px rgba(2, 6, 23, 0.2);
        }
        .drawer-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .drawer-action {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #f8fafc;
          padding: 4px 8px;
          font-size: 12px;
          text-decoration: none;
          color: #0f172a;
        }
        .drawer-float-top {
          position: sticky;
          bottom: 8px;
          margin-left: auto;
          width: fit-content;
          z-index: 3;
        }
        @keyframes timelinePulse {
          0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.45); }
          100% { box-shadow: 0 10px 32px rgba(2, 6, 23, 0.2); }
        }
        @media (min-width: 901px) {
          .page-shell.with-drawer {
            padding-right: 540px;
          }
        }
        @media (max-width: 900px) {
          .filter-bar {
            flex-direction: column;
            align-items: stretch;
          }
          .search-input {
            width: 100% !important;
          }
          .desktop-only {
            display: none !important;
          }
          .mobile-only {
            display: grid !important;
            gap: 8px;
          }
          .compare-grid {
            grid-template-columns: 1fr;
          }
          .timeline-head {
            flex-direction: column;
            align-items: flex-start;
          }
          .read-btn {
            width: 100%;
          }
          .timeline-overlay {
            background: rgba(15, 23, 42, 0.25);
          }
          .timeline-drawer {
            top: auto;
            right: 0;
            left: 0;
            bottom: 0;
            width: 100%;
            height: min(78vh, 680px);
            border-radius: 14px 14px 0 0;
            padding-bottom: 18px;
          }
        }
      `}</style>
      <div className={`page-shell${selectedStudentId ? " with-drawer" : ""}`} style={{ display: "grid", gap: 14 }}>
      <h2 id="feedback-list-top" style={{ marginBottom: 0 }}>{t(lang, "Student Feedbacks", "学生课后反馈")}</h2>
      {sp?.msg === "marked-read" ? <div style={{ color: "#166534" }}>{t(lang, "Marked as read.", "已标记为已读。")}</div> : null}
      {sp?.err ? <div style={{ color: "#b91c1c" }}>{t(lang, "Error", "错误")}: {sp.err}</div> : null}

      <form method="GET" className="filter-bar ts-filter-bar">
        <input
          name="q"
          defaultValue={q}
          placeholder={t(lang, "Search student / teacher / course / content", "搜索学生/老师/课程/反馈内容")}
          className="search-input"
          style={{ width: 320 }}
        />
        <label>
          {t(lang, "From", "开始")}:
          <input name="from" type="date" defaultValue={sp?.from ?? formatDateOnly(from)} style={{ marginLeft: 6 }} />
        </label>
        <label>
          {t(lang, "To", "结束")}:
          <input name="to" type="date" defaultValue={sp?.to ?? formatDateOnly(to)} style={{ marginLeft: 6 }} />
        </label>
        <label style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
          <input type="checkbox" name="onlyOthers" value="1" defaultChecked={onlyOthers} />
          {t(lang, "Only other teachers", "仅看其他老师")}
        </label>
        <label style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
          <input type="checkbox" name="onlyUnreadOthers" value="1" defaultChecked={onlyUnreadOthers} />
          {t(lang, "Only unread others", "仅看他人未读反馈")}
        </label>
        <label style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
          <input type="checkbox" name="handoffRisk" value="1" defaultChecked={handoffRisk} />
          {t(lang, "Only handoff risks (7d unread)", "仅看交接风险（7天未读）")}
        </label>
        <button type="submit" data-apply-submit="1">{t(lang, "Apply", "应用")}</button>
      </form>

      <div style={{ color: "#334155" }}>
        {t(lang, "Students", "学生")}: <b>{totalStudents}</b> | {t(lang, "Feedback entries", "反馈条数")}: <b>{visible.length}</b>
      </div>

      {totalStudents === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No matching feedbacks.", "没有匹配的反馈记录。")}</div>
      ) : (
        <>
          <div className="desktop-only table-scroll">
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
                  <tr id={`student-${s.studentId}`} key={s.studentId} style={{ borderTop: "1px solid #eee" }}>
                    <td>{s.studentName}</td>
                    <td>{new Date(s.latest.sessionStartAt).toLocaleString()}</td>
                    <td>
                      {s.latest.teacherName}
                      {s.latest.teacherId !== teacher.id ? (
                        <span style={{ marginLeft: 6, fontSize: 11, color: "#b45309" }}>{t(lang, "(Other)", "（其他老师）")}</span>
                      ) : null}
                    </td>
                    <td>{summarize(s.latest.content)}</td>
                    <td>{s.count}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: s.unreadOtherCount > 0 ? "#b91c1c" : "#64748b" }}>{s.unreadOtherCount}</span>
                      {s.hasHandoffRisk ? <span style={{ marginLeft: 6, color: "#9a3412", fontSize: 11 }}>{t(lang, "Risk", "风险")}</span> : null}
                    </td>
                    <td>
                      <a href={`/teacher/student-feedbacks?${queryBase}&studentId=${encodeURIComponent(s.studentId)}&page=${safePage}#timeline-drawer`}>
                        {t(lang, "Open Timeline", "查看时间线")}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mobile-only">
            {pageStudents.map((s) => (
              <article id={`student-${s.studentId}`} key={s.studentId} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <b>{s.studentName}</b>
                  <span style={{ color: s.unreadOtherCount > 0 ? "#b91c1c" : "#64748b", fontWeight: 700 }}>
                    {t(lang, "Unread", "未读")}: {s.unreadOtherCount}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                  {t(lang, "Latest", "最近")}: {new Date(s.latest.sessionStartAt).toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
                  {t(lang, "Teacher", "老师")}: {s.latest.teacherName}
                </div>
                <div style={{ marginTop: 4 }}>{summarize(s.latest.content, 90)}</div>
                <div style={{ marginTop: 8 }}>
                  <a href={`/teacher/student-feedbacks?${queryBase}&studentId=${encodeURIComponent(s.studentId)}&page=${safePage}#timeline-drawer`}>
                    {t(lang, "Open Timeline", "查看时间线")}
                  </a>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {totalPages > 1 ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span>{t(lang, "Page", "页码")} {safePage}/{totalPages}</span>
          {safePage > 1 ? <a href={`/teacher/student-feedbacks?${queryBase}&page=${safePage - 1}`}>{t(lang, "Prev", "上一页")}</a> : null}
          {safePage < totalPages ? <a href={`/teacher/student-feedbacks?${queryBase}&page=${safePage + 1}`}>{t(lang, "Next", "下一页")}</a> : null}
        </div>
      ) : null}

      {selectedStudentId ? (
        <>
        <a
          className="timeline-overlay ts-drawer-overlay"
          href={`/teacher/student-feedbacks?${queryBase}&page=${safePage}`}
          aria-label={t(lang, "Close timeline", "关闭时间线")}
        />
        <section id="timeline-drawer" className="timeline-drawer ts-drawer">
          <div id="timeline-top" />
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>
              {t(lang, "Feedback Timeline", "反馈时间线")}
              {selectedTimelineAll[0] ? ` - ${selectedTimelineAll[0].studentName}` : ""}
            </h3>
            <div className="drawer-actions">
              <a className="drawer-action" href={`/teacher/student-feedbacks?${queryBase}&page=${safePage}#student-${encodeURIComponent(selectedStudentId)}`}>
                {t(lang, "Back to List", "回到列表")}
              </a>
              <a className="drawer-action" href="#timeline-top">
                {t(lang, "Top", "回到顶部")}
              </a>
              <a className="drawer-action" href={`/teacher/student-feedbacks?${queryBase}&page=${safePage}`}>{t(lang, "Close", "关闭")}</a>
            </div>
          </div>

          <div style={{ marginTop: 10, border: "1px solid #fde68a", background: "#fffbeb", borderRadius: 8, padding: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{t(lang, "Handoff Summary (last 7 days)", "交接摘要（近7天）")}</div>
            {summaryItems.length === 0 ? (
              <div style={{ color: "#6b7280" }}>{t(lang, "No recent cross-teacher items.", "近7天无他人老师交接反馈。")}</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {summaryItems.map((x) => (
                  <li key={`${x.feedbackId}-${x.sessionStartAt.toISOString()}`}>
                    {new Date(x.sessionStartAt).toLocaleDateString()} {x.teacherName}: {summarizeHandoffItem(x)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ marginTop: 10, border: "1px solid #dbeafe", background: "#f8fbff", borderRadius: 8, padding: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{t(lang, "Latest Feedback Compare", "最近反馈对比")}</div>
            <div className="compare-grid">
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{t(lang, "Mine", "我的")}</div>
                {latestMine ? (
                  <>
                    <div>{latestMine.teacherName} | {new Date(latestMine.sessionStartAt).toLocaleString()}</div>
                    <div style={{ color: "#475569", fontSize: 12 }}>{latestMine.courseName} / {latestMine.subjectName ?? "-"} / {latestMine.levelName ?? "-"}</div>
                    <div style={{ marginTop: 4 }}>{summarize(latestMine.content, 140)}</div>
                  </>
                ) : (
                  <div style={{ color: "#94a3b8" }}>{t(lang, "No own feedback found.", "暂无你的反馈。")}</div>
                )}
              </div>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{t(lang, "Other Teacher", "其他老师")}</div>
                {latestOther ? (
                  <>
                    <div>{latestOther.teacherName} | {new Date(latestOther.sessionStartAt).toLocaleString()}</div>
                    <div style={{ color: "#475569", fontSize: 12 }}>{latestOther.courseName} / {latestOther.subjectName ?? "-"} / {latestOther.levelName ?? "-"}</div>
                    <div style={{ marginTop: 4 }}>{summarize(latestOther.content, 140)}</div>
                  </>
                ) : (
                  <div style={{ color: "#94a3b8" }}>{t(lang, "No cross-teacher feedback found.", "暂无其他老师反馈。")}</div>
                )}
              </div>
            </div>
          </div>

          {selectedTimeline.length === 0 ? (
            <div style={{ color: "#999", marginTop: 8 }}>{t(lang, "No feedback timeline.", "暂无反馈时间线。")}</div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {selectedTimelineHead.map((item) => {
                const isOtherUnread = item.teacherId !== teacher.id && !readSet.has(item.feedbackId);
                return (
                  <article key={`${item.feedbackId}-${item.studentId}`} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
                    <div className="timeline-head" style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>
                        {new Date(item.sessionStartAt).toLocaleString()} - {new Date(item.sessionEndAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span>
                          {item.teacherName}
                          {item.teacherId !== teacher.id ? <span style={{ marginLeft: 6, color: "#b45309", fontSize: 12 }}>{t(lang, "(Other)", "（其他老师）")}</span> : null}
                          {isOtherUnread ? <span style={{ marginLeft: 6, color: "#b91c1c", fontSize: 12, fontWeight: 700 }}>{t(lang, "NEW", "未读")}</span> : null}
                        </span>
                        {isOtherUnread ? (
                          <form action={markFeedbackReadAction} style={{ width: "auto" }}>
                            <input type="hidden" name="feedbackId" value={item.feedbackId} />
                            <input type="hidden" name="studentId" value={item.studentId} />
                            <input type="hidden" name="back" value={`/teacher/student-feedbacks?${queryBase}&studentId=${encodeURIComponent(selectedStudentId)}&page=${safePage}`} />
                            <button type="submit" className="read-btn">{t(lang, "Mark Read", "标为已读")}</button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                    <details style={{ marginTop: 6 }} open={isOtherUnread}>
                      <summary style={{ cursor: "pointer", color: "#334155" }}>
                        {item.courseName} / {item.subjectName ?? "-"} / {item.levelName ?? "-"} | {summarize(item.content, 60)}
                      </summary>
                      <div style={{ color: "#475569", fontSize: 12, marginTop: 6 }}>
                        {item.courseName} / {item.subjectName ?? "-"} / {item.levelName ?? "-"} | {item.campusName}
                        {item.roomName ? ` / ${item.roomName}` : ""}
                      </div>
                      <div style={{ color: "#0f766e", fontSize: 12, marginTop: 2 }}>{t(lang, "Attendance", "出勤")}: {item.attendanceStatus}</div>
                      <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{item.content || "-"}</div>
                      <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
                        {item.classPerformance ? `${t(lang, "Performance", "课堂表现")}: ${item.classPerformance} | ` : ""}
                        {item.homework ? `${t(lang, "Homework", "作业")}: ${item.homework} | ` : ""}
                        {t(lang, "Submitted", "提交")}: {new Date(item.submittedAt).toLocaleString()}
                      </div>
                    </details>
                  </article>
                );
              })}
              {selectedTimelineRest.length > 0 ? (
                <details>
                  <summary style={{ cursor: "pointer", color: "#334155", fontWeight: 700 }}>
                    {t(lang, `Show More (${selectedTimelineRest.length})`, `查看更多（${selectedTimelineRest.length} 条）`)}
                  </summary>
                  <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
                    {selectedTimelineRest.slice(0, 147).map((item) => {
                      const isOtherUnread = item.teacherId !== teacher.id && !readSet.has(item.feedbackId);
                      return (
                        <article key={`${item.feedbackId}-${item.studentId}`} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
                          <div className="timeline-head" style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                            <div style={{ fontWeight: 700 }}>
                              {new Date(item.sessionStartAt).toLocaleString()} - {new Date(item.sessionEndAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <span>
                                {item.teacherName}
                                {item.teacherId !== teacher.id ? <span style={{ marginLeft: 6, color: "#b45309", fontSize: 12 }}>{t(lang, "(Other)", "（其他老师）")}</span> : null}
                                {isOtherUnread ? <span style={{ marginLeft: 6, color: "#b91c1c", fontSize: 12, fontWeight: 700 }}>{t(lang, "NEW", "未读")}</span> : null}
                              </span>
                              {isOtherUnread ? (
                                <form action={markFeedbackReadAction} style={{ width: "auto" }}>
                                  <input type="hidden" name="feedbackId" value={item.feedbackId} />
                                  <input type="hidden" name="studentId" value={item.studentId} />
                                  <input type="hidden" name="back" value={`/teacher/student-feedbacks?${queryBase}&studentId=${encodeURIComponent(selectedStudentId)}&page=${safePage}`} />
                                  <button type="submit" className="read-btn">{t(lang, "Mark Read", "标为已读")}</button>
                                </form>
                              ) : null}
                            </div>
                          </div>
                          <details style={{ marginTop: 6 }} open={isOtherUnread}>
                            <summary style={{ cursor: "pointer", color: "#334155" }}>
                              {item.courseName} / {item.subjectName ?? "-"} / {item.levelName ?? "-"} | {summarize(item.content, 60)}
                            </summary>
                            <div style={{ color: "#475569", fontSize: 12, marginTop: 6 }}>
                              {item.courseName} / {item.subjectName ?? "-"} / {item.levelName ?? "-"} | {item.campusName}
                              {item.roomName ? ` / ${item.roomName}` : ""}
                            </div>
                            <div style={{ color: "#0f766e", fontSize: 12, marginTop: 2 }}>{t(lang, "Attendance", "出勤")}: {item.attendanceStatus}</div>
                            <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{item.content || "-"}</div>
                            <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
                              {item.classPerformance ? `${t(lang, "Performance", "课堂表现")}: ${item.classPerformance} | ` : ""}
                              {item.homework ? `${t(lang, "Homework", "作业")}: ${item.homework} | ` : ""}
                              {t(lang, "Submitted", "提交")}: {new Date(item.submittedAt).toLocaleString()}
                            </div>
                          </details>
                        </article>
                      );
                    })}
                  </div>
                </details>
              ) : null}
              <div className="drawer-float-top">
                <a className="drawer-action" href="#timeline-top">{t(lang, "Top", "回到顶部")}</a>
              </div>
            </div>
          )}
        </section>
        </>
      ) : null}
      </div>
    </div>
  );
}
