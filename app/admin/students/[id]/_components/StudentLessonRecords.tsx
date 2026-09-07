import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { sessionBelongsToStudentWhere } from "@/lib/session-students";
import { lessonRecordStatus } from "@/lib/student-scheduling-overview";
import { formatBusinessDateTime, formatBusinessTimeOnly } from "@/lib/date-only";
import { t, type Lang } from "@/lib/i18n";

export default async function StudentLessonRecords({ studentId, params, lang }: {
  studentId: string; params: Record<string, string | undefined>; lang: Lang;
}) {
  const now = new Date();
  const pageSize = 50;
  const rawPage = Number(params.historyPage);
  const requestedPage = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const subject = params.historySubject || "";
  const date = (value?: string) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) ? new Date(`${value}T00:00:00+08:00`) : null;
  const from = date(params.historyFrom);
  const to = date(params.historyTo);
  const where: Prisma.SessionWhereInput = { AND: [
    { OR: [sessionBelongsToStudentWhere(studentId), { attendances: { some: { studentId } } }] },
    ...(subject ? [{ class: { subjectId: subject } }] : []),
    ...(from || to ? [{ startAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: new Date(to.getTime() + 86400000) } : {}) } }] : []),
  ] };
  const count = await prisma.session.count({ where });
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const page = Math.min(requestedPage, pages);
  const rows = await prisma.session.findMany({ where, orderBy: [{ startAt: "desc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize,
    include: { teacher: true, class: { include: { teacher: true, course: true, subject: true } }, attendances: { where: { studentId } } } });
  const subjects = await prisma.subject.findMany({ where: { classes: { some: { sessions: { some: {
    OR: [sessionBelongsToStudentWhere(studentId), { attendances: { some: { studentId } } }],
  } } } } }, include: { course: true }, orderBy: { name: "asc" } });
  const labels: Record<string, string> = {
    CANCELLED: t(lang, "Cancelled", "已取消"), ATTENDED: t(lang, "Attended", "已上课"),
    ABSENT: t(lang, "Absent", "缺席"), UNMARKED: t(lang, "Attendance pending", "已过期未点名"), SCHEDULED: t(lang, "Scheduled", "已排课"),
  };
  const href = (next: number) => {
    const p = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value && !["msg", "err", "quickOpen"].includes(key)) p.set(key, value);
    p.set("historyPage", String(next)); p.set("focus", "attendance");
    return `/admin/students/${studentId}?${p}#attendance`;
  };
  return <>
    <form method="GET" action={`/admin/students/${studentId}#attendance`} style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: 8, margin: "12px 0" }}>
      <input type="hidden" name="focus" value="attendance" />
      {params.studentsBack ? <input type="hidden" name="studentsBack" value={params.studentsBack} /> : null}
      <label>{t(lang, "From", "从")} <input type="date" name="historyFrom" defaultValue={from ? params.historyFrom : ""} /></label>
      <label>{t(lang, "To", "至")} <input type="date" name="historyTo" defaultValue={to ? params.historyTo : ""} /></label>
      <select name="historySubject" defaultValue={subject} aria-label={t(lang, "Subject", "科目")} style={{ maxWidth: "100%" }}>
        <option value="">{t(lang, "All subjects", "全部科目")}</option>
        {subjects.map((s) => <option key={s.id} value={s.id}>{s.course.name} / {s.name}</option>)}
      </select>
      <button type="submit">{t(lang, "Apply", "筛选")}</button>
      <a href={`/admin/students/${studentId}?focus=attendance#attendance`}>{t(lang, "All history", "全部历史")}</a>
      <a href={`/admin/students/${studentId}?focus=calendar-tools#calendar-tools`}>{t(lang, "Calendar / PDF", "月历 / PDF")}</a>
    </form>
    <div style={{ overflowX: "auto" }}>
      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", minWidth: 660 }}>
        <thead><tr><th align="left">{t(lang, "Lesson time", "上课时间")}</th><th align="left">{t(lang, "Course / subject", "课程 / 科目")}</th><th align="left">{t(lang, "Teacher", "老师")}</th><th align="left">{t(lang, "Status", "状态")}</th><th align="left">{t(lang, "Scheduled minutes", "安排分钟")}</th></tr></thead>
        <tbody>{rows.map((s) => {
          const status = lessonRecordStatus(s.attendances[0]?.status, s.endAt, now);
          return <tr key={s.id} style={{ borderTop: "1px solid #e2e8f0", color: status === "CANCELLED" ? "#64748b" : undefined }}>
            <td><a href={`/admin/sessions/${s.id}/attendance`}>{formatBusinessDateTime(s.startAt)} - {formatBusinessTimeOnly(s.endAt)}</a></td>
            <td>{s.class.course.name} / {s.class.subject?.name ?? "-"}</td><td>{s.teacher?.name ?? s.class.teacher.name}</td>
            <td style={{ color: status === "UNMARKED" ? "#b45309" : undefined }}>{labels[status]}</td>
            <td>{Math.round((s.endAt.getTime() - s.startAt.getTime()) / 60000)}</td>
          </tr>;
        })}{!rows.length ? <tr><td colSpan={5}>{t(lang, "No lessons", "暂无课程")}</td></tr> : null}</tbody>
      </table>
    </div>
    <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
      <span>{count} {t(lang, "lessons", "节课")} · {page}/{pages}</span>
      {page > 1 ? <a href={href(page - 1)}>{t(lang, "Previous", "上一页")}</a> : null}
      {page < pages ? <a href={href(page + 1)}>{t(lang, "Next", "下一页")}</a> : null}
    </div>
  </>;
}
