import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { shouldIgnoreTeacherConflictSession } from "@/lib/session-conflict";
import { cookies } from "next/headers";
import ScheduleCourseFilter from "../_components/ScheduleCourseFilter";
import NoticeBanner from "../_components/NoticeBanner";
import RememberedWorkbenchQueryClient from "../_components/RememberedWorkbenchQueryClient";
import WorkbenchActionBanner from "../_components/WorkbenchActionBanner";
import WorkbenchScrollMemoryClient from "../_components/WorkbenchScrollMemoryClient";
import WorkbenchStatusChip from "../_components/WorkbenchStatusChip";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";
import ConflictsAppointmentActionsClient from "./_components/ConflictsAppointmentActionsClient";
import ConflictsSessionActionsClient from "./_components/ConflictsSessionActionsClient";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
  workbenchMetricValueStyle,
} from "../_components/workbenchStyles";

const CONFLICTS_FILTER_COOKIE = "adminConflictsPreferredFilters";

function conflictSectionLinkStyle(background: string, border: string) {
  return {
    display: "grid",
    gap: 4,
    minWidth: 170,
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${border}`,
    background,
    textDecoration: "none",
    color: "inherit",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  } as const;
}

function parseDateOnly(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [Y, M, D] = s.split("-").map(Number);
  if (!Number.isFinite(Y) || !Number.isFinite(M) || !Number.isFinite(D)) return null;
  const dt = new Date(Y, M - 1, D, 0, 0, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  // Guard against JS date overflow like 2026-02-31 -> 2026-03-03.
  if (dt.getFullYear() !== Y || dt.getMonth() !== M - 1 || dt.getDate() !== D) return null;
  return dt;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fmtHHMM(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function fmtRange(startAt: Date, endAt: Date) {
  return `${ymd(startAt)} ${fmtHHMM(startAt)}-${fmtHHMM(endAt)}`;
}

function classLabel(cls: {
  course: { name: string };
  subject?: { name: string } | null;
  level?: { name: string } | null;
}) {
  return `${cls.course.name}${cls.subject ? ` / ${cls.subject.name}` : ""}${cls.level ? ` / ${cls.level.name}` : ""}`;
}

function roomLabel(cls: { room?: { name: string } | null; campus: { name: string } }) {
  return `${cls.campus.name}${cls.room ? ` / ${cls.room.name}` : ""}`;
}

function canTeachClass(teacher: any, courseId?: string | null, subjectId?: string | null) {
  if (subjectId) {
    if (teacher?.subjectCourseId === subjectId) return true;
    if (Array.isArray(teacher?.subjects) && teacher.subjects.some((s: any) => s?.id === subjectId)) return true;
    return false;
  }

  if (!courseId) return false;
  if (teacher?.subjectCourse?.courseId === courseId) return true;
  if (Array.isArray(teacher?.subjects)) {
    return teacher.subjects.some((s: any) => s?.courseId === courseId);
  }
  return false;
}

function parseRememberedConflictsDesk(raw: string, fallbackFrom: string, fallbackTo: string) {
  let normalizedRaw = raw;
  try {
    normalizedRaw = decodeURIComponent(raw);
  } catch {
    normalizedRaw = raw;
  }
  const params = new URLSearchParams(normalizedRaw);
  const from = parseDateOnly(String(params.get("from") ?? "").trim()) ? String(params.get("from")) : fallbackFrom;
  const to = parseDateOnly(String(params.get("to") ?? "").trim()) ? String(params.get("to")) : fallbackTo;
  const courseId = String(params.get("courseId") ?? "").trim();
  const subjectId = String(params.get("subjectId") ?? "").trim();
  const pageSizeRaw = Number.parseInt(String(params.get("pageSize") ?? "").trim(), 10);
  const pageSize = [10, 20, 30, 50, 100].includes(pageSizeRaw) ? String(pageSizeRaw) : "30";
  const normalized = new URLSearchParams();
  if (from !== fallbackFrom) normalized.set("from", from);
  if (to !== fallbackTo) normalized.set("to", to);
  if (courseId) normalized.set("courseId", courseId);
  if (subjectId) normalized.set("subjectId", subjectId);
  if (pageSize !== "30") normalized.set("pageSize", pageSize);
  return { from, to, courseId, subjectId, pageSize, value: normalized.toString() };
}

// Server actions were removed; conflict resolution now uses client fetch + /api routes.

export default async function ConflictsPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string; to?: string; courseId?: string; subjectId?: string; page?: string; pageSize?: string; msg?: string; err?: string; clearDesk?: string }>;
}) {
  const lang = await getLang();
  const today = new Date();
  const defaultFrom = ymd(today);
  const toDefault = new Date(today);
  toDefault.setDate(toDefault.getDate() + 30);
  const defaultTo = ymd(toDefault);

  const sp = await searchParams;
  const hasFromParam = typeof sp?.from === "string" && sp.from.trim().length > 0;
  const hasToParam = typeof sp?.to === "string" && sp.to.trim().length > 0;
  const hasCourseParam = typeof sp?.courseId === "string" && sp.courseId.trim().length > 0;
  const hasSubjectParam = typeof sp?.subjectId === "string" && sp.subjectId.trim().length > 0;
  const hasPageSizeParam = typeof sp?.pageSize === "string" && sp.pageSize.trim().length > 0;
  const clearDesk = sp?.clearDesk === "1";
  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const cookieStore = await cookies();
  const canResumeRememberedDesk = !clearDesk && !hasFromParam && !hasToParam && !hasCourseParam && !hasSubjectParam && !hasPageSizeParam && !msg && !err;
  const rememberedDesk = canResumeRememberedDesk
    ? parseRememberedConflictsDesk(cookieStore.get(CONFLICTS_FILTER_COOKIE)?.value ?? "", defaultFrom, defaultTo)
    : { from: defaultFrom, to: defaultTo, courseId: "", subjectId: "", pageSize: "30", value: "" };
  const fromStr = String(hasFromParam ? sp?.from ?? "" : rememberedDesk.from ?? defaultFrom).trim();
  const toStr = String(hasToParam ? sp?.to ?? "" : rememberedDesk.to ?? defaultTo).trim();
  const filterCourseId = String(hasCourseParam ? sp?.courseId ?? "" : rememberedDesk.courseId ?? "").trim();
  const filterSubjectId = String(hasSubjectParam ? sp?.subjectId ?? "" : rememberedDesk.subjectId ?? "").trim();
  const requestedPage = Math.max(1, Number.parseInt((sp?.page ?? "1").trim(), 10) || 1);
  const requestedPageSize = Number.parseInt(String(hasPageSizeParam ? sp?.pageSize ?? "" : rememberedDesk.pageSize ?? "30").trim(), 10) || 30;
  const pageSize = Math.min(100, Math.max(10, requestedPageSize));
  const resumedRememberedDesk = canResumeRememberedDesk && Boolean(rememberedDesk.value);

  const fromParsed = parseDateOnly(fromStr) ?? parseDateOnly(defaultFrom)!;
  const toParsed = parseDateOnly(toStr) ?? parseDateOnly(defaultTo)!;
  const from = fromParsed <= toParsed ? fromParsed : toParsed;
  const to = fromParsed <= toParsed ? toParsed : fromParsed;
  const fromSafeStr = ymd(from);
  const toSafeStr = ymd(to);
  const rememberedDeskValue = (() => {
    const params = new URLSearchParams();
    if (fromSafeStr !== defaultFrom) params.set("from", fromSafeStr);
    if (toSafeStr !== defaultTo) params.set("to", toSafeStr);
    if (filterCourseId) params.set("courseId", filterCourseId);
    if (filterSubjectId) params.set("subjectId", filterSubjectId);
    if (pageSize !== 30) params.set("pageSize", String(pageSize));
    return params.toString();
  })();
  to.setHours(23, 59, 59, 999);

  const [sessionsRaw, appointments, teachers, rooms, courses, subjects] = await Promise.all([
    prisma.session.findMany({
      where: { startAt: { lte: to }, endAt: { gte: from } },
      include: {
        teacher: true,
        student: true,
        attendances: {
          select: {
            studentId: true,
            status: true,
            excusedCharge: true,
            deductedMinutes: true,
            deductedCount: true,
          },
        },
        class: {
          include: {
            course: true,
            subject: true,
            level: true,
            teacher: true,
            campus: true,
            room: true,
            enrollments: { select: { studentId: true } },
          },
        },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { startAt: { lte: to }, endAt: { gte: from } },
      include: { student: true, teacher: true },
      orderBy: { startAt: "asc" },
    }),
    prisma.teacher.findMany({ include: { subjects: true, subjectCourse: true }, orderBy: { name: "asc" } }),
    prisma.room.findMany({ include: { campus: true }, orderBy: { name: "asc" } }),
    prisma.course.findMany({ orderBy: { name: "asc" } }),
    prisma.subject.findMany({ include: { course: true }, orderBy: [{ courseId: "asc" }, { name: "asc" }] }),
  ]);
  const sessions = sessionsRaw.filter((s) => !shouldIgnoreTeacherConflictSession(s));

  const byTeacher = new Map<string, typeof sessions>();
  const byRoom = new Map<string, typeof sessions>();
  const effectiveTeacherId = (s: (typeof sessions)[number]) => s.teacherId ?? s.class.teacherId;

  for (const s of sessions) {
    const tid = effectiveTeacherId(s);
    if (tid) {
      const arr = byTeacher.get(tid) ?? [];
      arr.push(s);
      byTeacher.set(tid, arr);
    }
    if (s.class.roomId) {
      const arr = byRoom.get(s.class.roomId) ?? [];
      arr.push(s);
      byRoom.set(s.class.roomId, arr);
    }
  }

  const teacherConflicts = new Map<string, Set<string>>();
  const roomConflicts = new Map<string, Set<string>>();
  const teacherAppointmentConflicts = new Map<string, typeof appointments>();

  function addConflict(map: Map<string, Set<string>>, a: string, b: string) {
    if (!map.has(a)) map.set(a, new Set());
    map.get(a)!.add(b);
  }

  for (const list of byTeacher.values()) {
    list.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    for (let i = 0; i < list.length; i += 1) {
      const s = list[i];
      for (let j = i + 1; j < list.length; j += 1) {
        const o = list[j];
        if (o.startAt >= s.endAt) break;
        if (o.endAt > s.startAt) {
          addConflict(teacherConflicts, s.id, o.id);
          addConflict(teacherConflicts, o.id, s.id);
        }
      }
    }
  }

  for (const list of byRoom.values()) {
    list.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    for (let i = 0; i < list.length; i += 1) {
      const s = list[i];
      for (let j = i + 1; j < list.length; j += 1) {
        const o = list[j];
        if (o.startAt >= s.endAt) break;
        if (o.endAt > s.startAt) {
          addConflict(roomConflicts, s.id, o.id);
          addConflict(roomConflicts, o.id, s.id);
        }
      }
    }
  }

  const sessionsByTeacher = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const tid = effectiveTeacherId(s);
    const arr = sessionsByTeacher.get(tid) ?? [];
    arr.push(s);
    sessionsByTeacher.set(tid, arr);
  }
  const apptsByTeacher = new Map<string, typeof appointments>();
  for (const a of appointments) {
    const arr = apptsByTeacher.get(a.teacherId) ?? [];
    arr.push(a);
    apptsByTeacher.set(a.teacherId, arr);
  }
  for (const [tid, appts] of apptsByTeacher.entries()) {
    const list = sessionsByTeacher.get(tid) ?? [];
    for (const s of list) {
      for (const a of appts) {
        if (a.startAt < s.endAt && a.endAt > s.startAt) {
          const arr = teacherAppointmentConflicts.get(s.id) ?? [];
          arr.push(a);
          teacherAppointmentConflicts.set(s.id, arr);
        }
      }
    }
  }

  const conflictSessions = sessions.filter(
    (s) =>
      (teacherConflicts.get(s.id)?.size ?? 0) > 0 ||
      (roomConflicts.get(s.id)?.size ?? 0) > 0 ||
      (teacherAppointmentConflicts.get(s.id)?.length ?? 0) > 0
  );
  const filteredConflicts = conflictSessions.filter((s) => {
    if (filterCourseId && s.class.courseId !== filterCourseId) return false;
    if (filterSubjectId && s.class.subjectId !== filterSubjectId) return false;
    return true;
  });
  const totalConflicts = filteredConflicts.length;
  const teacherConflictCount = filteredConflicts.filter((s) => (teacherConflicts.get(s.id)?.size ?? 0) > 0).length;
  const roomConflictCount = filteredConflicts.filter((s) => (roomConflicts.get(s.id)?.size ?? 0) > 0).length;
  const appointmentConflictCount = filteredConflicts.filter((s) => (teacherAppointmentConflicts.get(s.id)?.length ?? 0) > 0).length;
  const totalPages = Math.max(1, Math.ceil(totalConflicts / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pagedConflicts = filteredConflicts.slice(pageStart, pageStart + pageSize);

  const sessionMap = new Map(sessions.map((s) => [s.id, s]));
  const paginationBaseParams = {
    from: fromSafeStr,
    to: toSafeStr,
    pageSize: String(pageSize),
    ...(filterCourseId ? { courseId: filterCourseId } : {}),
    ...(filterSubjectId ? { subjectId: filterSubjectId } : {}),
  };
  const prevHref = `/admin/conflicts?${new URLSearchParams({
    ...paginationBaseParams,
    page: String(Math.max(1, currentPage - 1)),
  }).toString()}`;
  const nextHref = `/admin/conflicts?${new URLSearchParams({
    ...paginationBaseParams,
    page: String(Math.min(totalPages, currentPage + 1)),
  }).toString()}`;

  return (
    <div>
      <RememberedWorkbenchQueryClient
        cookieKey={CONFLICTS_FILTER_COOKIE}
        storageKey="adminConflictsPreferredFilters"
        value={rememberedDeskValue}
      />
      <WorkbenchScrollMemoryClient storageKey="adminConflictsScroll" />
      <section style={workbenchHeroStyle("amber")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#9a3412" }}>{t(lang, "Scheduling conflict desk", "排课冲突工作台")}</div>
          <h2 style={{ margin: 0 }}>{t(lang, "Conflict Center", "冲突处理中心")}</h2>
          <div style={{ color: "#475569", maxWidth: 940 }}>
            {t(
              lang,
              "Review teacher, room, and appointment conflicts together. Filter the time range first, then resolve one session at a time with the action panels below.",
              "这里把老师、教室和约课冲突放到一起处理。先缩小日期范围，再逐条在下方动作区解决，不用来回切页。"
            )}
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <div style={workbenchMetricCardStyle("blue")}>
            <div style={workbenchMetricLabelStyle("blue")}>{t(lang, "Conflicts in range", "范围内冲突")}</div>
            <div style={workbenchMetricValueStyle("blue")}>{totalConflicts}</div>
          </div>
          <div style={{ ...workbenchMetricCardStyle("amber"), background: "#fff7ed" }}>
            <div style={workbenchMetricLabelStyle("amber")}>{t(lang, "Teacher conflicts", "老师冲突")}</div>
            <div style={workbenchMetricValueStyle("amber")}>{teacherConflictCount}</div>
          </div>
          <div style={{ ...workbenchMetricCardStyle("rose"), background: "#fff7f7" }}>
            <div style={workbenchMetricLabelStyle("rose")}>{t(lang, "Room conflicts", "教室冲突")}</div>
            <div style={workbenchMetricValueStyle("rose")}>{roomConflictCount}</div>
          </div>
          <div style={workbenchMetricCardStyle("indigo")}>
            <div style={workbenchMetricLabelStyle("indigo")}>{t(lang, "Appointment conflicts", "约课冲突")}</div>
            <div style={workbenchMetricValueStyle("indigo")}>{appointmentConflictCount}</div>
          </div>
        </div>
      </section>

      {resumedRememberedDesk ? (
        <WorkbenchActionBanner
          tone="info"
          title={t(lang, "Resumed your last conflict workbench filters", "已恢复你上次的冲突工作台筛选")}
          description={t(
            lang,
            "The previous date range and filter set are active again so you can continue investigating the same batch.",
            "系统已经恢复上次使用的日期范围和筛选条件，方便你继续处理同一批冲突。"
          )}
          actions={[
            { href: "/admin/conflicts?clearDesk=1", label: t(lang, "Back to default workbench", "回到默认工作台"), emphasis: "primary" },
          ]}
        />
      ) : null}

      <section
        style={{
          ...workbenchFilterPanelStyle,
          position: "sticky",
          top: 8,
          zIndex: 5,
          marginBottom: 12,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 800 }}>{t(lang, "Conflict work map", "冲突工作地图")}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {totalConflicts === 0
              ? t(lang, "The selected range is clear. Adjust filters if you want to inspect another time window.", "当前范围没有冲突，如需继续排查可调整日期范围。")
              : t(lang, "Start with filters, then work through the conflict cards. Use page navigation only after finishing the visible set.", "建议先看筛选，再逐条处理当前页冲突卡，处理完这页再翻页。")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="#conflict-filters" style={conflictSectionLinkStyle("#f8fafc", "#cbd5e1")}>
            <strong>{t(lang, "Filters", "筛选区")}</strong>
            <span style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Set date range, course, subject, and page size", "先设置日期、课程、科目和分页大小")}</span>
          </a>
          <a href="#conflict-results" style={conflictSectionLinkStyle("#fff7ed", "#fdba74")}>
            <strong>{t(lang, "Conflict cards", "冲突卡片")}</strong>
            <span style={{ fontSize: 12, color: "#9a3412" }}>{t(lang, "Resolve teacher, room, and appointment issues in place", "在同一区域处理老师、教室和约课问题")}</span>
          </a>
          <a href="#conflict-pagination" style={conflictSectionLinkStyle("#eef2ff", "#c7d2fe")}>
            <strong>{t(lang, "Page switch", "分页切换")}</strong>
            <span style={{ fontSize: 12, color: "#3730a3" }}>{t(lang, "Move to the next batch only after finishing this page", "当前页处理完再切下一批")}</span>
          </a>
        </div>
      </section>

      <div id="conflict-filters" style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fafafa", marginBottom: 12 }}>
        <form method="GET" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label>
            {t(lang, "From", "从")}:
            <input name="from" type="date" defaultValue={fromSafeStr} style={{ marginLeft: 6 }} />
          </label>
          <label>
            {t(lang, "To", "到")}:
            <input name="to" type="date" defaultValue={toSafeStr} style={{ marginLeft: 6 }} />
          </label>
          <ScheduleCourseFilter
            courses={courses.map((c) => ({ id: c.id, name: c.name }))}
            subjects={subjects.map((s) => ({ id: s.id, name: s.name, courseId: s.courseId, courseName: s.course.name }))}
            initialCourseId={filterCourseId}
            initialSubjectId={filterSubjectId}
            labels={{
              course: t(lang, "Course", "课程"),
              subject: t(lang, "Subject", "科目"),
              courseAll: t(lang, "Course (all)", "课程（全部）"),
              subjectAll: t(lang, "Subject (all)", "科目（全部）"),
            }}
          />
          <label>
            {t(lang, "Page size", "每页数量")}:
            <select name="pageSize" defaultValue={String(pageSize)} style={{ marginLeft: 6 }}>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </label>
          <button type="submit" data-apply-submit="1">{t(lang, "Apply", "应用")}</button>
        </form>
        <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
          {t(lang, "Conflicts in range", "所选范围冲突")}: <b>{totalConflicts}</b> | {t(lang, "Page", "页")}: <b>{currentPage}</b> /{" "}
          <b>{totalPages}</b>
        </div>
      </div>

      {err ? <NoticeBanner type="error" title={t(lang, "Error", "错误")} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "Success", "成功")} message={msg} /> : null}

      {totalConflicts === 0 ? (
        <WorkbenchActionBanner
          tone="info"
          title={t(lang, "No conflicts found in selected range", "所选范围内暂无冲突")}
          description={t(
            lang,
            "This time window is currently clear. Broaden the date range or switch back to the live schedule if you want to inspect another batch.",
            "当前时间范围内没有冲突。若你还想继续排查，可以放宽日期范围，或回到课表继续查看其他批次。"
          )}
          actions={[
            { href: "/admin/conflicts?clearDesk=1", label: t(lang, "Reset conflict desk", "重置冲突工作台"), emphasis: "primary" },
            { href: "/admin/schedule", label: t(lang, "Open schedule", "打开课表") },
          ]}
        />
      ) : (
        <>
          <div id="conflict-results" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
            {pagedConflicts.map((s) => {
            const teacherId = effectiveTeacherId(s);
            const cls = s.class;
            const conflictTeacherIds = Array.from(teacherConflicts.get(s.id) ?? []).map((id) => sessionMap.get(id)).filter(Boolean) as typeof sessions;
            const conflictRoomIds = Array.from(roomConflicts.get(s.id) ?? []).map((id) => sessionMap.get(id)).filter(Boolean) as typeof sessions;
            const conflictAppointments = teacherAppointmentConflicts.get(s.id) ?? [];
            const eligibleTeachers = teachers.filter((tch) => canTeachClass(tch, cls.courseId, cls.subjectId));
            const eligibleAppointmentTeachers = eligibleTeachers;
            const campusRooms = rooms.filter((r) => r.campusId === cls.campusId);
            const eligibleTeacherOptions = eligibleTeachers.map((x) => ({ id: x.id, name: x.name }));
            const campusRoomOptions = campusRooms.map((r) => ({ id: r.id, name: r.name, capacity: r.capacity }));
            const conflictTags = [
              conflictTeacherIds.length > 0 ? t(lang, "Teacher conflict", "老师冲突") : null,
              conflictRoomIds.length > 0 ? t(lang, "Room conflict", "教室冲突") : null,
              conflictAppointments.length > 0 ? t(lang, "Teacher appointment conflict", "老师约课冲突") : null,
            ].filter(Boolean) as string[];

            return (
              <div key={s.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontWeight: 700 }}>{fmtRange(s.startAt, s.endAt)}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {conflictTags.map((tag) => (
                      <WorkbenchStatusChip key={tag} label={tag} tone="warn" />
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 4, color: "#666", fontSize: 12 }}>
                  <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <ClassTypeBadge capacity={cls.capacity} compact />
                    <span>
                      {cls.course.name}
                      {cls.subject ? ` / ${cls.subject.name}` : ""}
                      {cls.level ? ` / ${cls.level.name}` : ""} | {cls.campus.name} / {cls.room?.name ?? "(none)"}
                    </span>
                  </span>
                </div>
                <div style={{ marginTop: 4, color: "#666", fontSize: 12 }}>
                  {t(lang, "Teacher", "老师")}: {s.teacher?.name ?? cls.teacher.name}
                </div>
                {s.student ? (
                  <div style={{ marginTop: 4, color: "#666", fontSize: 12 }}>
                    {t(lang, "Student", "学生")}: {s.student.name}
                  </div>
                ) : null}
                <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <a href={`/admin/classes/${cls.id}`}>{t(lang, "View Class", "查看班级")}</a>
                  <a href={`/admin/classes/${cls.id}/sessions`}>{t(lang, "Sessions", "课次")}</a>
                  <a href={`/admin/sessions/${s.id}/attendance`}>{t(lang, "Attendance", "点名")}</a>
                </div>

                {(conflictTeacherIds.length > 0 || conflictRoomIds.length > 0 || conflictAppointments.length > 0) && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#b45309" }}>
                    {conflictTeacherIds.length > 0 ? (
                      <div>
                        {t(lang, "Teacher conflict", "老师冲突")}:
                        <div style={{ marginTop: 4, color: "#8a4b08" }}>
                          {conflictTeacherIds.map((c) => (
                            <div key={c.id}>
                              {fmtRange(c.startAt, c.endAt)} | {c.class.course.name} /{" "}
                              {c.class.subject?.name ?? "-"} / {c.class.level?.name ?? "-"} |{" "}
                              {c.class.teacher.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {conflictRoomIds.length > 0 ? (
                      <div style={{ marginTop: 6 }}>
                        {t(lang, "Room conflict", "教室冲突")}:
                        <div style={{ marginTop: 4, color: "#8a4b08" }}>
                          {conflictRoomIds.map((c) => (
                            <div key={c.id}>
                              {fmtRange(c.startAt, c.endAt)} | {c.class.course.name} /{" "}
                              {c.class.subject?.name ?? "-"} / {c.class.level?.name ?? "-"} |{" "}
                              {c.class.room?.name ?? "(none)"}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {conflictAppointments.length > 0 ? (
                      <div style={{ marginTop: 6 }}>
                        {t(lang, "Teacher appointment conflict", "老师约课冲突")}:
                        <div style={{ marginTop: 4, color: "#8a4b08" }}>
                          {conflictAppointments.map((a) => (
                            <div key={a.id} style={{ borderTop: "1px dashed #fcd34d", paddingTop: 6, marginTop: 6 }}>
                              <div>
                                {fmtRange(a.startAt, a.endAt)} | {a.teacher?.name ?? "-"} | {a.student?.name ?? "-"}
                              </div>
                              <div style={{ marginTop: 6 }}>                                 <ConflictsAppointmentActionsClient                                   appointmentId={a.id}                                   classId={cls.id}                                   teachers={eligibleAppointmentTeachers.map((x) => ({ id: x.id, name: x.name }))}                                   defaultTeacherId={a.teacherId}                                   labels={{                                     changeTeacher: t(lang, "Change appointment teacher", "换约课老师"),                                     reasonOptional: t(lang, "Reason (optional)", "原因(可选)"),                                     confirmChange: t(lang, "Confirm Change Appointment Teacher", "确认更换约课老师"),                                     cancel: t(lang, "Cancel Appointment", "取消约课"),                                     errorPrefix: t(lang, "Error", "错误"),                                   }}                                 />                               </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  {conflictAppointments.length > 0 ? (
                    <div style={{ border: "1px solid #fde68a", borderRadius: 8, padding: 8, background: "#fffdf5" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 6 }}>
                        {t(lang, "A. Resolve Appointment", "A. 处理约课")}
                      </div>
                      <div style={{ fontSize: 12, color: "#92400e" }}>
                        {t(lang, "Use the controls above in appointment conflict section.", "请使用上方约课冲突区的操作。")}
                      </div>
                    </div>
                  ) : null}

                  <ConflictsSessionActionsClient
                    sessionId={s.id}
                    classId={cls.id}
                    eligibleTeachers={eligibleTeacherOptions}
                    defaultTeacherId={teacherId ?? ""}
                    rooms={campusRoomOptions}
                    defaultRoomId={cls.roomId ?? ""}
                    classCapacity={cls.capacity}
                    rangeFrom={fromSafeStr}
                    rangeTo={toSafeStr}
                    labels={{
                      errorPrefix: t(lang, "Error", "错误"),
                      changeSessionTeacher: t(lang, "B. Resolve Session", "B. 处理课次"),
                      reasonOptional: t(lang, "Reason (optional)", "原因(可选)"),
                      confirmChangeSessionTeacher: t(lang, "Confirm Change Session Teacher", "确认更换课次老师"),
                      noEligibleTeachers: t(lang, "No eligible teachers for this course.", "该课程暂无可选老师。"),
                      changeRoomClass: t(lang, "Change Room (class)", "换教室(班级)"),
                      noneRoom: t(lang, "(none)", "(无)"),
                      capacityLabel: t(lang, "capacity", "容量"),
                      confirm: t(lang, "Confirm", "确认"),
                      noRooms: t(lang, "No rooms available in this campus.", "该校区暂无教室。"),
                      cancelSession: t(lang, "Cancel Session", "取消课次"),
                      roomNote: t(lang, "Note: changing room affects the whole class (in selected date range).", "提示: 换教室会影响该班级(所选日期范围内)。"),
                      disabledRoomNotePrefix: t(lang, `Some rooms are disabled because class capacity is ${cls.capacity}.`, `部分教室已禁用: 当前班级容量为 ${cls.capacity}。`),
                    }}
                  />
                </div>
              </div>
            );
            })}
          </div>
          <div id="conflict-pagination" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <a
              href={prevHref}
              style={{
                pointerEvents: currentPage <= 1 ? "none" : "auto",
                opacity: currentPage <= 1 ? 0.5 : 1,
              }}
            >
              {t(lang, "Previous", "上一页")}
            </a>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {t(lang, "Showing", "显示")} {pageStart + 1}-{Math.min(pageStart + pageSize, totalConflicts)} / {totalConflicts}
            </div>
            <a
              href={nextHref}
              style={{
                pointerEvents: currentPage >= totalPages ? "none" : "auto",
                opacity: currentPage >= totalPages ? 0.5 : 1,
              }}
            >
              {t(lang, "Next", "下一页")}
            </a>
          </div>
        </>
      )}
    </div>
  );
}
