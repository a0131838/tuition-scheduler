import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import AdminStudentsClient from "./AdminStudentsClient";

const PARTNER_SOURCE_NAME = "新东方学生";
const PARTNER_TYPE_NAME = "合作方学生";

const GRADE_OPTIONS = [
  "G1",
  "G2",
  "G3",
  "G4",
  "G5",
  "G6",
  "G7",
  "G8",
  "G9",
  "G10",
  "G11",
  "G12",
  "G13",
  "UG1",
  "UG2",
  "UG3",
  "UG4",
  "大一",
  "大二",
  "大三",
  "大四",
];

function first(v?: string | string[]) {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

function getSingaporeDayBounds(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value ?? "2000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  const start = new Date(`${year}-${month}-${day}T00:00:00+08:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    sourceChannelId?: string | string[];
    studentTypeId?: string | string[];
    q?: string | string[];
    page?: string | string[];
    pageSize?: string | string[];
    view?: string | string[];
  }>;
}) {
  const lang = await getLang();
  const sp = await searchParams;
  const sourceChannelId = first(sp?.sourceChannelId);
  const studentTypeId = first(sp?.studentTypeId);
  const q = first(sp?.q).trim();
  const requestedView = first(sp?.view).trim();
  const view = requestedView === "all" || requestedView === "today_partner" ? requestedView : "today";
  const requestedPage = Math.max(1, Number.parseInt(first(sp?.page) || "1", 10) || 1);
  const pageSizeRaw = Number.parseInt(first(sp?.pageSize) || "20", 10);
  const pageSize = [20, 50, 100].includes(pageSizeRaw) ? pageSizeRaw : 20;
  const { start: todayStart, end: todayEnd } = getSingaporeDayBounds();

  const [sources, types] = await Promise.all([
    prisma.studentSourceChannel.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.studentType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const partnerSourceId = sources.find((s) => s.name === PARTNER_SOURCE_NAME)?.id ?? "";
  const partnerTypeId = types.find((x) => x.name === PARTNER_TYPE_NAME)?.id ?? "";

  const where: Record<string, unknown> = {};
  if (sourceChannelId) where.sourceChannelId = sourceChannelId;
  if (studentTypeId) where.studentTypeId = studentTypeId;
  if (view !== "all") {
    where.createdAt = { gte: todayStart, lt: todayEnd };
  }
  if (view === "today_partner") {
    if (partnerSourceId) where.sourceChannelId = partnerSourceId;
    if (partnerTypeId) where.studentTypeId = partnerTypeId;
  }
  if (q) {
    where.OR = [
      { id: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { school: { contains: q, mode: "insensitive" } },
      { grade: { contains: q, mode: "insensitive" } },
      { targetSchool: { contains: q, mode: "insensitive" } },
      { currentMajor: { contains: q, mode: "insensitive" } },
      { coachingContent: { contains: q, mode: "insensitive" } },
      { note: { contains: q, mode: "insensitive" } },
    ];
  }

  const [filteredCount, allStudentsCount, todayCount, todayPartnerCount] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.count(),
    prisma.student.count({ where: { createdAt: { gte: todayStart, lt: todayEnd } } }),
    prisma.student.count({
      where: {
        createdAt: { gte: todayStart, lt: todayEnd },
        ...(partnerSourceId ? { sourceChannelId: partnerSourceId } : {}),
        ...(partnerTypeId ? { studentTypeId: partnerTypeId } : {}),
      },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const page = Math.min(requestedPage, totalPages);

  const students = await prisma.student.findMany({
    where,
    include: { sourceChannel: true, studentType: true },
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const unpaidCounts = students.length
    ? await prisma.coursePackage.groupBy({
        by: ["studentId"],
        where: { studentId: { in: students.map((s) => s.id) }, paid: false },
        _count: { _all: true },
      })
    : [];

  const unpaidMap = new Map(unpaidCounts.map((u) => [u.studentId, u._count._all]));

  const buildPageHref = (targetPage: number, nextView = view) => {
    const params = new URLSearchParams();
    if (sourceChannelId) params.set("sourceChannelId", sourceChannelId);
    if (studentTypeId) params.set("studentTypeId", studentTypeId);
    if (q) params.set("q", q);
    if (nextView !== "today") params.set("view", nextView);
    params.set("pageSize", String(pageSize));
    if (targetPage > 1) params.set("page", String(targetPage));
    const queryString = params.toString();
    return queryString ? `/admin/students?${queryString}` : "/admin/students";
  };

  const activeViewLabel =
    view === "today_partner"
      ? t(lang, "Today Partner Intake", "今日合作方新增")
      : view === "all"
        ? t(lang, "All Students", "全部学生")
        : t(lang, "Today New Students", "今日新增");

  const noStudentsLabel =
    view === "today_partner"
      ? t(lang, "No partner students added today.", "今天暂无合作方新增学生")
      : view === "all"
        ? t(lang, "No students yet.", "暂无学生")
        : t(lang, "No students added today.", "今天暂无新增学生");

  return (
    <div>
      <h2>{t(lang, "Students", "学生")}</h2>

      <div style={{ display: "grid", gap: 10, marginBottom: 14, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
        <a
          href={buildPageHref(1, "today")}
          style={{
            display: "block",
            padding: 12,
            borderRadius: 10,
            border: view === "today" ? "1px solid #0f766e" : "1px solid #d1d5db",
            background: view === "today" ? "#ecfeff" : "#fff",
            color: "#111827",
            textDecoration: "none",
          }}
        >
          <div style={{ fontSize: 12, color: "#4b5563" }}>{t(lang, "Default View", "默认视图")}</div>
          <div style={{ fontWeight: 700, marginTop: 4 }}>{t(lang, "Today New Students", "今日新增")}</div>
          <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700 }}>{todayCount}</div>
        </a>
        <a
          href={buildPageHref(1, "today_partner")}
          style={{
            display: "block",
            padding: 12,
            borderRadius: 10,
            border: view === "today_partner" ? "1px solid #7c3aed" : "1px solid #d1d5db",
            background: view === "today_partner" ? "#f5f3ff" : "#fff",
            color: "#111827",
            textDecoration: "none",
          }}
        >
          <div style={{ fontSize: 12, color: "#4b5563" }}>{t(lang, "Partner Intake", "合作方录入")}</div>
          <div style={{ fontWeight: 700, marginTop: 4 }}>{t(lang, "Today Partner Students", "今日合作方新增")}</div>
          <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700 }}>{todayPartnerCount}</div>
        </a>
        <a
          href={buildPageHref(1, "all")}
          style={{
            display: "block",
            padding: 12,
            borderRadius: 10,
            border: view === "all" ? "1px solid #1d4ed8" : "1px solid #d1d5db",
            background: view === "all" ? "#eff6ff" : "#fff",
            color: "#111827",
            textDecoration: "none",
          }}
        >
          <div style={{ fontSize: 12, color: "#4b5563" }}>{t(lang, "Full List", "完整列表")}</div>
          <div style={{ fontWeight: 700, marginTop: 4 }}>{t(lang, "All Students", "全部学生")}</div>
          <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700 }}>{allStudentsCount}</div>
        </a>
      </div>

      <div style={{ marginBottom: 12, padding: 10, borderRadius: 10, border: "1px solid #dbeafe", background: "#f8fbff", color: "#1e3a8a" }}>
        {t(lang, "Current view", "当前视图")}: <b>{activeViewLabel}</b>
      </div>

      <h3>{t(lang, "Filter", "筛选")}</h3>
      <form method="GET" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder={t(lang, "Search name/school/notes/ID", "搜索姓名/学校/备注/ID")}
          style={{ minWidth: 240 }}
        />
        <select name="view" defaultValue={view}>
          <option value="today">{t(lang, "Today New Students", "今日新增")}</option>
          <option value="today_partner">{t(lang, "Today Partner Students", "今日合作方新增")}</option>
          <option value="all">{t(lang, "All Students", "全部学生")}</option>
        </select>
        <select name="sourceChannelId" defaultValue={sourceChannelId}>
          <option value="">{t(lang, "All Sources", "全部来源")}</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="studentTypeId" defaultValue={studentTypeId}>
          <option value="">{t(lang, "All Types", "全部类型")}</option>
          {types.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <select name="pageSize" defaultValue={String(pageSize)}>
          <option value="20">20 / {t(lang, "page", "页")}</option>
          <option value="50">50 / {t(lang, "page", "页")}</option>
          <option value="100">100 / {t(lang, "page", "页")}</option>
        </select>
        <button type="submit" data-apply-submit="1">{t(lang, "Apply", "应用")}</button>
        <a href="/admin/students">{t(lang, "Clear", "清除")}</a>
      </form>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, fontSize: 13 }}>
        <span>
          {t(lang, "Showing", "显示")} {students.length} / {filteredCount}
        </span>
        <span>
          {t(lang, "Page", "页")} {page} / {totalPages}
        </span>
        <a
          href={page > 1 ? buildPageHref(page - 1, view) : "#"}
          style={{ pointerEvents: page > 1 ? "auto" : "none", opacity: page > 1 ? 1 : 0.4 }}
        >
          {t(lang, "Prev", "上一页")}
        </a>
        <a
          href={page < totalPages ? buildPageHref(page + 1, view) : "#"}
          style={{ pointerEvents: page < totalPages ? "auto" : "none", opacity: page < totalPages ? 1 : 0.4 }}
        >
          {t(lang, "Next", "下一页")}
        </a>
      </div>

      <AdminStudentsClient
        initialStudents={students.map((s) => ({
          id: s.id,
          name: s.name,
          school: s.school ?? null,
          birthDate: s.birthDate ? new Date(s.birthDate).toISOString() : null,
          grade: s.grade ?? null,
          sourceName: s.sourceChannel?.name ?? null,
          typeName: s.studentType?.name ?? null,
          note: s.note ?? null,
          createdAt: s.createdAt.toISOString(),
          targetSchool: s.targetSchool ?? null,
          currentMajor: s.currentMajor ?? null,
          coachingContent: s.coachingContent ?? null,
          unpaidCount: unpaidMap.get(s.id) ?? 0,
        }))}
        sources={sources.map((s) => ({ id: s.id, name: s.name }))}
        types={types.map((x) => ({ id: x.id, name: x.name }))}
        gradeOptions={GRADE_OPTIONS}
        labels={{
          add: t(lang, "Add", "新增"),
          addStudent: t(lang, "Add Student", "新增学生"),
          name: t(lang, "Name", "姓名"),
          school: t(lang, "School", "学校"),
          birth: t(lang, "Birth", "出生日期"),
          grade: t(lang, "Grade", "年级"),
          source: t(lang, "Source", "来源"),
          type: t(lang, "Type", "类型"),
          unpaid: t(lang, "Unpaid", "未付款"),
          notes: t(lang, "Notes", "备注"),
          targetSchool: t(lang, "Target School", "申请目标院校"),
          currentMajor: t(lang, "Current Major", "目前专业"),
          coachingContent: t(lang, "Coaching Content", "辅导内容"),
          id: "ID",
          action: t(lang, "Action", "操作"),
          edit: t(lang, "Edit", "编辑"),
          delete: t(lang, "Delete", "删除"),
          deleteConfirm: t(
            lang,
            "Delete student? This also deletes enrollments/appointments/packages.",
            "删除学生？将同时删除报名/预约/课包。"
          ),
          ok: t(lang, "OK", "成功"),
          error: t(lang, "Error", "错误"),
          created: t(lang, "Created", "已创建"),
          noStudents: noStudentsLabel,
        }}
      />
    </div>
  );
}
