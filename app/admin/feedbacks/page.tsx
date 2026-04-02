import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { requireAdmin } from "@/lib/auth";
import { cookies } from "next/headers";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";
import CopyTextButton from "@/app/admin/_components/CopyTextButton";
import RememberedWorkbenchQueryClient from "../_components/RememberedWorkbenchQueryClient";
import ProxyDraftFormClient from "./ProxyDraftFormClient";
import MarkForwardedFormClient from "./MarkForwardedFormClient";
import BulkMarkOverdueForwardedClient from "./BulkMarkOverdueForwardedClient";
import { formatBusinessDateTime, formatBusinessTimeOnly } from "@/lib/date-only";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchInfoBarStyle,
} from "../_components/workbenchStyles";

const FEEDBACK_LOOKBACK_DAYS = 90;
const FEEDBACK_QUEUE_COOKIE = "adminFeedbacksPreferredQueue";
const FEEDBACK_QUEUE_OPTIONS = ["missing", "proxy", "pending", "forwarded", "all"] as const;

function normalizeFeedbackQueueStatus(value: string) {
  return FEEDBACK_QUEUE_OPTIONS.includes(value as (typeof FEEDBACK_QUEUE_OPTIONS)[number])
    ? (value as (typeof FEEDBACK_QUEUE_OPTIONS)[number])
    : "missing";
}

function parseRememberedFeedbackQueue(raw: string) {
  let normalizedRaw = raw;
  try {
    normalizedRaw = decodeURIComponent(raw);
  } catch {
    normalizedRaw = raw;
  }
  const params = new URLSearchParams(normalizedRaw);
  const status = normalizeFeedbackQueueStatus(String(params.get("status") ?? "").trim());
  const studentId = String(params.get("studentId") ?? "").trim();
  const normalized = new URLSearchParams();
  if (status !== "missing") normalized.set("status", status);
  if (studentId) normalized.set("studentId", studentId);
  return {
    status,
    studentId,
    value: normalized.toString(),
  };
}

function fmtRange(startAt: Date, endAt: Date) {
  return `${formatBusinessDateTime(new Date(startAt))} - ${formatBusinessTimeOnly(new Date(endAt))}`;
}

function getStudentNames(session: any) {
  const cancelledSet = new Set(
    Array.isArray(session.attendances)
      ? session.attendances.filter((a: any) => a?.status === "EXCUSED").map((a: any) => a.studentId as string)
      : []
  );
  const classStudentNames = session.class.enrollments.map((e: any) => e.student.name).filter(Boolean);
  if (session.class.capacity === 1) {
    const oneOnOneId = session.studentId ?? session.class.oneOnOneStudentId ?? session.class.enrollments?.[0]?.studentId ?? null;
    if (oneOnOneId && cancelledSet.has(oneOnOneId)) return [];
    const onlyStudent = session.student?.name ?? session.class.oneOnOneStudent?.name ?? (classStudentNames[0] ?? null);
    return onlyStudent ? [onlyStudent] : [];
  }
  return Array.from(
    new Set(
      session.class.enrollments
        .filter((e: any) => !cancelledSet.has(e.studentId))
        .map((e: any) => e.student.name)
        .filter(Boolean)
    )
  );
}

function buildForwardText(row: any) {
  const classLine = `${row.session.class.course.name}${row.session.class.subject ? ` / ${row.session.class.subject.name}` : ""}${
    row.session.class.level ? ` / ${row.session.class.level.name}` : ""
  }`;
  const studentNames = getStudentNames(row.session);
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

export default async function AdminFeedbacksPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; msg?: string; err?: string; studentId?: string; focusFeedbackId?: string; focusSessionId?: string; feedbackFlow?: string }>;
}) {
  const lang = await getLang();
  await requireAdmin();

  const sp = await searchParams;
  const statusParam = typeof sp?.status === "string" ? sp.status : "";
  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const studentIdParam = typeof sp?.studentId === "string" ? String(sp.studentId ?? "").trim() : "";
  const focusFeedbackId = String(sp?.focusFeedbackId ?? "").trim();
  const focusSessionId = String(sp?.focusSessionId ?? "").trim();
  const feedbackFlow = String(sp?.feedbackFlow ?? "").trim();
  const canResumeRememberedQueue =
    !statusParam &&
    !studentIdParam &&
    !msg &&
    !err &&
    !focusFeedbackId &&
    !focusSessionId &&
    !feedbackFlow;
  const cookieStore = await cookies();
  const rememberedQueue = canResumeRememberedQueue
    ? parseRememberedFeedbackQueue(cookieStore.get(FEEDBACK_QUEUE_COOKIE)?.value ?? "")
    : {
        status: "missing" as const,
        studentId: "",
        value: "",
      };
  const status = statusParam ? normalizeFeedbackQueueStatus(statusParam) : rememberedQueue.status;
  const studentId = studentIdParam || rememberedQueue.studentId;
  const resumedRememberedQueue = canResumeRememberedQueue && Boolean(rememberedQueue.value);
  const rememberedQueueValue = (() => {
    const params = new URLSearchParams();
    if (status !== "missing") params.set("status", status);
    if (studentId) params.set("studentId", studentId);
    return params.toString();
  })();

  const now = new Date();
  const overdueAt = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const lookback = new Date(now.getTime() - FEEDBACK_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const studentScopeWhere = studentId
    ? {
        session: {
          OR: [{ studentId }, { class: { enrollments: { some: { studentId } } } }],
        },
      }
    : undefined;

  const allFeedbackRows = await prisma.sessionFeedback.findMany({
    where: studentScopeWhere,
    include: {
      teacher: true,
      session: {
        include: {
          student: true,
          attendances: { select: { studentId: true, status: true } },
          class: {
            include: {
              course: true,
              subject: true,
              level: true,
              campus: true,
              room: true,
              oneOnOneStudent: true,
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
    where: {
      endAt: { gte: lookback, lte: overdueAt },
      ...(studentId ? { OR: [{ studentId }, { class: { enrollments: { some: { studentId } } } }] } : {}),
    },
    include: {
      teacher: true,
      student: true,
      class: {
        include: {
          teacher: true,
          oneOnOneStudent: true,
          course: true,
          subject: true,
          level: true,
          campus: true,
          room: true,
          enrollments: { include: { student: true } },
        },
      },
      attendances: { select: { studentId: true, status: true } },
      feedbacks: true,
    },
    orderBy: { endAt: "desc" },
    take: 600,
  });

  const overdueItems = overdueSessions
    .map((s) => {
      const responsibleTeacherId = s.teacherId ?? s.class.teacherId;
      const responsibleTeacherName = s.teacher?.name ?? s.class.teacher.name;
      if (getStudentNames(s).length === 0) return null;
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

  const students = await prisma.student.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 1200,
  });
  const selectedStudentName = studentId ? students.find((s) => s.id === studentId)?.name ?? null : null;

  const tabHref = (nextStatus: string, extras?: Record<string, string | null | undefined>) => {
    const params = new URLSearchParams();
    params.set("status", nextStatus);
    if (studentId) params.set("studentId", studentId);
    for (const [key, value] of Object.entries(extras ?? {})) {
      if (value) params.set(key, value);
    }
    return `/admin/feedbacks?${params.toString()}`;
  };
  const activeStudentFilterCount = studentId ? 1 : 0;
  const currentQueueLabel =
    status === "proxy"
      ? t(lang, "Proxy draft pending teacher", "代填草稿待老师补全")
      : status === "pending"
      ? t(lang, "Pending Forward", "待转发")
      : status === "forwarded"
      ? t(lang, "Forwarded", "已转发")
      : status === "all"
      ? t(lang, "All Final Feedback", "全部正式反馈")
      : t(lang, "Missing > 12h", "超过12小时未反馈");
  const focusedFeedbackRow = rows.find((r) => r.id === focusFeedbackId) ?? null;
  const focusedOverdueRow = shownOverdueRows.find((r) => r.session.id === focusSessionId) ?? null;
  const nextPendingRow = pendingRows.find((r) => r.id !== focusFeedbackId) ?? pendingRows[0] ?? null;
  const backToPendingHref = tabHref("pending");
  const nextPendingHref = nextPendingRow ? `${tabHref("pending")}#feedback-card-${nextPendingRow.id}` : backToPendingHref;
  const focusedFeedbackAnchor = focusedFeedbackRow ? `#feedback-card-${focusedFeedbackRow.id}` : "";
  const focusedOverdueAnchor = focusedOverdueRow ? `#overdue-card-${focusedOverdueRow.session.id}` : "";
  const flowCard =
    feedbackFlow === "forwarded"
      ? {
          tone: "green" as const,
          title: t(lang, "Feedback marked as forwarded.", "反馈已标记为已转发。"),
          detail: focusedFeedbackRow
            ? t(lang, "Use the highlighted card below for confirmation, or jump back to the next pending item.", "你可以先确认下面高亮的卡片，或直接回到下一条待转发项。")
            : t(lang, "This item has left the pending queue. You can confirm it in forwarded history or return to the next pending item.", "这条记录已经离开待转发队列。你可以在已转发队列确认它，或回到下一条待转发项。"),
          links: [
            focusedFeedbackAnchor
              ? { href: focusedFeedbackAnchor, label: t(lang, "Jump to forwarded card", "跳到已转发卡片") }
              : null,
            { href: nextPendingHref, label: t(lang, "Open next pending item", "打开下一条待转发项") },
          ].filter((item): item is { href: string; label: string } => Boolean(item)),
        }
      : feedbackFlow === "proxy-draft"
        ? {
            tone: "amber" as const,
            title: t(lang, "Proxy draft saved.", "代填草稿已保存。"),
            detail: focusedOverdueRow
              ? t(lang, "The same overdue session stays highlighted below so you can continue editing it or move back to the main overdue queue.", "下面会继续高亮同一条超时课次，方便你继续编辑，或返回主超时队列。")
              : t(lang, "The proxy queue has been refreshed. Continue on the same session or go back to the missing queue.", "代填队列已刷新。你可以继续处理这条课次，或返回缺失队列。"),
            links: [
              focusedOverdueAnchor
                ? { href: focusedOverdueAnchor, label: t(lang, "Jump to this session", "跳到当前课次") }
                : null,
              { href: tabHref("missing"), label: t(lang, "Open missing queue", "打开缺失队列") },
            ].filter((item): item is { href: string; label: string } => Boolean(item)),
          }
        : null;
  const flowCardStyle =
    flowCard?.tone === "green"
      ? { border: "1px solid #86efac", background: "#f0fdf4", color: "#166534" }
      : { border: "1px solid #fcd34d", background: "#fffbeb", color: "#92400e" };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <RememberedWorkbenchQueryClient
        cookieKey={FEEDBACK_QUEUE_COOKIE}
        storageKey="adminFeedbacksPreferredQueue"
        value={rememberedQueueValue}
      />
      <div style={workbenchHeroStyle("indigo")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#3730a3", letterSpacing: 0.4 }}>
            {t(lang, "Teacher Feedback Desk", "老师课后反馈工作台")}
          </div>
          <h2 style={{ margin: 0 }}>{t(lang, "Teacher Feedback Desk", "老师课后反馈工作台")}</h2>
          <div style={{ color: "#475569", lineHeight: 1.5 }}>
            {t(
              lang,
              "Start from overdue and pending-forward queues first, then use forwarded and full-history views only when you need confirmation or lookup.",
              "先处理超时和待转发队列，再在需要确认或查询时查看已转发和完整历史。"
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ padding: "4px 10px", borderRadius: 999, background: "#fff", border: "1px solid #cbd5e1", color: "#334155", fontSize: 12 }}>
            {t(lang, "Current queue", "当前队列")}: <b>{currentQueueLabel}</b>
          </span>
          <span style={{ padding: "4px 10px", borderRadius: 999, background: "#fff", border: "1px solid #cbd5e1", color: "#334155", fontSize: 12 }}>
            {t(lang, "Student filter", "学生筛选")}: <b>{selectedStudentName ?? t(lang, "All students", "全部学生")}</b>
          </span>
          <span style={{ padding: "4px 10px", borderRadius: 999, background: "#fff", border: "1px solid #cbd5e1", color: "#334155", fontSize: 12 }}>
            {t(lang, "Work items now", "当前工作项")}: <b>{isOverdueTab ? shownOverdueRows.length : rows.length}</b>
          </span>
        </div>
      </div>
      {resumedRememberedQueue ? (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #bfdbfe",
            background: "#eff6ff",
            color: "#1d4ed8",
            display: "flex",
            gap: 10,
            justifyContent: "space-between",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ fontWeight: 700 }}>
            {t(
              lang,
              "Resumed your last feedback queue. Use the shortcut on the right if you want to return to the default desk.",
              "已恢复你上次的反馈队列；如果要回到默认工作台，可直接使用右侧快捷入口。"
            )}
          </div>
          <a href="/admin/feedbacks?status=missing">{t(lang, "Back to default desk", "回到默认工作台")}</a>
        </div>
      ) : null}
      {err && <div style={{ color: "#b00", marginBottom: 10 }}>{err}</div>}
      {msg && <div style={{ color: "#087", marginBottom: 10 }}>{msg}</div>}
      {flowCard ? (
        <div
          style={{
            ...flowCardStyle,
            borderRadius: 12,
            padding: 12,
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ fontWeight: 800 }}>{flowCard.title}</div>
          <div style={{ fontSize: 13 }}>{flowCard.detail}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {flowCard.links.map((link) => (
              <a key={link.href + link.label} href={link.href}>
                {link.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <details open={activeStudentFilterCount > 0} style={workbenchFilterPanelStyle}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>
          {t(lang, "Student scope filter", "学生范围筛选")} ({activeStudentFilterCount})
        </summary>
        <div style={{ marginTop: 10, color: "#64748b", fontSize: 12 }}>
          {t(lang, "Keep this collapsed during normal queue processing. Open it only when you need to inspect one student's feedback trail.", "平时处理队列时可保持收起；只有在需要查看单个学生的反馈轨迹时再展开。")}
        </div>
        <form method="get" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
          <input type="hidden" name="status" value={status} />
          <select name="studentId" defaultValue={studentId} style={{ minWidth: 280 }}>
            <option value="">{t(lang, "All students", "全部学生")}</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} (STU-{s.id.slice(0, 4)}…{s.id.slice(-4)})
              </option>
            ))}
          </select>
          <button type="submit" data-apply-submit="1">{t(lang, "Apply", "应用")}</button>
          <a href={tabHref(status)}>{t(lang, "Clear", "清除")}</a>
          {selectedStudentName ? (
            <span style={{ color: "#334155", fontSize: 13 }}>
              {t(lang, "Current student", "当前学生")}: {selectedStudentName}
            </span>
          ) : null}
        </form>
      </details>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <a
          href={tabHref("missing")}
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
          href={tabHref("proxy")}
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
          href={tabHref("pending")}
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
          href={tabHref("forwarded")}
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
          href={tabHref("all")}
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

      <div style={workbenchInfoBarStyle}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 800 }}>{currentQueueLabel}</div>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            {isOverdueTab
              ? t(lang, "Handle one overdue session at a time: either create/update the proxy draft or move it out of the overdue queue.", "一次处理一条超时课次：创建/更新代填草稿，或把它移出超时队列。")
              : status === "pending"
                ? t(lang, "Copy and mark one feedback at a time, then move on to the next item waiting to be forwarded.", "一次复制并标记一条待转发反馈，再继续下一条。")
                : t(lang, "This view is mainly for confirmation and lookup after the main queue work is done.", "这个视图主要用于主队列处理完成后的确认和查询。")}
          </div>
        </div>
        <div style={{ color: "#475569", fontSize: 13 }}>
          {t(lang, "Showing", "显示")} {isOverdueTab ? shownOverdueRows.length : rows.length}
        </div>
      </div>

      {isOverdueTab ? (
        shownOverdueRows.length === 0 ? (
          <div style={{ color: "#999" }}>{t(lang, "No overdue feedbacks.", "暂无超时反馈。")}</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <BulkMarkOverdueForwardedClient
              filterStudentId={studentId}
              labels={{
                notePlaceholder: t(lang, "Batch note (optional)", "批量备注(可选)"),
                submit: t(lang, "Batch mark as WeChat forwarded", "批量标记已微信反馈"),
                saving: t(lang, "Saving...", "保存中..."),
                donePrefix: t(lang, "Done", "完成"),
                errorPrefix: t(lang, "Error", "错误"),
                confirmText: t(
                  lang,
                  "Process all overdue items in current filter and mark as WeChat forwarded?",
                  "确认处理当前筛选下所有超时项并标记为微信已反馈？"
                ),
              }}
            />

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))" }}>
              {shownOverdueRows.map((r) => {
                const studentNames = getStudentNames(r.session);
                const cardTone =
                  r.kind === "proxy"
                    ? { border: "1px solid #fcd34d", background: "#fffbeb" }
                    : { border: "1px solid #fecaca", background: "#fff7f7" };
                return (
                  <div
                    id={`overdue-card-${r.session.id}`}
                    key={r.session.id}
                    style={{
                      ...cardTone,
                      borderRadius: 12,
                      padding: 12,
                      display: "grid",
                      gap: 8,
                      boxShadow: focusSessionId === r.session.id ? "0 0 0 3px rgba(37,99,235,0.18)" : "none",
                    }}
                  >
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
                        {r.kind === "proxy" ? t(lang, "Proxy draft exists", "已有代填草稿") : t(lang, "Missing", "缺失")}
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
                      <a href={`/teacher/sessions/${r.session.id}`}>{t(lang, "Open teacher page", "打开老师页面")}</a>
                      <ProxyDraftFormClient
                        sessionId={r.session.id}
                        teacherId={r.teacherId}
                        initialNote={r.feedback?.proxyNote ?? ""}
                        afterSuccessStatus="proxy"
                        labels={{
                          placeholder: t(lang, "Proxy note", "代填备注"),
                          submit:
                            r.kind === "proxy"
                              ? t(lang, "Update Proxy Draft", "更新代填草稿")
                              : t(lang, "Create Proxy Draft", "创建代填草稿"),
                          saving: t(lang, "Saving...", "保存中..."),
                          errorPrefix: t(lang, "Error", "错误"),
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : rows.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No feedback records.", "暂无反馈记录。")}</div>
      ) : (
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))" }}>
          {rows.map((r) => {
            const studentNames = getStudentNames(r.session);
            return (
              <div
                id={`feedback-card-${r.id}`}
                key={r.id}
                style={{
                  border: focusFeedbackId === r.id ? "1px solid #60a5fa" : "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 12,
                  display: "grid",
                  gap: 8,
                  boxShadow: focusFeedbackId === r.id ? "0 0 0 3px rgba(37,99,235,0.14)" : "none",
                }}
              >
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
                    <div>
                      {t(lang, "Submitted", "提交时间")}: {formatBusinessDateTime(new Date(r.submittedAt))}
                    </div>
                    <div>
                      {t(lang, "Teacher", "老师")}: {r.teacher.name}
                    </div>
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
                      <div>{formatBusinessDateTime(new Date(r.forwardedAt))}</div>
                      <div>{r.forwardedBy ?? "-"}</div>
                      <div>{r.forwardChannel ?? "-"}</div>
                      {r.forwardNote ? <div style={{ whiteSpace: "pre-wrap" }}>{r.forwardNote}</div> : null}
                    </div>
                  ) : (
                    <MarkForwardedFormClient
                      id={r.id}
                      afterSuccessStatus="forwarded"
                      successFlow="forwarded"
                      labels={{
                        channelPlaceholder: t(lang, "Channel (e.g. WeChat)", "渠道(如微信)"),
                        notePlaceholder: t(lang, "Forward note", "转发备注"),
                        submit: t(lang, "Mark as Forwarded", "标记已转发"),
                        saving: t(lang, "Saving...", "保存中..."),
                        errorPrefix: t(lang, "Error", "错误"),
                      }}
                    />
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
