import type { Prisma } from "@prisma/client";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";
import { requireTeacherProfile } from "@/lib/auth";
import { formatBusinessDateTime, formatBusinessTimeOnly, formatDateOnly } from "@/lib/date-only";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { getVisibleSessionStudentNames, isSessionFullyCancelled } from "@/lib/session-students";
import TeacherWorkspaceHero from "../../_components/TeacherWorkspaceHero";

const HISTORY_SCAN_LIMIT = 5000;
const PAGE_SIZE = 25;

function parseDate(raw: string, endOfDay = false) {
  if (!raw) return null;
  const value = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(value.getTime())) return null;
  if (endOfDay) value.setHours(23, 59, 59, 999);
  return value;
}

function pageHref(input: {
  q: string;
  from: string;
  to: string;
  status: string;
  page: number;
}) {
  const params = new URLSearchParams();
  if (input.q) params.set("q", input.q);
  if (input.from) params.set("from", input.from);
  if (input.to) params.set("to", input.to);
  if (input.status !== "all") params.set("status", input.status);
  if (input.page > 1) params.set("page", String(input.page));
  const query = params.toString();
  return `/teacher/sessions/history${query ? `?${query}` : ""}`;
}

function courseLabel(session: any) {
  return [session.class.course.name, session.class.subject?.name, session.class.level?.name]
    .filter(Boolean)
    .join(" / ");
}

export default async function TeacherHistoricalFeedbackPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; from?: string; to?: string; status?: string; page?: string }>;
}) {
  const lang = await getLang();
  const { teacher } = await requireTeacherProfile();
  if (!teacher) {
    return <div style={{ color: "#b91c1c" }}>{t(lang, "Teacher profile not linked.", "老师资料未关联。")}</div>;
  }

  const sp = await searchParams;
  const q = String(sp?.q ?? "").trim();
  const fromRaw = String(sp?.from ?? "").trim();
  const toRaw = String(sp?.to ?? "").trim();
  const statusRaw = String(sp?.status ?? "all").trim();
  const status = ["all", "missing", "proxy"].includes(statusRaw) ? statusRaw : "all";
  const requestedPage = Math.max(1, Number(sp?.page ?? 1) || 1);
  const from = parseDate(fromRaw);
  const to = parseDate(toRaw, true);
  const now = new Date();

  const teacherSessionWhere: Prisma.SessionWhereInput = {
    OR: [{ teacherId: teacher.id }, { teacherId: null, class: { teacherId: teacher.id } }],
  };
  const searchWhere: Prisma.SessionWhereInput | null = q
    ? {
        OR: [
          { student: { name: { contains: q, mode: "insensitive" } } },
          { class: { oneOnOneStudent: { name: { contains: q, mode: "insensitive" } } } },
          { class: { enrollments: { some: { student: { name: { contains: q, mode: "insensitive" } } } } } },
          { class: { course: { name: { contains: q, mode: "insensitive" } } } },
          { class: { subject: { name: { contains: q, mode: "insensitive" } } } },
          { class: { level: { name: { contains: q, mode: "insensitive" } } } },
        ],
      }
    : null;

  const rawSessions = await prisma.session.findMany({
    where: {
      endAt: {
        lt: now,
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
      AND: [
        teacherSessionWhere,
        {
          OR: [
            { feedbacks: { none: { teacherId: teacher.id } } },
            { feedbacks: { some: { teacherId: teacher.id, isProxyDraft: true } } },
          ],
        },
        ...(searchWhere ? [searchWhere] : []),
      ],
    },
    include: {
      student: { select: { id: true, name: true } },
      attendances: { select: { studentId: true, status: true } },
      feedbacks: {
        where: { teacherId: teacher.id },
        select: { id: true, isProxyDraft: true, submittedAt: true },
        take: 1,
      },
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
    },
    orderBy: { endAt: "desc" },
    take: HISTORY_SCAN_LIMIT,
  });

  const activeRows = rawSessions.filter((session) => !isSessionFullyCancelled(session));
  const missingCount = activeRows.filter((session) => !session.feedbacks[0]).length;
  const proxyCount = activeRows.filter((session) => session.feedbacks[0]?.isProxyDraft).length;
  const filteredRows = activeRows.filter((session) => {
    if (status === "missing") return !session.feedbacks[0];
    if (status === "proxy") return Boolean(session.feedbacks[0]?.isProxyDraft);
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const returnTo = pageHref({ q, from: fromRaw, to: toRaw, status, page });

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <TeacherWorkspaceHero
        title={t(lang, "Historical Feedback Completion", "历史待补反馈")}
        subtitle={t(
          lang,
          "Find any earlier session that still has no final teacher feedback. This is separate from the daily schedule so old work does not clutter current classes.",
          "查找任何仍未完成正式老师反馈的历史课次。这里与日常课表分开，避免旧任务干扰当前课程。"
        )}
        actions={[
          { href: "/teacher/sessions", label: t(lang, "Back to my sessions", "返回我的课次") },
          { href: "/teacher/student-feedbacks?range=all", label: t(lang, "View submitted history", "查看已提交历史") },
        ]}
      />

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
        <div style={{ border: "1px solid #fecaca", background: "#fef2f2", borderRadius: 8, padding: 14 }}>
          <div style={{ color: "#991b1b", fontWeight: 800 }}>{t(lang, "Missing", "完全未填写")}</div>
          <div style={{ color: "#991b1b", fontSize: 28, fontWeight: 800, marginTop: 6 }}>{missingCount}</div>
        </div>
        <div style={{ border: "1px solid #bae6fd", background: "#f0f9ff", borderRadius: 8, padding: 14 }}>
          <div style={{ color: "#075985", fontWeight: 800 }}>{t(lang, "Proxy drafts", "代填待补全")}</div>
          <div style={{ color: "#075985", fontSize: 28, fontWeight: 800, marginTop: 6 }}>{proxyCount}</div>
        </div>
        <div style={{ border: "1px solid #dbeafe", background: "#eff6ff", borderRadius: 8, padding: 14 }}>
          <div style={{ color: "#1e40af", fontWeight: 800 }}>{t(lang, "In current view", "当前筛选")}</div>
          <div style={{ color: "#1e40af", fontSize: 28, fontWeight: 800, marginTop: 6 }}>{filteredRows.length}</div>
        </div>
      </section>

      <section style={{ border: "1px solid #e2e8f0", background: "#ffffff", borderRadius: 8, padding: 14, display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 800 }}>{t(lang, "Find historical work", "查找历史任务")}</div>
        <form method="GET" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 4, minWidth: 240, flex: "1 1 280px" }}>
            {t(lang, "Student or course", "学生或课程")}
            <input name="q" defaultValue={q} placeholder={t(lang, "Search student, course, subject or level", "搜索学生、课程、科目或年级")} />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            {t(lang, "From", "开始日期")}
            <input name="from" type="date" defaultValue={fromRaw} />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            {t(lang, "To", "结束日期")}
            <input name="to" type="date" defaultValue={toRaw} max={formatDateOnly(now)} />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            {t(lang, "Status", "状态")}
            <select name="status" defaultValue={status}>
              <option value="all">{t(lang, "All pending", "全部待补")}</option>
              <option value="missing">{t(lang, "Missing only", "仅完全未填写")}</option>
              <option value="proxy">{t(lang, "Proxy drafts only", "仅代填待补全")}</option>
            </select>
          </label>
          <button type="submit">{t(lang, "Apply", "应用")}</button>
          <a href="/teacher/sessions/history" style={{ padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 8, textDecoration: "none", color: "#0f172a" }}>
            {t(lang, "Clear", "清空")}
          </a>
        </form>
        <div style={{ color: "#475569", fontSize: 13 }}>
          {t(
            lang,
            "Only sessions assigned to your teacher profile are included. Fully cancelled sessions and completed final feedback are excluded.",
            "这里只显示分配给你的课次；整节已取消的课程和已经完成正式反馈的课程不会列出。"
          )}
        </div>
      </section>

      {rawSessions.length >= HISTORY_SCAN_LIMIT ? (
        <div style={{ border: "1px solid #fde68a", background: "#fffbeb", borderRadius: 8, padding: 10, color: "#92400e" }}>
          {t(lang, "The result is large. Add a student or date filter to narrow it down.", "结果数量较大，请增加学生或日期条件缩小范围。")}
        </div>
      ) : null}

      {pageRows.length === 0 ? (
        <section style={{ border: "1px solid #dbeafe", background: "#f8fbff", borderRadius: 8, padding: 18 }}>
          <div style={{ fontWeight: 800, color: "#1d4ed8" }}>{t(lang, "No pending historical feedback found", "没有找到历史待补反馈")}</div>
          <div style={{ color: "#475569", marginTop: 6 }}>
            {t(lang, "Clear or widen the filters if you expected an older session.", "如果你预期还有更早课次，请清空或放宽筛选条件。")}
          </div>
        </section>
      ) : (
        <section style={{ display: "grid", gap: 10 }}>
          {pageRows.map((session) => {
            const feedback = session.feedbacks[0] ?? null;
            const studentNames = getVisibleSessionStudentNames(session);
            const stateLabel = feedback?.isProxyDraft
              ? t(lang, "Proxy draft - teacher must complete", "代填草稿，需老师补全")
              : t(lang, "No feedback submitted", "尚未提交反馈");
            return (
              <article key={session.id} style={{ border: "1px solid #e2e8f0", background: "#ffffff", borderRadius: 8, padding: 14, display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 800 }}>
                    {formatBusinessDateTime(new Date(session.startAt))} - {formatBusinessTimeOnly(new Date(session.endAt))}
                  </div>
                  <span style={{ color: feedback?.isProxyDraft ? "#075985" : "#b91c1c", fontWeight: 800 }}>{stateLabel}</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <ClassTypeBadge capacity={session.class.capacity} compact />
                  <span>{courseLabel(session)}</span>
                </div>
                <div style={{ color: "#0f766e" }}>{t(lang, "Students", "学生")}: {studentNames.join(", ") || "-"}</div>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  {session.class.campus.name}{session.class.room ? ` / ${session.class.room.name}` : ""}
                </div>
                <div>
                  <a href={`/teacher/sessions/${session.id}?returnTo=${encodeURIComponent(returnTo)}`} style={{ display: "inline-flex", padding: "9px 12px", border: "1px solid #93c5fd", borderRadius: 8, textDecoration: "none", color: "#1d4ed8", fontWeight: 800 }}>
                    {feedback?.isProxyDraft ? t(lang, "Open and complete draft", "打开并补全草稿") : t(lang, "Open and submit feedback", "打开并补交反馈")}
                  </a>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {totalPages > 1 ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span>{t(lang, "Page", "页码")} {page}/{totalPages}</span>
          {page > 1 ? <a href={pageHref({ q, from: fromRaw, to: toRaw, status, page: page - 1 })}>{t(lang, "Previous", "上一页")}</a> : null}
          {page < totalPages ? <a href={pageHref({ q, from: fromRaw, to: toRaw, status, page: page + 1 })}>{t(lang, "Next", "下一页")}</a> : null}
        </div>
      ) : null}
    </div>
  );
}
