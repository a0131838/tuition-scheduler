import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import RememberedWorkbenchQueryClient from "../_components/RememberedWorkbenchQueryClient";
import WorkbenchScrollMemoryClient from "../_components/WorkbenchScrollMemoryClient";
import AdminStudentsClient from "./AdminStudentsClient";
import CopyTextButton from "../_components/CopyTextButton";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchInfoBarStyle,
} from "../_components/workbenchStyles";
import {
  buildStudentParentIntakeAbsoluteUrl,
  buildStudentParentIntakePath,
  createStudentParentIntakeLink,
  deleteStudentParentIntakeLink,
  listRecentStudentParentIntakes,
} from "@/lib/student-parent-intake";

const PARTNER_SOURCE_NAME = "新东方学生";
const PARTNER_TYPE_NAME = "合作方学生";
const STUDENT_VIEW_COOKIE = "adminStudentsPreferredView";
type StudentView = "today" | "today_partner" | "all";

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

function normalizeStudentView(value: string): StudentView {
  return value === "all" || value === "today_partner" ? value : "today";
}

function normalizeStudentPageSize(value: string) {
  return value === "50" || value === "100" ? value : "20";
}

function parseRememberedStudentDesk(raw: string) {
  let normalizedRaw = raw;
  try {
    normalizedRaw = decodeURIComponent(raw);
  } catch {
    normalizedRaw = raw;
  }
  if (!normalizedRaw.includes("=")) {
    return {
      view: normalizeStudentView(normalizedRaw),
      sourceChannelId: "",
      studentTypeId: "",
      q: "",
      pageSize: "20",
      value: normalizeStudentView(normalizedRaw) === "today" ? "" : `view=${normalizeStudentView(normalizedRaw)}`,
    };
  }
  const params = new URLSearchParams(normalizedRaw);
  const view = normalizeStudentView(String(params.get("view") ?? "").trim());
  const sourceChannelId = String(params.get("sourceChannelId") ?? "").trim();
  const studentTypeId = String(params.get("studentTypeId") ?? "").trim();
  const q = String(params.get("q") ?? "").trim();
  const pageSize = normalizeStudentPageSize(String(params.get("pageSize") ?? "").trim());
  const normalized = new URLSearchParams();
  if (view !== "today") normalized.set("view", view);
  if (sourceChannelId) normalized.set("sourceChannelId", sourceChannelId);
  if (studentTypeId) normalized.set("studentTypeId", studentTypeId);
  if (q) normalized.set("q", q);
  if (pageSize !== "20") normalized.set("pageSize", pageSize);
  return {
    view,
    sourceChannelId,
    studentTypeId,
    q,
    pageSize,
    value: normalized.toString(),
  };
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
    clearDesk?: string | string[];
    sourceChannelId?: string | string[];
    studentTypeId?: string | string[];
    q?: string | string[];
    page?: string | string[];
    pageSize?: string | string[];
    view?: string | string[];
    msg?: string | string[];
    err?: string | string[];
  }>;
}) {
  const lang = await getLang();
  const sp = await searchParams;
  const msg = first(sp?.msg).trim();
  const err = first(sp?.err).trim();
  const clearDesk = first(sp?.clearDesk).trim() === "1";
  const hasSourceChannelParam = typeof sp?.sourceChannelId !== "undefined";
  const hasStudentTypeParam = typeof sp?.studentTypeId !== "undefined";
  const hasQParam = typeof sp?.q !== "undefined";
  const hasPageSizeParam = typeof sp?.pageSize !== "undefined";
  const sourceChannelId = first(sp?.sourceChannelId);
  const studentTypeId = first(sp?.studentTypeId);
  const qParam = first(sp?.q).trim();
  const requestedView = first(sp?.view).trim();
  const hasExplicitView = requestedView.length > 0;
  const requestedPageSize = first(sp?.pageSize).trim();
  const cookieStore = await cookies();
  const admin = await requireAdmin();
  const canDeleteParentIntakeLinks = admin.email.trim().toLowerCase() === "zhaohongwei0880@gmail.com";
  const canResumeRememberedDesk =
    !clearDesk && !hasExplicitView && !hasSourceChannelParam && !hasStudentTypeParam && !hasQParam && !hasPageSizeParam;
  const rememberedDesk = canResumeRememberedDesk
    ? parseRememberedStudentDesk(cookieStore.get(STUDENT_VIEW_COOKIE)?.value ?? "")
    : {
        view: "today" as StudentView,
        sourceChannelId: "",
        studentTypeId: "",
        q: "",
        pageSize: "20",
        value: "",
      };
  const q = hasQParam ? qParam : rememberedDesk.q;
  const resolvedSourceChannelId = hasSourceChannelParam ? sourceChannelId : rememberedDesk.sourceChannelId;
  const resolvedStudentTypeId = hasStudentTypeParam ? studentTypeId : rememberedDesk.studentTypeId;
  const view = hasExplicitView ? normalizeStudentView(requestedView) : rememberedDesk.view;
  const resumedRememberedDesk = canResumeRememberedDesk && Boolean(rememberedDesk.value);
  const rememberedDeskValue = (() => {
    const params = new URLSearchParams();
    if (view !== "today") params.set("view", view);
    if (resolvedSourceChannelId) params.set("sourceChannelId", resolvedSourceChannelId);
    if (resolvedStudentTypeId) params.set("studentTypeId", resolvedStudentTypeId);
    if (q) params.set("q", q);
    const normalizedPageSize = normalizeStudentPageSize(hasPageSizeParam ? requestedPageSize : rememberedDesk.pageSize);
    if (normalizedPageSize !== "20") params.set("pageSize", normalizedPageSize);
    return params.toString();
  })();
  const hasExplicitContext = hasExplicitView || hasSourceChannelParam || hasStudentTypeParam || hasQParam || hasPageSizeParam;
  const requestedPage = Math.max(1, Number.parseInt(first(sp?.page) || "1", 10) || 1);
  const pageSizeRaw = Number.parseInt(hasPageSizeParam ? requestedPageSize : rememberedDesk.pageSize || "20", 10);
  const pageSize = [20, 50, 100].includes(pageSizeRaw) ? pageSizeRaw : 20;
  const { start: todayStart, end: todayEnd } = getSingaporeDayBounds();

  async function createParentIntakeAction() {
    "use server";
    const admin = await requireAdmin();
    try {
      await createStudentParentIntakeLink({
        createdByUserId: admin.id,
        label: `Created by ${admin.email}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Create parent intake link failed";
      redirect(`/admin/students?err=${encodeURIComponent(message)}`);
    }
    redirect(`/admin/students?msg=${encodeURIComponent("Parent intake link created")}`);
  }

  async function deleteParentIntakeAction(formData: FormData) {
    "use server";
    const admin = await requireAdmin();
    const intakeId = String(formData.get("intakeId") ?? "").trim();
    if (!intakeId) {
      redirect(`/admin/students?err=${encodeURIComponent("Parent intake link id is required")}`);
    }
    try {
      await deleteStudentParentIntakeLink({
        intakeId,
        actorEmail: admin.email,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete parent intake link failed";
      redirect(`/admin/students?err=${encodeURIComponent(message)}`);
    }
    redirect(`/admin/students?msg=${encodeURIComponent("Parent intake link deleted")}`);
  }

  const [sources, types, recentParentIntakes] = await Promise.all([
    prisma.studentSourceChannel.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.studentType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    listRecentStudentParentIntakes(8),
  ]);

  const activeParentIntakes = recentParentIntakes.filter(
    (intake) => !intake.studentId && !intake.packageId && !intake.contractId
  );
  const archivedParentIntakes = recentParentIntakes.filter(
    (intake) => intake.studentId || intake.packageId || intake.contractId
  );

  const partnerSourceId = sources.find((s) => s.name === PARTNER_SOURCE_NAME)?.id ?? "";
  const partnerTypeId = types.find((x) => x.name === PARTNER_TYPE_NAME)?.id ?? "";

  const where: Record<string, unknown> = {};
  if (resolvedSourceChannelId) where.sourceChannelId = resolvedSourceChannelId;
  if (resolvedStudentTypeId) where.studentTypeId = resolvedStudentTypeId;
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
    if (resolvedSourceChannelId) params.set("sourceChannelId", resolvedSourceChannelId);
    if (resolvedStudentTypeId) params.set("studentTypeId", resolvedStudentTypeId);
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
  const rememberedViewLabel =
    rememberedDesk.view === "today_partner"
      ? t(lang, "Today Partner Intake", "今日合作方新增")
      : rememberedDesk.view === "all"
        ? t(lang, "All Students", "全部学生")
        : t(lang, "Today New Students", "今日新增");

  const noStudentsLabel =
    view === "today_partner"
      ? t(lang, "No partner students added today.", "今天暂无合作方新增学生")
      : view === "all"
        ? t(lang, "No students yet.", "暂无学生")
        : t(lang, "No students added today.", "今天暂无新增学生");
  const activeFilterCount = [q, resolvedSourceChannelId, resolvedStudentTypeId].filter(Boolean).length;
  const filtersOpen = activeFilterCount > 0 || view !== "today";
  const showEmptyQueueCta = filteredCount === 0 && !q && !resolvedSourceChannelId && !resolvedStudentTypeId && view !== "all";
  const hasNarrowScope = view !== "all" || activeFilterCount > 0;
  const scopeSummary =
    view === "all"
      ? t(lang, "Showing the full student list.", "当前显示的是完整学生列表。")
      : view === "today_partner"
        ? t(lang, "Showing only today's partner-intake students.", "当前只显示今天的合作方录入学生。")
        : t(lang, "Showing only today's newly added students.", "当前只显示今天新增的学生。");
  const emptyQueueMessage =
    view === "today_partner"
      ? t(
          lang,
          "No partner intake is waiting today. Jump to the full student list if you want to continue older follow-up work.",
          "今天没有待处理的合作方新增学生；如果你要继续处理旧跟进，可直接切到全部学生。"
        )
      : t(
          lang,
          "No new students were added today. Jump to the full student list if you want to continue older follow-up work.",
          "今天没有新增学生；如果你要继续处理旧跟进，可直接切到全部学生。"
        );

  return (
    <div>
      <RememberedWorkbenchQueryClient
        cookieKey={STUDENT_VIEW_COOKIE}
        storageKey="adminStudentsPreferredView"
        value={rememberedDeskValue}
      />
      <WorkbenchScrollMemoryClient storageKey="adminStudentsScroll" />
      <div style={workbenchHeroStyle("blue")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#3730a3", letterSpacing: 0.4 }}>
            {t(lang, "Student Intake Desk", "学生录入工作台")}
          </div>
          <h2 style={{ margin: 0 }}>{t(lang, "Students", "学生")}</h2>
          <div style={{ color: "#475569", lineHeight: 1.5 }}>
            {t(
              lang,
              "Use the top cards to choose today's intake view first, then use the list below for search, follow-up, and profile edits.",
              "先用上方卡片切换今天的录入视图，再在下方列表里做搜索、跟进和资料编辑。"
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ padding: "4px 10px", borderRadius: 999, background: "#fff", border: "1px solid #cbd5e1", color: "#334155", fontSize: 12 }}>
            {t(lang, "Current view", "当前视图")}: <b>{activeViewLabel}</b>
          </span>
          <span style={{ padding: "4px 10px", borderRadius: 999, background: "#fff", border: "1px solid #cbd5e1", color: "#334155", fontSize: 12 }}>
            {t(lang, "Filtered students", "筛选后学生")}: <b>{filteredCount}</b>
          </span>
          <span style={{ padding: "4px 10px", borderRadius: 999, background: "#fff", border: "1px solid #cbd5e1", color: "#334155", fontSize: 12 }}>
            {t(lang, "Active filters", "生效筛选")}: <b>{activeFilterCount}</b>
          </span>
          {hasNarrowScope ? (
            <a
              href="/admin/students?view=all&clearDesk=1"
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1d4ed8",
                fontSize: 12,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              {t(lang, "Show full list", "查看完整列表")}
            </a>
          ) : null}
        </div>
      </div>

      {msg ? (
        <div style={{ ...workbenchInfoBarStyle, marginTop: 10, marginBottom: 12, borderColor: "#86efac", background: "#ecfdf3", color: "#166534" }}>
          {msg}
        </div>
      ) : null}
      {err ? (
        <div style={{ ...workbenchInfoBarStyle, marginTop: 10, marginBottom: 12, borderColor: "#fdba74", background: "#fff7ed", color: "#9a3412" }}>
          {err}
        </div>
      ) : null}

      <div
        style={{
          marginBottom: 12,
          padding: 14,
          borderRadius: 14,
          border: "1px solid #dbeafe",
          background: "#f8fbff",
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontWeight: 800, color: "#1d4ed8" }}>{t(lang, "Parent intake links", "家长资料链接")}</div>
            <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.5 }}>
              {t(
                lang,
                "Use this before a student exists in the system. The parent fills the student and guardian basics first, then ops completes the first-purchase details from the student profile.",
                "当学生还没进系统时，从这里发送家长资料链接。家长先填学生与监护人基础资料，之后由教务在学生详情页补首购信息。"
              )}
            </div>
          </div>
          <form action={createParentIntakeAction}>
            <button
              type="submit"
              style={{
                borderRadius: 999,
                border: "1px solid #2563eb",
                background: "#2563eb",
                color: "#fff",
                padding: "8px 14px",
                fontWeight: 800,
              }}
            >
              {t(lang, "Create parent intake link", "创建家长资料链接")}
            </button>
          </form>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {activeParentIntakes.length ? (
            activeParentIntakes.map((intake) => {
              const intakeHref = buildStudentParentIntakePath(intake.token);
              const intakeAbsoluteUrl = buildStudentParentIntakeAbsoluteUrl(intake.token);
              const canDeleteThisIntake =
                canDeleteParentIntakeLinks &&
                !intake.studentId &&
                !intake.packageId &&
                !intake.contractId &&
                (intake.status === "LINK_SENT" || intake.status === "VOID");
              const tone =
                intake.status === "LINK_SENT"
                  ? { bg: "#eff6ff", fg: "#1d4ed8", border: "#bfdbfe" }
                  : intake.status === "SUBMITTED"
                    ? { bg: "#fef3c7", fg: "#92400e", border: "#fde68a" }
                    : intake.status === "CONTRACT_READY"
                      ? { bg: "#dcfce7", fg: "#166534", border: "#86efac" }
                      : intake.status === "SIGNED"
                        ? { bg: "#ecfdf3", fg: "#166534", border: "#86efac" }
                        : { bg: "#f3f4f6", fg: "#475569", border: "#d1d5db" };
              return (
                <div
                  key={intake.id}
                  style={{
                    border: `1px solid ${tone.border}`,
                    borderRadius: 12,
                    padding: "12px 14px",
                    background: "#fff",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          minHeight: 28,
                          padding: "4px 10px",
                          borderRadius: 999,
                          background: tone.bg,
                          color: tone.fg,
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {intake.status}
                      </span>
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        {t(lang, "Created", "创建于")} {intake.createdAt.toLocaleString("en-SG")}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <a href={intakeHref} target="_blank" rel="noreferrer">
                        {t(lang, "Open link", "打开链接")}
                      </a>
                      <CopyTextButton
                        text={intakeAbsoluteUrl}
                        label={t(lang, "Copy link", "复制链接")}
                        copiedLabel={t(lang, "Copied", "已复制")}
                        style={{ borderRadius: 999, border: "1px solid #cbd5e1", background: "#fff", padding: "6px 10px", fontWeight: 700 }}
                      />
                      {intake.studentId ? (
                        <a href={`/admin/students/${encodeURIComponent(intake.studentId)}`}>
                          {t(lang, "Open student", "打开学生")}
                        </a>
                      ) : null}
                      {canDeleteThisIntake ? (
                        <form action={deleteParentIntakeAction}>
                          <input type="hidden" name="intakeId" value={intake.id} />
                          <button
                            type="submit"
                            style={{
                              borderRadius: 999,
                              border: "1px solid #fecaca",
                              background: "#fff1f2",
                              color: "#b91c1c",
                              padding: "6px 10px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            {t(lang, "Delete link", "删除链接")}
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                  <div style={{ color: "#334155", fontSize: 13, lineHeight: 1.5 }}>
                    {intake.studentName
                      ? `${t(lang, "Student", "学生")}: ${intake.studentName}`
                      : t(lang, "Waiting for the parent to submit the student profile.", "正在等待家长提交学生资料。")}
                    {intake.packageId && intake.contractId
                      ? ` · ${t(lang, "First purchase contract ready", "首购合同已准备")}`
                      : ""}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ fontSize: 13, color: "#475569" }}>
              {t(
                lang,
                "No active parent intake links right now. Create one above to start the new-student flow.",
                "当前没有待使用的家长资料链接。先在上方创建一个，启动新生建档流程。"
              )}
            </div>
          )}
        </div>

        {archivedParentIntakes.length ? (
          <details
            style={{
              border: "1px solid #dbeafe",
              borderRadius: 12,
              background: "#fff",
              padding: 12,
            }}
          >
            <summary style={{ cursor: "pointer", fontWeight: 800, color: "#334155" }}>
              {t(lang, "Used link history", "已使用链接历史")} ({archivedParentIntakes.length})
            </summary>
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.45 }}>
                {t(
                  lang,
                  "Submitted or already-linked parent intake rows stay here as history. Only unused mistaken links can be deleted.",
                  "已经提交或已关联学生/课包/合同的家长资料链接会保留在这里作为历史。只有尚未使用的误建链接可以删除。"
                )}
              </div>
              {archivedParentIntakes.map((intake) => {
                const intakeHref = buildStudentParentIntakePath(intake.token);
                const intakeAbsoluteUrl = buildStudentParentIntakeAbsoluteUrl(intake.token);
                const tone =
                  intake.status === "SUBMITTED"
                    ? { bg: "#fef3c7", fg: "#92400e", border: "#fde68a" }
                    : intake.status === "CONTRACT_READY"
                      ? { bg: "#dcfce7", fg: "#166534", border: "#86efac" }
                      : intake.status === "SIGNED"
                        ? { bg: "#ecfdf3", fg: "#166534", border: "#86efac" }
                        : { bg: "#f3f4f6", fg: "#475569", border: "#d1d5db" };
                return (
                  <div
                    key={intake.id}
                    style={{
                      border: `1px solid ${tone.border}`,
                      borderRadius: 12,
                      padding: "12px 14px",
                      background: "#fff",
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            minHeight: 28,
                            padding: "4px 10px",
                            borderRadius: 999,
                            background: tone.bg,
                            color: tone.fg,
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {intake.status}
                        </span>
                        <span style={{ fontSize: 12, color: "#64748b" }}>
                          {t(lang, "Created", "创建于")} {intake.createdAt.toLocaleString("en-SG")}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <a href={intakeHref} target="_blank" rel="noreferrer">
                          {t(lang, "Open link", "打开链接")}
                        </a>
                        <CopyTextButton
                          text={intakeAbsoluteUrl}
                          label={t(lang, "Copy link", "复制链接")}
                          copiedLabel={t(lang, "Copied", "已复制")}
                          style={{ borderRadius: 999, border: "1px solid #cbd5e1", background: "#fff", padding: "6px 10px", fontWeight: 700 }}
                        />
                        {intake.studentId ? (
                          <a href={`/admin/students/${encodeURIComponent(intake.studentId)}`}>
                            {t(lang, "Open student", "打开学生")}
                          </a>
                        ) : null}
                      </div>
                    </div>
                    <div style={{ color: "#334155", fontSize: 13, lineHeight: 1.5 }}>
                      {intake.studentName
                        ? `${t(lang, "Student", "学生")}: ${intake.studentName}`
                        : t(lang, "Waiting for the parent to submit the student profile.", "正在等待家长提交学生资料。")}
                      {intake.packageId && intake.contractId
                        ? ` · ${t(lang, "First purchase contract ready", "首购合同已准备")}`
                        : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        ) : null}
      </div>

      <div
        style={{
          ...workbenchInfoBarStyle,
          marginTop: 10,
          marginBottom: 12,
          borderColor: resumedRememberedDesk ? "#f59e0b" : "#bfdbfe",
          background: resumedRememberedDesk ? "#fffbeb" : "#eff6ff",
          color: resumedRememberedDesk ? "#92400e" : "#1e3a8a",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 700 }}>
            {resumedRememberedDesk
              ? t(lang, "Restored your last student desk", "已恢复你上次使用的学生工作台")
              : t(lang, "Current dataset scope", "当前数据范围")}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.45 }}>
            {resumedRememberedDesk
              ? t(
                  lang,
                  `You returned without explicit filters, so the desk reopened ${rememberedViewLabel} with your last search context. Double-check the scope before assuming this is the full list.`,
                  `你这次没有显式指定筛选，所以系统恢复到了 ${rememberedViewLabel} 和你上次的搜索范围。请先确认当前范围，再判断这是不是完整列表。`
                )
              : scopeSummary}
          </div>
          <div style={{ fontSize: 13 }}>
            {t(lang, "Showing", "显示")} <b>{filteredCount}</b> / <b>{allStudentsCount}</b>{" "}
            {t(lang, "students in the system", "名系统内学生")}
            {activeFilterCount > 0
              ? ` · ${t(lang, "Search filters are active", "当前仍有搜索筛选生效")}`
              : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {hasNarrowScope ? (
            <a href="/admin/students?view=all&clearDesk=1" style={{ fontWeight: 700 }}>
              {t(lang, "Open full student list", "打开完整学生列表")}
            </a>
          ) : null}
          {resumedRememberedDesk || activeFilterCount > 0 ? (
            <a href="/admin/students?clearDesk=1" style={{ fontWeight: 700 }}>
              {t(lang, "Clear restored filters", "清除恢复筛选")}
            </a>
          ) : null}
        </div>
      </div>

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

      <details open={filtersOpen} style={{ ...workbenchFilterPanelStyle, marginBottom: 12 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>
          {t(lang, "Search & filters", "搜索与筛选")} ({activeFilterCount})
        </summary>
        <div style={{ marginTop: 10, color: "#64748b", fontSize: 12 }}>
          {t(
            lang,
            "Keep this folded when you are processing one intake queue. Open it only when you need a broader search.",
            "专注处理单一录入队列时可先收起；只有需要跨范围搜索时再展开。"
          )}
        </div>
        <form method="GET" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder={t(lang, "Search name, school, notes, or ID", "搜索姓名、学校、备注或ID")}
            style={{ minWidth: 240 }}
          />
          <select name="view" defaultValue={view}>
            <option value="today">{t(lang, "Today New Students", "今日新增")}</option>
            <option value="today_partner">{t(lang, "Today Partner Students", "今日合作方新增")}</option>
            <option value="all">{t(lang, "All Students", "全部学生")}</option>
          </select>
          <select name="sourceChannelId" defaultValue={resolvedSourceChannelId}>
            <option value="">{t(lang, "All Sources", "全部来源")}</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select name="studentTypeId" defaultValue={resolvedStudentTypeId}>
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
          <a href="/admin/students?clearDesk=1">{t(lang, "Clear", "清除")}</a>
        </form>
      </details>

      <div style={workbenchInfoBarStyle}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", fontSize: 13 }}>
          <span>
            {t(lang, "Showing", "显示")} {students.length} / {filteredCount}
          </span>
          <span>
            {t(lang, "Page", "页")} {page} / {totalPages}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
      </div>

      {showEmptyQueueCta ? (
        <div
          style={{
            ...workbenchInfoBarStyle,
            marginTop: 10,
            marginBottom: 10,
            borderColor: "#bfdbfe",
            background: "#eff6ff",
            color: "#1e3a8a",
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontWeight: 700 }}>{t(lang, "This queue is empty today", "这个队列今天为空")}</div>
            <div style={{ fontSize: 13 }}>{emptyQueueMessage}</div>
          </div>
          <a href={buildPageHref(1, "all")} style={{ fontWeight: 700 }}>
            {t(lang, "Open all students", "查看全部学生")}
          </a>
        </div>
      ) : null}

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
        hasExplicitContext={hasExplicitContext}
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
          listHint: t(
            lang,
            "Open one student profile at a time, then return here only when you need to switch queues.",
            "一次只打开一个学生档案；只有在需要切换处理对象时再回到这里。"
          ),
          rememberedViewHint: t(
            lang,
            "This desk remembers your last queue and search filters when you return without explicit params.",
            "当你未显式指定参数时，这里会记住你上次使用的队列和筛选。"
          ),
        }}
      />
    </div>
  );
}
