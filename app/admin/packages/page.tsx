import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { cookies } from "next/headers";
import PackageEditModal from "../_components/PackageEditModal";
import RememberedWorkbenchQueryClient from "../_components/RememberedWorkbenchQueryClient";
import SimpleModal from "../_components/SimpleModal";
import NoticeBanner from "../_components/NoticeBanner";
import WorkbenchActionBanner from "../_components/WorkbenchActionBanner";
import WorkbenchScrollMemoryClient from "../_components/WorkbenchScrollMemoryClient";
import WorkbenchStatusChip from "../_components/WorkbenchStatusChip";
import PackageCreateFormClient from "./PackageCreateFormClient";
import { Prisma } from "@prisma/client";
import {
  packageModeFromNote,
  stripGroupPackTag,
} from "@/lib/package-mode";
import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchInfoBarStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
  workbenchMetricValueStyle,
  workbenchTableCellSecondaryStyle,
  workbenchTableHeaderCellStyle,
} from "../_components/workbenchStyles";

const LOW_MINUTES = 120;
const LOW_COUNTS = 3;
const FORECAST_WINDOW_DAYS = 30;
const LOW_DAYS = 7;
const PACKAGES_FILTER_COOKIE = "adminPackagesPreferredFilters";

const primaryButtonStyle = {
  background: "#2563eb",
  color: "#fff",
  border: "1px solid #1d4ed8",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 700,
} as const;

const secondaryButtonStyle = {
  background: "#fff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 700,
} as const;

function parseDateStart(s: string) {
  const [Y, M, D] = s.split("-").map(Number);
  return new Date(Y, M - 1, D, 0, 0, 0, 0);
}
function parseDateEnd(s: string) {
  const [Y, M, D] = s.split("-").map(Number);
  return new Date(Y, M - 1, D, 23, 59, 59, 999);
}
function fmtMinutes(m?: number | null) {
  if (m == null) return "-";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h <= 0) return `${mm}m`;
  if (mm === 0) return `${h}h`;
  return `${h}h ${mm}m`;
}
function fmtCount(v?: number | null) {
  if (v == null) return "-";
  return `${v}`;
}
function fmtDateInput(d: Date | null) {
  if (!d) return "";
  return formatBusinessDateOnly(d);
}

function buildPackagesHref(
  filters: { q?: string; courseId?: string; paid?: string; warn?: string },
  extras?: Record<string, string | null | undefined>
) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.courseId) params.set("courseId", filters.courseId);
  if (filters.paid) params.set("paid", filters.paid);
  if (filters.warn) params.set("warn", filters.warn);
  for (const [key, value] of Object.entries(extras ?? {})) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/admin/packages?${query}` : "/admin/packages";
}

function normalizePackagesPaidFilter(value: string) {
  return value === "paid" || value === "unpaid" ? value : "";
}

function normalizePackagesWarnFilter(value: string) {
  return value === "alert" ? value : "";
}

function parseRememberedPackagesFilters(raw: string) {
  let normalizedRaw = raw;
  try {
    normalizedRaw = decodeURIComponent(raw);
  } catch {
    normalizedRaw = raw;
  }
  const params = new URLSearchParams(normalizedRaw);
  const q = String(params.get("q") ?? "").trim();
  const courseId = String(params.get("courseId") ?? "").trim();
  const paid = normalizePackagesPaidFilter(String(params.get("paid") ?? "").trim());
  const warn = normalizePackagesWarnFilter(String(params.get("warn") ?? "").trim());
  return {
    q,
    courseId,
    paid,
    warn,
    value: buildPackagesHref({ q, courseId, paid, warn }).replace(/^\/admin\/packages\??/, ""),
  };
}

function isSchemaNotReadyError(err: unknown) {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  return err.code === "P2021" || err.code === "P2022";
}

export default async function AdminPackagesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    msg?: string;
    err?: string;
    q?: string;
    courseId?: string;
    paid?: string;
    warn?: string;
    clearFilters?: string;
    focusPackageId?: string;
    packageFlow?: string;
  }>;
}) {
  const lang = await getLang();
  const sp = await searchParams;
  const hasQParam = Object.prototype.hasOwnProperty.call(sp ?? {}, "q");
  const hasCourseIdParam = Object.prototype.hasOwnProperty.call(sp ?? {}, "courseId");
  const hasPaidParam = Object.prototype.hasOwnProperty.call(sp ?? {}, "paid");
  const hasWarnParam = Object.prototype.hasOwnProperty.call(sp ?? {}, "warn");
  const clearFilters = String(sp?.clearFilters ?? "").trim() === "1";
  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const qParam = typeof sp?.q === "string" ? sp.q.trim() : "";
  const courseIdParam = typeof sp?.courseId === "string" ? sp.courseId : "";
  const paidParam = typeof sp?.paid === "string" ? sp.paid : "";
  const warnParam = typeof sp?.warn === "string" ? sp.warn : "";
  const focusPackageId = String(sp?.focusPackageId ?? "").trim();
  const packageFlow = String(sp?.packageFlow ?? "").trim();
  const canResumeRememberedFilters =
    !clearFilters &&
    !qParam &&
    !courseIdParam &&
    !paidParam &&
    !warnParam &&
    !focusPackageId &&
    !packageFlow &&
    !msg &&
    !err;
  const cookieStore = await cookies();
  const rememberedFilters = canResumeRememberedFilters
    ? parseRememberedPackagesFilters(cookieStore.get(PACKAGES_FILTER_COOKIE)?.value ?? "")
    : { q: "", courseId: "", paid: "", warn: "", value: "" };
  const q = hasQParam ? qParam : rememberedFilters.q;
  const filterCourseId = hasCourseIdParam ? courseIdParam : rememberedFilters.courseId;
  const filterPaid = hasPaidParam ? normalizePackagesPaidFilter(paidParam) : rememberedFilters.paid;
  const filterWarn = hasWarnParam ? normalizePackagesWarnFilter(warnParam) : rememberedFilters.warn;
  const resumedRememberedFilters = canResumeRememberedFilters && Boolean(rememberedFilters.value);
  const rememberedFiltersValue = buildPackagesHref({ q, courseId: filterCourseId, paid: filterPaid, warn: filterWarn }).replace(
    /^\/admin\/packages\??/,
    ""
  );

  const wherePackages: any = {};
  if (q) wherePackages.student = { name: { contains: q, mode: "insensitive" } };
  if (filterCourseId) wherePackages.courseId = filterCourseId;
  if (filterPaid === "paid") wherePackages.paid = true;
  if (filterPaid === "unpaid") wherePackages.paid = false;

  let schemaNotReady = false;
  let loadFailed = false;
  let students: Array<{
    id: string;
    name: string;
    sourceChannel: { name: string } | null;
    packages: Array<{ courseId: string; course: { name: string } }>;
  }> = [];
  let courses: Array<{ id: string; name: string }> = [];
  let packages: any[] = [];
  let defaultMinutesByCourseId: Record<string, number> = {};

  try {
    [students, courses] = await Promise.all([
      prisma.student.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          sourceChannel: { select: { name: true } },
          packages: {
            where: { status: "ACTIVE" },
            select: {
              courseId: true,
              course: { select: { name: true } },
            },
          },
        },
      }),
      prisma.course.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);
  } catch (error) {
    loadFailed = true;
    console.error("[admin/packages] failed to load students/courses", error);
  }

  try {
    packages = await prisma.coursePackage.findMany({
      where: wherePackages,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            sourceChannel: { select: { name: true } },
          },
        },
        course: true,
        sharedStudents: { include: { student: true } },
        sharedCourses: { include: { course: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  } catch (err) {
    if (isSchemaNotReadyError(err)) {
      schemaNotReady = true;
      try {
        packages = await prisma.coursePackage.findMany({
          where: wherePackages,
          include: {
            student: {
              select: {
                id: true,
                name: true,
              },
            },
            course: true,
            sharedStudents: { include: { student: true } },
            sharedCourses: { include: { course: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        });
      } catch (fallbackError) {
        loadFailed = true;
        console.error("[admin/packages] fallback query failed", fallbackError);
      }
    } else {
      loadFailed = true;
      console.error("[admin/packages] failed to load packages", err);
    }
  }

  try {
    const recentMinutePackages = await prisma.coursePackage.findMany({
      where: { type: "HOURS", totalMinutes: { gt: 0 } },
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: {
        courseId: true,
        totalMinutes: true,
        note: true,
      },
    });
    const grouped = new Map<string, Map<number, number>>();
    for (const row of recentMinutePackages) {
      if (packageModeFromNote(row.note) !== "HOURS_MINUTES") continue;
      const minute = row.totalMinutes ?? 0;
      if (!minute || minute <= 0) continue;
      const perCourse = grouped.get(row.courseId) ?? new Map<number, number>();
      perCourse.set(minute, (perCourse.get(minute) ?? 0) + 1);
      grouped.set(row.courseId, perCourse);
    }
    defaultMinutesByCourseId = Object.fromEntries(
      Array.from(grouped.entries()).map(([courseId, counts]) => {
        const best = Array.from(counts.entries()).sort((a, b) => {
          if (b[1] !== a[1]) return b[1] - a[1];
          return a[0] - b[0];
        })[0];
        return [courseId, best?.[0] ?? 600];
      })
    );
  } catch (error) {
    console.error("[admin/packages] failed to build default minute suggestions", error);
  }

  let packageRiskMap: Map<string, any> = new Map(
    packages.map((p) => [p.id, { deducted30: 0, estDays: null, lowMinutes: false, lowDays: false, isAlert: false, isGroupPack: false }] as const)
  );
  let filteredPackages = packages;

  try {
    const usageSince = new Date(Date.now() - FORECAST_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const packageIds = packages.map((p) => p.id);
    const deductedRows = packageIds.length
      ? await prisma.packageTxn.groupBy({
          by: ["packageId"],
          where: {
            packageId: { in: packageIds },
            kind: "DEDUCT",
            createdAt: { gte: usageSince },
          },
          _sum: { deltaMinutes: true },
        })
      : [];
    const deducted30Map = new Map(
      deductedRows.map((r) => [r.packageId, Math.abs(Math.min(0, r._sum.deltaMinutes ?? 0))])
    );

    packageRiskMap = new Map(
      packages.map((p) => {
        const remaining = p.remainingMinutes ?? 0;
        const deducted30 = deducted30Map.get(p.id) ?? 0;
        const avgPerDay = deducted30 / FORECAST_WINDOW_DAYS;
        const packageMode = p.type === "HOURS" ? packageModeFromNote(p.note) : null;
        const isLegacyGroupPack = packageMode === "GROUP_COUNT";
        const lowBalanceThreshold = isLegacyGroupPack ? LOW_COUNTS : LOW_MINUTES;
        const estDays =
          p.type === "HOURS" && p.status === "ACTIVE" && remaining > 0 && avgPerDay > 0
            ? Math.ceil(remaining / avgPerDay)
            : null;
        const lowMinutes = p.type === "HOURS" && p.status === "ACTIVE" && remaining <= lowBalanceThreshold;
        const lowDays = p.type === "HOURS" && p.status === "ACTIVE" && estDays != null && estDays <= LOW_DAYS;
        const isAlert = p.type === "HOURS" && p.status === "ACTIVE" && (remaining <= 0 || lowMinutes || lowDays);
        return [p.id, { deducted30, estDays, lowMinutes, lowDays, isAlert, isLegacyGroupPack }] as const;
      })
    );

    filteredPackages = filterWarn === "alert" ? packages.filter((p) => packageRiskMap.get(p.id)?.isAlert) : packages;
  } catch (error) {
    loadFailed = true;
    console.error("[admin/packages] failed to load usage summary", error);
  }

  const today = new Date();
  const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const alertCount = filteredPackages.filter((p) => packageRiskMap.get(p.id)?.isAlert).length;
  const unpaidCount = filteredPackages.filter((p) => !p.paid).length;
  const activeCount = filteredPackages.filter((p) => p.status === "ACTIVE").length;
  const activeFilterCount = [q, filterCourseId, filterPaid, filterWarn].filter(Boolean).length;
  const filtersOpen = activeFilterCount > 0;
  const buildPageHref = (extras?: Record<string, string | null | undefined>) =>
    buildPackagesHref(
      { q, courseId: filterCourseId, paid: filterPaid, warn: filterWarn },
      extras
    );
  const defaultWorkbenchHref = "/admin/packages?clearFilters=1";
  const focusedPackage = filteredPackages.find((p) => p.id === focusPackageId) ?? null;
  const nextVisiblePackage = filteredPackages.find((p) => p.id !== focusPackageId) ?? filteredPackages[0] ?? null;
  const focusedPackageAnchor = focusedPackage ? `#package-row-${focusedPackage.id}` : "";
  const focusedPackageBillingHref = focusPackageId ? `/admin/packages/${focusPackageId}/billing` : "";
  const focusedPackageLedgerHref = focusPackageId ? `/admin/packages/${focusPackageId}/ledger` : "";
  const nextVisiblePackageAnchor = nextVisiblePackage ? `#package-row-${nextVisiblePackage.id}` : "#packages-list";
  const flowCard =
    packageFlow === "edited"
      ? {
          tone: "green" as const,
          title: t(lang, "Package changes saved.", "课包修改已保存。"),
          detail: focusedPackage
            ? t(lang, "The same package stays highlighted below so you can continue with billing or ledger work without searching again.", "下面会继续高亮同一个课包，方便你直接继续处理账单或流水，不用重新找。")
            : t(lang, "The package was saved. Use billing or ledger if you want to continue follow-up outside the current filtered list.", "课包已保存；如果它当前不在这个筛选列表里，可以直接继续打开账单或流水。"),
          links: [
            focusedPackageAnchor
              ? { href: focusedPackageAnchor, label: t(lang, "Jump to this package", "跳到当前课包") }
              : null,
            focusedPackageBillingHref
              ? { href: focusedPackageBillingHref, label: t(lang, "Open billing", "打开账单") }
              : null,
            focusedPackageLedgerHref
              ? { href: focusedPackageLedgerHref, label: t(lang, "Open ledger", "打开流水") }
              : null,
          ].filter((item): item is { href: string; label: string } => Boolean(item)),
        }
      : packageFlow === "topup"
        ? {
            tone: "blue" as const,
            title: t(lang, "Top-up saved.", "课包增购已保存。"),
            detail: focusedPackage
              ? t(lang, "Confirm the highlighted package balance below, then move straight to billing or ledger for the same package.", "先确认下面高亮课包的余额，再直接进入同一课包的账单或流水。")
              : t(lang, "The top-up was saved. Continue on billing or ledger if you need to confirm the same package outside this filtered view.", "增购已保存；如果当前筛选里没显示它，也可以直接继续打开同一课包的账单或流水。"),
            links: [
              focusedPackageAnchor
                ? { href: focusedPackageAnchor, label: t(lang, "Jump to updated balance", "跳到更新后的余额") }
                : null,
              focusedPackageBillingHref
                ? { href: focusedPackageBillingHref, label: t(lang, "Open billing", "打开账单") }
                : null,
              focusedPackageLedgerHref
                ? { href: focusedPackageLedgerHref, label: t(lang, "Open ledger", "打开流水") }
                : null,
            ].filter((item): item is { href: string; label: string } => Boolean(item)),
          }
        : packageFlow === "deleted"
          ? {
              tone: "amber" as const,
              title: t(lang, "Package deleted.", "课包已删除。"),
              detail: nextVisiblePackage
                ? t(lang, "The list has been refreshed. Move to the next visible package below so you can keep working without rebuilding your filters.", "列表已经刷新；你可以直接跳到下面下一条可见课包，继续处理，不用重设筛选。")
                : t(lang, "The package was removed and the current list is now empty under these filters.", "该课包已经删除，当前筛选下的列表暂时为空。"),
              links: nextVisiblePackage
                ? [
                    { href: nextVisiblePackageAnchor, label: t(lang, "Open next visible package", "打开下一条可见课包") },
                    { href: `/admin/packages/${nextVisiblePackage.id}/billing`, label: t(lang, "Open next billing", "打开下一条账单") },
                  ]
                : [{ href: buildPageHref(), label: t(lang, "Return to package list", "返回课包列表") }],
            }
          : null;
  const emptyPackagesState =
    activeFilterCount > 0
      ? {
          title: t(lang, "No packages match the current filters", "当前筛选下没有课包"),
          detail: t(
            lang,
            "Try clearing the search, payment, course, or alert filters. If you expected a specific package, broaden the workbench first and then jump into billing or ledger.",
            "可以先清空搜索、付款、课程或预警筛选。如果你原本在找某个课包，先把工作台放宽，再进入账单或流水。"
          ),
          links: [
            { href: defaultWorkbenchHref, label: t(lang, "Back to default workbench", "回到默认工作台") },
            { href: "/admin/students", label: t(lang, "Open students desk", "打开学生工作台") },
          ],
        }
      : {
          title: t(lang, "No packages have been created yet", "目前还没有创建课包"),
          detail: t(
            lang,
            "Use the create-package action above after confirming the student, course, package mode, and paid state.",
            "先确认学生、课程、课包模式和付款状态，再使用上方“创建课包”动作。"
          ),
          links: [
            { href: "/admin/students", label: t(lang, "Open students desk", "打开学生工作台") },
            { href: "/admin/enrollments", label: t(lang, "Open enrollments", "打开报名工作台") },
          ],
        };

  return (
    <div>
      <RememberedWorkbenchQueryClient
        cookieKey={PACKAGES_FILTER_COOKIE}
        storageKey="adminPackagesPreferredFilters"
        value={rememberedFiltersValue}
      />
      <WorkbenchScrollMemoryClient storageKey="adminPackagesScroll" />
      <div style={workbenchHeroStyle("blue")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#3730a3", letterSpacing: 0.4 }}>
            {t(lang, "Package Workbench", "课包工作台")}
          </div>
          <h2 style={{ margin: 0 }}>{t(lang, "Packages", "课时包")}</h2>
          <div style={{ color: "#475569", lineHeight: 1.5 }}>
            {t(
              lang,
              "Use the summary cards to spot low-balance risk first, then narrow the list and open billing or ledger only for the package you are actively handling.",
              "先用摘要卡片识别低余额风险，再缩小列表范围，只打开你当前正在处理的课包账单或流水。"
            )}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <div style={workbenchMetricCardStyle("indigo")}>
            <div style={workbenchMetricLabelStyle("slate")}>{t(lang, "Visible packages", "当前可见课包")}</div>
            <div style={workbenchMetricValueStyle("slate")}>{filteredPackages.length}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Current list after filters.", "当前筛选后的列表数量。")}</div>
          </div>
          <div style={workbenchMetricCardStyle("amber")}>
            <div style={workbenchMetricLabelStyle("amber")}>{t(lang, "Alert", "预警")}</div>
            <div style={{ ...workbenchMetricValueStyle("amber"), color: alertCount > 0 ? "#c2410c" : "#166534" }}>{alertCount}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Low balance or likely to run out soon.", "余额低或即将用完。")}</div>
          </div>
          <div style={workbenchMetricCardStyle("rose")}>
            <div style={workbenchMetricLabelStyle("rose")}>{t(lang, "Unpaid", "未付款")}</div>
            <div style={{ ...workbenchMetricValueStyle("rose"), color: unpaidCount > 0 ? "#be123c" : "#166534" }}>{unpaidCount}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Packages still waiting on payment follow-up.", "仍需付款跟进的课包。")}</div>
          </div>
          <div style={workbenchMetricCardStyle("blue")}>
            <div style={workbenchMetricLabelStyle("blue")}>{t(lang, "Active", "生效中")}</div>
            <div style={workbenchMetricValueStyle("blue")}>{activeCount}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Packages currently in service.", "当前正在使用中的课包。")}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ padding: "4px 10px", borderRadius: 999, background: "#fff", border: "1px solid #cbd5e1", color: "#334155", fontSize: 12 }}>
            {t(lang, "Active filters", "生效筛选")}: <b>{activeFilterCount}</b>
          </span>
          <span style={{ padding: "4px 10px", borderRadius: 999, background: "#fff", border: "1px solid #cbd5e1", color: "#334155", fontSize: 12 }}>
            {t(lang, "Course", "课程")}: <b>{filterCourseId ? courses.find((c) => c.id === filterCourseId)?.name ?? filterCourseId : t(lang, "All", "全部")}</b>
          </span>
          <span style={{ padding: "4px 10px", borderRadius: 999, background: "#fff", border: "1px solid #cbd5e1", color: "#334155", fontSize: 12 }}>
            {t(lang, "Payment", "付款")}: <b>{filterPaid || t(lang, "All", "全部")}</b>
          </span>
        </div>
      </div>
      {resumedRememberedFilters ? (
        <WorkbenchActionBanner
          tone="info"
          title={t(lang, "Resumed your last package workbench view", "已恢复你上次的课包工作台视图")}
          description={t(
            lang,
            "The previous package filters are active again so you can continue where you left off. Use the shortcut on the right if you want to reopen the default desk first.",
            "系统已经恢复上次使用的课包筛选，方便你直接续做。若想先回到默认工作台，可用右侧快捷入口。"
          )}
          actions={[
            { href: defaultWorkbenchHref, label: t(lang, "Back to default workbench", "回到默认工作台"), emphasis: "primary" },
          ]}
        />
      ) : null}

      {err ? <NoticeBanner type="error" title={t(lang, "Error", "错误")} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "OK", "成功")} message={msg} /> : null}
      {flowCard ? (
        <WorkbenchActionBanner
          tone={flowCard.tone === "green" ? "success" : flowCard.tone === "blue" ? "info" : "warn"}
          title={flowCard.title}
          description={flowCard.detail}
          actions={flowCard.links.map((link, index) => ({
            href: link.href,
            label: link.label,
            emphasis: index === 0 ? "primary" : "secondary",
          }))}
        />
      ) : null}
      {loadFailed ? (
        <NoticeBanner
          type="error"
          title={t(lang, "Data Load Failed", "数据加载失败")}
          message={t(
            lang,
            "Some package data could not be loaded in this environment. Please check deployment logs for details.",
            "当前环境部分课包数据加载失败，请查看部署日志定位具体原因。"
          )}
        />
      ) : null}
      {schemaNotReady ? (
        <NoticeBanner
          type="warn"
          title={t(lang, "Schema Not Ready", "数据库结构未就绪")}
          message={t(
            lang,
            "Preview database migration is not ready yet. Student source column is temporarily hidden on this page.",
            "预览环境数据库迁移尚未完成，此页暂时隐藏“学员来源”数据。"
          )}
        />
      ) : null}

      <div style={{ ...workbenchInfoBarStyle, background: "#f8fafc" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 800 }}>{t(lang, "Create package", "创建课包")}</div>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            {t(lang, "Add a new package only after confirming the student, course, package mode, and paid state.", "先确认学生、课程、课包模式和付款状态，再创建新的课包。")}
          </div>
        </div>
        <SimpleModal buttonLabel={t(lang, "Create Package", "创建课包")} title={t(lang, "Create Package", "创建课包")} closeOnSubmit>
            <PackageCreateFormClient
              defaultYmd={ymd}
              students={students.map((s) => ({
                id: s.id,
                name: s.name,
                sourceChannelName: s.sourceChannel?.name ?? "",
                activePackageCount: s.packages.length,
                courseIds: s.packages.map((pkg) => pkg.courseId),
                courseNames: s.packages.map((pkg) => pkg.course.name),
              }))}
              defaultMinutesByCourseId={defaultMinutesByCourseId}
              courses={courses.map((c) => ({ id: c.id, name: c.name }))}
              labels={{
                student: t(lang, "Student", "学生"),
                studentPlaceholder: t(lang, "Search student name", "搜索学生姓名"),
                course: t(lang, "Course", "课程"),
                type: t(lang, "Type", "类型"),
                typeHours: t(lang, "HOURS (minutes)", "课时包(按分钟)"),
                typeGroupMinutes: t(lang, "GROUP (minutes, recommended)", "班课包(按分钟，推荐)"),
                typeGroupCountLegacy: t(lang, "GROUP (per class, legacy)", "班课包(按次，旧版)"),
                typeMonthly: t(lang, "MONTHLY (valid period)", "月卡(按有效期)"),
                totalMinutesOrCount: t(lang, "totalMinutes / count", "总分钟数 / 次数"),
                totalMinutesHint: t(
                  lang,
                  "HOURS and new GROUP packages use minutes (e.g. 600=10h). Legacy GROUP_COUNT uses class count (e.g. 20=20 classes).",
                  "课时包和新班课包都按分钟填写（例如600=10小时）；旧版班课按次包按次数填写（例如20=20次）。"
                ),
                validFrom: t(lang, "validFrom", "生效日期"),
                validToOptional: t(lang, "validTo (optional)", "失效日期(可选)"),
                status: t(lang, "Status", "状态"),
                paid: t(lang, "Paid", "已付款"),
                paidAt: t(lang, "Paid At", "付款时间"),
                paidAmount: t(lang, "Paid Amount", "付款金额"),
                paidNote: t(lang, "Paid Note", "付款备注"),
                sharedStudents: t(lang, "Shared Students", "共享学生"),
                sharedCourses: t(lang, "Shared Courses", "共享课程"),
                note: t(lang, "Note", "备注"),
                create: t(lang, "Create", "创建"),
                confirmCreate: t(lang, "Create this package?", "确认创建课包？"),
                errorPrefix: t(lang, "Error", "错误"),
              }}
            />
        </SimpleModal>
      </div>

      <details open={filtersOpen} style={{ ...workbenchFilterPanelStyle, marginBottom: 12 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>
          {t(lang, "Package filters", "课包筛选")} ({activeFilterCount})
        </summary>
        <div style={{ marginTop: 10, color: "#64748b", fontSize: 12 }}>
          {t(lang, "Open this only when you need to narrow the workbench by student, course, payment status, or alert state.", "只有在需要按学生、课程、付款状态或预警状态缩小时，再展开这里。")}
        </div>
        <form method="GET" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
          <input
            name="q"
            placeholder={t(lang, "Search student name", "搜索学生姓名")}
            defaultValue={q}
            style={{ minWidth: 240 }}
          />
          <select name="courseId" defaultValue={filterCourseId}>
            <option value="">{t(lang, "All Courses", "全部课程")}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="paid" defaultValue={filterPaid}>
            <option value="">{t(lang, "All Payment Status", "全部付款状态")}</option>
            <option value="paid">{t(lang, "Paid", "已付款")}</option>
            <option value="unpaid">{t(lang, "Unpaid", "未付款")}</option>
          </select>
          <select name="warn" defaultValue={filterWarn}>
            <option value="">{t(lang, "All Alerts", "全部预警")}</option>
            <option value="alert">{t(lang, "Alert Only", "仅预警")}</option>
          </select>
          <button type="submit" data-apply-submit="1" style={primaryButtonStyle}>{t(lang, "Apply", "应用")}</button>
          <a href="/admin/packages?clearFilters=1" style={{ ...secondaryButtonStyle, textDecoration: "none", display: "inline-block" }}>
            {t(lang, "Clear", "清除")}
          </a>
          <span style={{ color: "#666" }}>
            {t(lang, "Showing", "显示")} {filteredPackages.length}
          </span>
        </form>
      </details>

      <div id="packages-list" style={workbenchInfoBarStyle}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 800 }}>{t(lang, "Packages list", "课包列表")}</div>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            {t(lang, "Work through one package at a time. Open billing or ledger only when that package becomes your active task.", "一次处理一个课包；只有在它成为当前任务时，再打开账单或流水。")}
          </div>
        </div>
        <div style={{ color: "#475569", fontSize: 13 }}>
          {t(lang, "Showing", "显示")} {filteredPackages.length}
        </div>
      </div>

      {filteredPackages.length === 0 ? (
        <WorkbenchActionBanner
          tone={activeFilterCount > 0 ? "warn" : "info"}
          title={emptyPackagesState.title}
          description={emptyPackagesState.detail}
          actions={emptyPackagesState.links.map((link, index) => ({
            href: link.href,
            label: link.label,
            emphasis: index === 0 ? "primary" : "secondary",
          }))}
          style={{ marginBottom: 0 }}
        />
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff" }}>
          <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", minWidth: 1180 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th align="left" style={workbenchTableHeaderCellStyle}>{t(lang, "Student", "学生")}</th>
                <th align="left" style={workbenchTableHeaderCellStyle}>{t(lang, "Course", "课程")}</th>
                <th align="left" style={workbenchTableHeaderCellStyle}>{t(lang, "Type", "类型")}</th>
                <th align="left" style={workbenchTableHeaderCellStyle}>{t(lang, "Remaining", "剩余")}</th>
                <th align="left" style={workbenchTableHeaderCellStyle}>{t(lang, "Usage 30d", "近30天消耗")}</th>
                <th align="left" style={workbenchTableHeaderCellStyle}>{t(lang, "Forecast", "预计用完")}</th>
                <th align="left" style={workbenchTableHeaderCellStyle}>{t(lang, "Alert", "预警")}</th>
                <th align="left" style={workbenchTableHeaderCellStyle}>{t(lang, "Valid", "有效期")}</th>
                <th align="left" style={workbenchTableHeaderCellStyle}>{t(lang, "Status", "状态")}</th>
                <th align="left" style={workbenchTableHeaderCellStyle}>{t(lang, "Action", "操作")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredPackages.map((p) => (
                <tr
                  key={p.id}
                  id={`package-row-${p.id}`}
                  style={{
                    borderTop: "1px solid #eee",
                    background: focusPackageId === p.id ? "#eff6ff" : "#fff",
                    boxShadow: focusPackageId === p.id ? "inset 0 0 0 2px rgba(37,99,235,0.28)" : "none",
                  }}
                >
                {(() => {
                  const remaining = p.remainingMinutes ?? 0;
                  const risk = packageRiskMap.get(p.id);
                  const deducted30 = risk?.deducted30 ?? 0;
                  const estDays = risk?.estDays ?? null;
                  const lowMinutes = risk?.lowMinutes ?? false;
                  const lowDays = risk?.lowDays ?? false;
                  return (
                    <>
                      <td style={{ minWidth: 150, verticalAlign: "top" }}>
                        <div>{p.student?.name ?? "-"}</div>
                        <div style={workbenchTableCellSecondaryStyle}>
                          {t(lang, "Student Source", "学生来源")}: {p.student?.sourceChannel?.name ?? "-"}
                        </div>
                      </td>
                      <td style={{ minWidth: 120, verticalAlign: "top" }}>{p.course?.name ?? "-"}</td>
                      <td style={{ minWidth: 120, verticalAlign: "top" }}>
                        {(() => {
                          if (p.type !== "HOURS") return p.type;
                          const packageMode = packageModeFromNote(p.note);
                          if (packageMode === "GROUP_MINUTES") return t(lang, "GROUP (minutes)", "班课包(按分钟)");
                          if (packageMode === "GROUP_COUNT") return t(lang, "GROUP (legacy count)", "班课包(按次，旧版)");
                          return t(lang, "HOURS", "课时包");
                        })()}
                      </td>
                      <td style={{ minWidth: 90, verticalAlign: "top" }}>
                        {p.type === "HOURS" ? (
                          <span
                            style={{
                              fontWeight: lowMinutes ? 700 : 400,
                              color: lowMinutes ? "#b00" : undefined,
                            }}
                          >
                            {packageModeFromNote(p.note) === "GROUP_COUNT"
                              ? `${fmtCount(p.remainingMinutes)} cls`
                              : fmtMinutes(p.remainingMinutes)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td style={{ minWidth: 100, verticalAlign: "top" }}>
                        {p.type === "HOURS"
                          ? packageModeFromNote(p.note) === "GROUP_COUNT"
                            ? `${deducted30} cls / ${FORECAST_WINDOW_DAYS}d`
                            : `${fmtMinutes(deducted30)} / ${FORECAST_WINDOW_DAYS}d`
                          : "-"}
                      </td>
                      <td style={{ minWidth: 110, verticalAlign: "top" }}>
                        {p.type !== "HOURS"
                          ? "-"
                          : p.status !== "ACTIVE"
                          ? t(lang, "Inactive", "未生效")
                          : remaining <= 0
                          ? t(lang, "Depleted", "已用完")
                          : estDays == null
                          ? t(lang, "No usage (30d)", "近30天无消耗")
                          : `${estDays} ${t(lang, "days", "天")}`}
                      </td>
                      <td style={{ minWidth: 110, verticalAlign: "top" }}>
                        {p.type !== "HOURS" || p.status !== "ACTIVE" ? (
                          <WorkbenchStatusChip label={t(lang, "Not active", "未激活")} tone="neutral" />
                        ) : remaining <= 0 ? (
                          <WorkbenchStatusChip label={t(lang, "Urgent", "紧急")} tone="error" strong />
                        ) : lowMinutes || lowDays ? (
                          <WorkbenchStatusChip
                            label={
                              lowMinutes && lowDays
                                ? `${t(lang, "Low balance", "余额低")} + ${t(lang, "Likely to run out soon", "即将用完")}`
                                : lowMinutes
                                  ? t(lang, "Low balance", "余额低")
                                  : t(lang, "Likely to run out soon", "即将用完")
                            }
                            tone="warn"
                            strong
                          />
                        ) : (
                          <WorkbenchStatusChip label={t(lang, "Normal", "正常")} tone="success" />
                        )}
                      </td>
                      <td style={{ minWidth: 150, verticalAlign: "top" }}>
                        {formatBusinessDateOnly(new Date(p.validFrom))} ~ {p.validTo ? formatBusinessDateOnly(new Date(p.validTo)) : "(open)"}
                      </td>
                      <td style={{ minWidth: 110, verticalAlign: "top" }}>
                        <div style={{ display: "grid", gap: 6 }}>
                          <WorkbenchStatusChip label={p.status} tone={p.status === "ACTIVE" ? "success" : "neutral"} />
                          <WorkbenchStatusChip
                            label={p.paid ? t(lang, "Paid", "已付款") : t(lang, "Unpaid", "未付款")}
                            tone={p.paid ? "success" : "warn"}
                          />
                        </div>
                      </td>
                      <td style={{ minWidth: 240, verticalAlign: "top" }}>
                        <div style={{ display: "grid", gap: 8 }}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <PackageEditModal
                              pkg={{
                                ...p,
                                studentId: p.student?.id ?? "",
                                studentName: p.student?.name ?? "",
                                courseId: p.course?.id ?? "",
                                courseName: p.course?.name ?? "",
                                sourceChannelName: p.student?.sourceChannel?.name ?? "",
                              }}
                              students={students.map((s) => ({
                                id: s.id,
                                name: s.name,
                                sourceChannelName: s.sourceChannel?.name ?? "",
                                activePackageCount: s.packages.length,
                                courseIds: s.packages.map((pkg) => pkg.courseId),
                              }))}
                              courses={courses.map((c) => ({ id: c.id, name: c.name }))}
                              labels={{
                                edit: t(lang, "Edit", "编辑"),
                                update: t(lang, "Update", "更新"),
                                topUp: t(lang, "Top-up", "增购"),
                                topUpMinutes: t(lang, "Add Minutes", "增加分钟"),
                                topUpNote: t(lang, "Top-up Note", "增购备注"),
                                topUpSubmit: t(lang, "Add", "确认增购"),
                                deleteLabel: t(lang, "Delete", "删除"),
                                paid: t(lang, "Paid", "已付款"),
                                paidAt: t(lang, "Paid At", "付款时间"),
                                paidAmount: t(lang, "Amount", "金额"),
                                paidNote: t(lang, "Paid Note", "付款备注"),
                                sharedStudents: t(lang, "Shared Students", "共享学生"),
                                sharedCourses: t(lang, "Shared Courses", "共享课程"),
                                remaining: t(lang, "Remaining", "剩余"),
                                validFrom: t(lang, "validFrom", "生效日期"),
                                validTo: t(lang, "validTo", "失效日期"),
                                status: t(lang, "Status", "状态"),
                                note: t(lang, "Note", "备注"),
                                close: t(lang, "Close", "关闭"),
                                deleteConfirm: t(
                                  lang,
                                  "Delete package? This will delete all txns.",
                                  "删除课包？将删除所有流水。"
                                ),
                              }}
                            />
                            <a href={`/admin/packages/${p.id}/billing`}>{t(lang, "Billing", "账单")}</a>
                            <a href={`/admin/packages/${p.id}/ledger`}>{t(lang, "Ledger", "对账单")}</a>
                          </div>
                          <details>
                            <summary style={{ cursor: "pointer", color: "#334155", fontWeight: 600 }}>
                              {t(lang, "Details", "详情")}
                            </summary>
                            <div
                              style={{
                                marginTop: 8,
                                display: "grid",
                                gap: 6,
                                fontSize: 12,
                                color: "#475569",
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: 10,
                                padding: 10,
                              }}
                            >
                              <div><b>{t(lang, "Paid At", "付款时间")}:</b> {p.paidAt ? formatBusinessDateTime(new Date(p.paidAt)) : "-"}</div>
                              <div><b>{t(lang, "Amount", "金额")}:</b> {p.paidAmount ?? "-"}</div>
                              <div><b>{t(lang, "Paid Note", "付款备注")}:</b> {p.paidNote ?? "-"}</div>
                              <div><b>{t(lang, "Shared Students", "共享学生")}:</b> {p.sharedStudents.map((x: any) => x.student.name).join(", ") || "-"}</div>
                              <div><b>{t(lang, "Shared Courses", "共享课程")}:</b> {p.sharedCourses.map((x: any) => x.course.name).join(", ") || "-"}</div>
                              <div><b>{t(lang, "Note", "备注")}:</b> {stripGroupPackTag(p.note) || "-"}</div>
                              <div><b>{t(lang, "Created", "创建时间")}:</b> {formatBusinessDateOnly(new Date(p.createdAt))}</div>
                            </div>
                          </details>
                        </div>
                      </td>
                    </>
                  );
                })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
