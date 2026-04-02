import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { listPartnerBilling } from "@/lib/partner-billing";
import { prisma } from "@/lib/prisma";
import { formatBusinessDateTime } from "@/lib/date-only";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import RememberedWorkbenchQueryClient from "../../_components/RememberedWorkbenchQueryClient";

const BIZ_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
const PARTNER_SOURCE_NAME = "\u65b0\u4e1c\u65b9\u5b66\u751f";
const ONLINE_RATE_KEY = "partner_settlement_online_rate_per_45";
const OFFLINE_RATE_KEY = "partner_settlement_offline_rate_per_45";
const DEFAULT_ONLINE_RATE_PER_45 = 70;
const DEFAULT_OFFLINE_RATE_PER_45 = 90;
const ATTENDED_STATUSES = ["PRESENT", "LATE"] as const;
const PARTNER_SETTLEMENT_COOKIE = "adminPartnerSettlementPreferredView";

function isAttendanceSettlementEligible(a: { status: string; excusedCharge?: boolean | null }) {
  return ATTENDED_STATUSES.includes(a.status as any) || (a.status === "EXCUSED" && Boolean(a.excusedCharge));
}

type Mode = "ONLINE_PACKAGE_END" | "OFFLINE_MONTHLY" | "";

function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function parseMonth(s?: string | null) {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
}

function normalizeSettlementHistory(value: string) {
  return value === "receipt-pending" || value === "receipt-created" ? value : "all";
}

function normalizeSettlementPanel(value: string) {
  return value === "history" || value === "setup" ? value : "";
}

function parseRememberedPartnerSettlementView(raw: string, fallbackMonth: string) {
  let normalizedRaw = raw;
  try {
    normalizedRaw = decodeURIComponent(raw);
  } catch {
    normalizedRaw = raw;
  }
  const params = new URLSearchParams(normalizedRaw);
  const monthRaw = String(params.get("month") ?? "").trim();
  const month = parseMonth(monthRaw) ? monthRaw : fallbackMonth;
  const history = normalizeSettlementHistory(String(params.get("history") ?? "").trim());
  const panel = normalizeSettlementPanel(String(params.get("panel") ?? "").trim());
  const normalized = new URLSearchParams();
  if (month !== fallbackMonth) normalized.set("month", month);
  if (history !== "all") normalized.set("history", history);
  if (panel) normalized.set("panel", panel);
  return {
    month,
    history,
    panel,
    value: normalized.toString(),
  };
}

function toBizMonthRange(month: string) {
  const parsed = parseMonth(month);
  if (!parsed) return null;
  const start = new Date(Date.UTC(parsed.year, parsed.month - 1, 1, 0, 0, 0, 0) - BIZ_UTC_OFFSET_MS);
  const end = new Date(Date.UTC(parsed.year, parsed.month, 1, 0, 0, 0, 0) - BIZ_UTC_OFFSET_MS);
  return { start, end };
}

function toHours(minutes: number) {
  return Number((minutes / 60).toFixed(2));
}

function calcAmountByRatePer45(minutes: number, ratePer45: number) {
  if (!Number.isFinite(minutes) || minutes <= 0 || !Number.isFinite(ratePer45) || ratePer45 < 0) return 0;
  return Math.round((minutes / 45) * ratePer45);
}

function parseMode(v: FormDataEntryValue | null): Mode {
  const x = typeof v === "string" ? v : "";
  if (x === "ONLINE_PACKAGE_END" || x === "OFFLINE_MONTHLY") return x;
  return "";
}

function isSchemaNotReadyError(err: unknown) {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  return err.code === "P2021" || err.code === "P2022";
}

function readRateSetting(raw: string | null | undefined, fallback: number) {
  const n = Number(raw ?? "");
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

async function getSettlementRates() {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: [ONLINE_RATE_KEY, OFFLINE_RATE_KEY] } },
    select: { key: true, value: true },
  });
  const map = new Map(rows.map((x) => [x.key, x.value]));
  return {
    onlineRatePer45: readRateSetting(map.get(ONLINE_RATE_KEY), DEFAULT_ONLINE_RATE_PER_45),
    offlineRatePer45: readRateSetting(map.get(OFFLINE_RATE_KEY), DEFAULT_OFFLINE_RATE_PER_45),
  };
}

async function findPartnerSource() {
  return prisma.studentSourceChannel.findFirst({
    where: { name: PARTNER_SOURCE_NAME },
    select: { id: true, name: true },
  });
}

function modeLabel(m: "ONLINE_PACKAGE_END" | "OFFLINE_MONTHLY" | null) {
  if (m === "ONLINE_PACKAGE_END") return "Online: Package End / 线上：课包完结";
  if (m === "OFFLINE_MONTHLY") return "Offline: Monthly / 线下：按月";
  return "Not Included / 不纳入";
}

function studentAttendanceHref(studentId: string, attendanceMonth?: string | null) {
  const monthPart = attendanceMonth ? `&attendanceMonth=${encodeURIComponent(attendanceMonth)}` : "";
  return `/admin/students/${encodeURIComponent(studentId)}?focus=attendance&limit=500${monthPart}#attendance`;
}

function buildSettlementPageUrl(
  month: string,
  extras?: Record<string, string | null | undefined>
) {
  const params = new URLSearchParams();
  params.set("month", month);
  for (const [key, value] of Object.entries(extras ?? {})) {
    if (value) params.set(key, value);
  }
  return `/admin/reports/partner-settlement?${params.toString()}`;
}

async function updateRateSettingsAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  if (user.role === "FINANCE") {
    redirect("/admin/reports/partner-settlement?err=forbidden");
  }

  const month = typeof formData.get("month") === "string" ? String(formData.get("month")) : monthKey(new Date());
  const onlineRaw = typeof formData.get("onlineRatePer45") === "string" ? String(formData.get("onlineRatePer45")) : "";
  const offlineRaw = typeof formData.get("offlineRatePer45") === "string" ? String(formData.get("offlineRatePer45")) : "";
  const onlineRate = Number(onlineRaw);
  const offlineRate = Number(offlineRaw);
  if (!Number.isFinite(onlineRate) || onlineRate < 0 || !Number.isFinite(offlineRate) || offlineRate < 0) {
    redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&err=invalid-rate`);
  }

  await prisma.$transaction([
    prisma.appSetting.upsert({
      where: { key: ONLINE_RATE_KEY },
      create: { key: ONLINE_RATE_KEY, value: String(onlineRate) },
      update: { value: String(onlineRate) },
    }),
    prisma.appSetting.upsert({
      where: { key: OFFLINE_RATE_KEY },
      create: { key: OFFLINE_RATE_KEY, value: String(offlineRate) },
      update: { value: String(offlineRate) },
    }),
  ]);

  revalidatePath("/admin/reports/partner-settlement");
  redirect(
    buildSettlementPageUrl(month, {
      msg: "rate-updated",
      settlementFlow: "rate-updated",
      panel: "setup",
    })
  );
}

async function createOnlineSettlementAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  if (user.role === "FINANCE") {
    redirect("/admin/reports/partner-settlement?err=forbidden");
  }

  const packageId = typeof formData.get("packageId") === "string" ? String(formData.get("packageId")) : "";
  const month = typeof formData.get("month") === "string" ? String(formData.get("month")) : monthKey(new Date());
  if (!packageId) {
    redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&err=invalid-package`);
  }

  const source = await findPartnerSource();
  if (!source) {
    redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&err=source-not-found`);
  }

  let pkg: any;
  try {
    pkg = await prisma.coursePackage.findUnique({
      where: { id: packageId },
      include: {
        student: { select: { id: true, name: true, sourceChannelId: true } },
        settlements: { where: { mode: "ONLINE_PACKAGE_END" }, select: { onlineSnapshotTotalMinutes: true } },
      },
    });
  } catch (err) {
    if (isSchemaNotReadyError(err)) {
      redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&err=schema-not-ready`);
    }
    throw err;
  }

  if (!pkg || pkg.student?.sourceChannelId !== source.id) {
    redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&err=package-not-eligible`);
  }
  if (pkg.settlementMode !== "ONLINE_PACKAGE_END") {
    redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&err=package-mode-mismatch`);
  }

  const remainingMinutes = pkg.remainingMinutes ?? 0;
  if (pkg.type !== "HOURS" || remainingMinutes > 0) {
    redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&err=package-not-completed`);
  }
  const rates = await getSettlementRates();
  const totalMinutes = Math.max(0, Number(pkg.totalMinutes ?? 0));
  const snapshotTotals = pkg.settlements
    .map((s: { onlineSnapshotTotalMinutes?: number | null }) => Number(s.onlineSnapshotTotalMinutes))
    .filter((x: number) => Number.isFinite(x) && x >= 0);
  const settledUpTo = snapshotTotals.length > 0 ? Math.max(...snapshotTotals) : 0;
  const pendingMinutes = Math.max(0, totalMinutes - settledUpTo);
  if (pendingMinutes <= 0) {
    redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&msg=already-settled`);
  }

  let created: { id: string };
  try {
    created = await prisma.partnerSettlement.create({
      data: {
        studentId: pkg.studentId,
        packageId: pkg.id,
        onlineSnapshotTotalMinutes: totalMinutes,
        mode: "ONLINE_PACKAGE_END",
        status: "PENDING",
        hours: Number(toHours(pendingMinutes).toFixed(2)),
        amount: calcAmountByRatePer45(pendingMinutes, rates.onlineRatePer45),
        note: `Online package completed: ${pkg.course?.name ?? pkg.courseId} | packageId=${pkg.id} | settled ${settledUpTo}->${totalMinutes} mins`,
      },
    });
  } catch (err) {
    if (isSchemaNotReadyError(err)) {
      redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&err=schema-not-ready`);
    }
    throw err;
  }

  revalidatePath("/admin/reports/partner-settlement");
  redirect(
    buildSettlementPageUrl(month, {
      msg: "online-created",
      settlementFlow: "online-created",
      focusType: "record",
      focusId: created.id,
    })
  );
}

async function createOfflineSettlementAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  if (user.role === "FINANCE") {
    redirect("/admin/reports/partner-settlement?err=forbidden");
  }

  const studentId = typeof formData.get("studentId") === "string" ? String(formData.get("studentId")) : "";
  const month = typeof formData.get("month") === "string" ? String(formData.get("month")) : monthKey(new Date());
  const range = toBizMonthRange(month);

  if (!studentId || !range) {
    redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&err=invalid-offline-input`);
  }

  let existed: Awaited<ReturnType<typeof prisma.partnerSettlement.findFirst>>;
  try {
    existed = await prisma.partnerSettlement.findFirst({
      where: { studentId, monthKey: month, mode: "OFFLINE_MONTHLY" },
    });
  } catch (err) {
    if (isSchemaNotReadyError(err)) {
      redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&err=schema-not-ready`);
    }
    throw err;
  }

  if (existed) {
    redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&msg=already-settled`);
  }

  const rows = await prisma.attendance.findMany({
    where: {
      studentId,
      package: { is: { settlementMode: "OFFLINE_MONTHLY" } },
      session: {
        startAt: { gte: range.start, lt: range.end },
        feedbacks: { some: { content: { not: "" } } },
      },
    },
    include: {
      session: { select: { id: true, startAt: true, endAt: true } },
      package: { select: { course: { select: { name: true } } } },
    },
  });
  const eligibleRows = rows.filter((r) => isAttendanceSettlementEligible(r));
  const chargedExcusedCount = eligibleRows.filter((r) => r.status === "EXCUSED" && r.excusedCharge).length;

  let totalMinutes = 0;
  const courseNames = new Set<string>();
  for (const r of eligibleRows) {
    const min = Math.max(0, Math.round((r.session.endAt.getTime() - r.session.startAt.getTime()) / 60000));
    totalMinutes += min;
    const courseName = r.package?.course?.name?.trim();
    if (courseName) courseNames.add(courseName);
  }
  const courseNote = Array.from(courseNames).join(", ");
  const rates = await getSettlementRates();

  let created: { id: string };
  try {
    created = await prisma.partnerSettlement.create({
      data: {
        studentId,
        monthKey: month,
        mode: "OFFLINE_MONTHLY",
        status: "PENDING",
        hours: Number(toHours(totalMinutes).toFixed(2)),
        amount: calcAmountByRatePer45(totalMinutes, rates.offlineRatePer45),
        note: `Offline monthly settlement ${month}${courseNote ? ` | Courses: ${courseNote}` : ""}${
          chargedExcusedCount > 0 ? ` | Charged excused sessions: ${chargedExcusedCount}` : ""
        }`,
      },
    });
  } catch (err) {
    if (isSchemaNotReadyError(err)) {
      redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&err=schema-not-ready`);
    }
    throw err;
  }

  revalidatePath("/admin/reports/partner-settlement");
  redirect(
    buildSettlementPageUrl(month, {
      msg: "offline-created",
      settlementFlow: "offline-created",
      focusType: "record",
      focusId: created.id,
    })
  );
}

async function clearSettlementRecordsAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  if (user.role === "FINANCE") {
    redirect("/admin/reports/partner-settlement?err=forbidden");
  }

  const month = typeof formData.get("month") === "string" ? String(formData.get("month")) : monthKey(new Date());
  const source = await findPartnerSource();
  if (!source) {
    redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&err=source-not-found`);
  }

  await prisma.partnerSettlement.deleteMany({
    where: { student: { sourceChannelId: source.id } },
  });

  revalidatePath("/admin/reports/partner-settlement");
  redirect(
    buildSettlementPageUrl(month, {
      msg: "settlements-cleared",
      settlementFlow: "settlements-cleared",
      focusType: null,
      focusId: null,
    })
  );
}

async function revertSettlementRecordAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  if (user.role === "FINANCE") {
    redirect("/admin/reports/partner-settlement?err=forbidden");
  }

  const month = typeof formData.get("month") === "string" ? String(formData.get("month")) : monthKey(new Date());
  const settlementId = typeof formData.get("settlementId") === "string" ? String(formData.get("settlementId")).trim() : "";
  if (!settlementId) {
    redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&err=invalid-settlement`);
  }

  const source = await findPartnerSource();
  if (!source) {
    redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&err=source-not-found`);
  }

  const row = await prisma.partnerSettlement.findUnique({
    where: { id: settlementId },
    select: { id: true, student: { select: { sourceChannelId: true } } },
  });
  if (!row || row.student?.sourceChannelId !== source.id) {
    redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&err=invalid-settlement`);
  }

  const billing = await listPartnerBilling();
  const linked = billing.invoices.some((inv) => inv.settlementIds.includes(settlementId));
  if (linked) {
    redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&err=settlement-invoiced`);
  }

  await prisma.partnerSettlement.delete({ where: { id: settlementId } });
  revalidatePath("/admin/reports/partner-settlement");
  redirect(
    buildSettlementPageUrl(month, {
      msg: "settlement-reverted",
      settlementFlow: "settlement-reverted",
      focusType: null,
      focusId: null,
    })
  );
}

export default async function PartnerSettlementPage({
  searchParams,
}: {
  searchParams?: Promise<{
    month?: string;
    msg?: string;
    err?: string;
    focusType?: string;
    focusId?: string;
    history?: string;
    panel?: string;
    settlementFlow?: string;
  }>;
}) {
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const lang = await getLang();
  const sp = await searchParams;
  const defaultMonth = monthKey(new Date());
  const monthParam = typeof sp?.month === "string" ? sp.month : "";
  const msg = sp?.msg ?? "";
  const err = sp?.err ?? "";
  const focusType = sp?.focusType ?? "";
  const focusId = sp?.focusId ?? "";
  const historyParam = typeof sp?.history === "string" ? sp.history : "";
  const panelParam = typeof sp?.panel === "string" ? sp.panel : "";
  const settlementFlow = sp?.settlementFlow ?? "";
  const canResumeRememberedView =
    !monthParam &&
    !historyParam &&
    !panelParam &&
    !focusType &&
    !focusId &&
    !settlementFlow &&
    !msg &&
    !err;
  const cookieStore = await cookies();
  const rememberedView = canResumeRememberedView
    ? parseRememberedPartnerSettlementView(cookieStore.get(PARTNER_SETTLEMENT_COOKIE)?.value ?? "", defaultMonth)
    : {
        month: defaultMonth,
        history: "all" as const,
        panel: "",
        value: "",
      };
  const month = monthParam || rememberedView.month;
  const historyFilter = historyParam ? normalizeSettlementHistory(historyParam) : rememberedView.history;
  const openPanel = panelParam ? normalizeSettlementPanel(panelParam) : rememberedView.panel;
  const resumedRememberedView = canResumeRememberedView && Boolean(rememberedView.value);
  const rememberedViewValue = (() => {
    const params = new URLSearchParams();
    if (month !== defaultMonth) params.set("month", month);
    if (historyFilter !== "all") params.set("history", historyFilter);
    if (openPanel) params.set("panel", openPanel);
    return params.toString();
  })();
  const rates = await getSettlementRates();
  const isFinanceOnlyUser = (current?.role ?? admin.role) === "FINANCE";

  const monthRange = toBizMonthRange(month);
  if (!monthRange) {
    return (
      <div>
        <h2>{t(lang, "Partner Settlement", "合作方结算中心")}</h2>
        <div style={{ color: "#b00" }}>{t(lang, "Invalid month format. Use YYYY-MM.", "月份格式错误，请使用 YYYY-MM。")}</div>
      </div>
    );
  }

  const source = await findPartnerSource();
  if (!source) {
    return (
      <div>
        <h2>{t(lang, "Partner Settlement", "合作方结算中心")}</h2>
        <div style={{ color: "#b00" }}>{t(lang, "Source channel not found.", "未找到来源渠道。")}</div>
      </div>
    );
  }

  let schemaNotReady = false;
  let modePackages: Array<{
    id: string;
    status: string;
    type: string;
    remainingMinutes: number | null;
    settlementMode: "ONLINE_PACKAGE_END" | "OFFLINE_MONTHLY" | null;
    student: { id: string; name: string } | null;
    course: { id: string; name: string } | null;
  }> = [];
  let onlinePending: Array<{
    id: string;
    student: { id: string; name: string } | null;
    course: { name: string } | null;
    status: string;
    pendingMinutes: number;
  }> = [];
  let offlinePending: Array<{ studentId: string; studentName: string; sessions: number; totalMinutes: number; hours: number; chargedExcusedSessions: number }> = [];
  let offlineWarnings: Array<{
    studentId: string;
    studentName: string;
    totalAttendances: number;
    eligibleAttendances: number;
    missingFeedbackCount: number;
    statusExcludedCount: number;
  }> = [];
  let recentInvoiceStats: Array<{
    invoiceId: string;
    invoiceNo: string;
    createdAt: string;
    mode: "ONLINE_PACKAGE_END" | "OFFLINE_MONTHLY";
    monthKey: string | null;
    studentNames: string[];
    settlementCount: number;
    itemCount: number;
    totalHours: number;
    totalAmount: number;
    receiptNo: string | null;
  }> = [];
  let recentPendingSettlements: Array<{
    id: string;
    createdAt: Date;
    mode: "ONLINE_PACKAGE_END" | "OFFLINE_MONTHLY";
    monthKey: string | null;
    student: { id: string; name: string } | null;
    courseName: string;
    hours: number;
    amount: number;
    status: string;
  }> = [];

  try {
    modePackages = await prisma.coursePackage.findMany({
      where: { student: { sourceChannelId: source.id } },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        status: true,
        type: true,
        remainingMinutes: true,
        settlementMode: true,
        student: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
      },
      take: 500,
    });

    const onlinePackages = await prisma.coursePackage.findMany({
      where: {
        type: "HOURS",
        settlementMode: "ONLINE_PACKAGE_END",
        student: { sourceChannelId: source.id },
        remainingMinutes: { lte: 0 },
      },
      include: {
        student: { select: { id: true, name: true } },
        course: { select: { name: true } },
        settlements: { where: { mode: "ONLINE_PACKAGE_END" }, select: { id: true, onlineSnapshotTotalMinutes: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });
    onlinePending = onlinePackages
      .map((p) => {
        const totalMinutes = Math.max(0, Number(p.totalMinutes ?? 0));
        const snapshotTotals = p.settlements
          .map((s) => Number(s.onlineSnapshotTotalMinutes))
          .filter((x) => Number.isFinite(x) && x >= 0);
        const settledUpTo = snapshotTotals.length > 0 ? Math.max(...snapshotTotals) : 0;
        const pendingMinutes = Math.max(0, totalMinutes - settledUpTo);
        return { ...p, pendingMinutes };
      })
      .filter((p) => p.pendingMinutes > 0);

    const [offlineAttendanceRows, offlineSettledRows, offlineAuditRows] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          package: { is: { settlementMode: "OFFLINE_MONTHLY" } },
          student: { sourceChannelId: source.id },
          session: {
            startAt: { gte: monthRange.start, lt: monthRange.end },
            feedbacks: { some: { content: { not: "" } } },
          },
        },
        include: {
          student: { select: { id: true, name: true } },
          session: {
            select: {
              id: true,
              startAt: true,
              endAt: true,
              class: {
                select: {
                  course: { select: { name: true } },
                  subject: { select: { name: true } },
                  level: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
      prisma.partnerSettlement.findMany({
        where: {
          mode: "OFFLINE_MONTHLY",
          monthKey: month,
          student: { sourceChannelId: source.id },
        },
        select: { id: true, studentId: true },
      }),
      prisma.attendance.findMany({
        where: {
          package: { is: { settlementMode: "OFFLINE_MONTHLY" } },
          student: { sourceChannelId: source.id },
          session: {
            startAt: { gte: monthRange.start, lt: monthRange.end },
          },
        },
        select: {
          studentId: true,
          status: true,
          excusedCharge: true,
          student: { select: { name: true } },
          session: {
            select: {
              feedbacks: {
                where: { content: { not: "" } },
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      }),
    ]);

    const offlineSettledSet = new Set(offlineSettledRows.map((x) => x.studentId));
    const offlineAgg = new Map<string, { studentName: string; sessions: number; totalMinutes: number; chargedExcusedSessions: number }>();
    for (const row of offlineAttendanceRows) {
      if (!isAttendanceSettlementEligible(row)) continue;
      const prev = offlineAgg.get(row.studentId);
      const minutes = Math.max(0, Math.round((row.session.endAt.getTime() - row.session.startAt.getTime()) / 60000));
      const chargedExcusedDelta = row.status === "EXCUSED" && row.excusedCharge ? 1 : 0;
      if (prev) {
        prev.sessions += 1;
        prev.totalMinutes += minutes;
        prev.chargedExcusedSessions += chargedExcusedDelta;
      } else {
        offlineAgg.set(row.studentId, {
          studentName: row.student?.name ?? "-",
          sessions: 1,
          totalMinutes: minutes,
          chargedExcusedSessions: chargedExcusedDelta,
        });
      }
    }

    offlinePending = Array.from(offlineAgg.entries())
      .filter(([studentId]) => !offlineSettledSet.has(studentId))
      .map(([studentId, agg]) => ({
        studentId,
        studentName: agg.studentName,
        sessions: agg.sessions,
        totalMinutes: agg.totalMinutes,
        hours: toHours(agg.totalMinutes),
        chargedExcusedSessions: agg.chargedExcusedSessions,
      }))
      .sort((a, b) => a.studentName.localeCompare(b.studentName));

    const warningAgg = new Map<string, {
      studentName: string;
      totalAttendances: number;
      eligibleAttendances: number;
      missingFeedbackCount: number;
      statusExcludedCount: number;
    }>();
    for (const row of offlineAuditRows) {
      const hasFeedback = row.session.feedbacks.length > 0;
      const eligibleStatus = isAttendanceSettlementEligible(row);
      const prev = warningAgg.get(row.studentId);
      if (prev) {
        prev.totalAttendances += 1;
        if (hasFeedback && eligibleStatus) prev.eligibleAttendances += 1;
        if (!hasFeedback) prev.missingFeedbackCount += 1;
        if (!eligibleStatus) prev.statusExcludedCount += 1;
      } else {
        warningAgg.set(row.studentId, {
          studentName: row.student?.name ?? "-",
          totalAttendances: 1,
          eligibleAttendances: hasFeedback && eligibleStatus ? 1 : 0,
          missingFeedbackCount: hasFeedback ? 0 : 1,
          statusExcludedCount: eligibleStatus ? 0 : 1,
        });
      }
    }
    offlineWarnings = Array.from(warningAgg.entries())
      .filter(([studentId, agg]) => !offlineSettledSet.has(studentId) && agg.totalAttendances !== agg.eligibleAttendances)
      .map(([studentId, agg]) => ({ studentId, ...agg }))
      .sort((a, b) => a.studentName.localeCompare(b.studentName));

    const billing = await listPartnerBilling();
    const settlementIdList = Array.from(new Set(billing.invoices.flatMap((x) => x.settlementIds)));
    recentPendingSettlements = await prisma.partnerSettlement.findMany({
      where: {
        student: { sourceChannelId: source.id },
        ...(settlementIdList.length ? { id: { notIn: settlementIdList } } : {}),
      },
      select: {
        id: true,
        createdAt: true,
        mode: true,
        monthKey: true,
        status: true,
        hours: true,
        amount: true,
        student: { select: { id: true, name: true } },
        package: { select: { course: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }).then((rows) =>
      rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        mode: r.mode as "ONLINE_PACKAGE_END" | "OFFLINE_MONTHLY",
        monthKey: r.monthKey,
        student: r.student,
        courseName: r.package?.course?.name ?? "-",
        hours: Number(r.hours ?? 0),
        amount: Number(r.amount ?? 0),
        status: r.status,
      }))
    );

    const settlementRows = settlementIdList.length
      ? await prisma.partnerSettlement.findMany({
          where: { id: { in: settlementIdList }, student: { sourceChannelId: source.id } },
          select: {
            id: true,
            hours: true,
            student: { select: { name: true } },
          },
        })
      : [];
    const settlementMap = new Map(settlementRows.map((x) => [x.id, x]));
    const receiptByInvoiceId = new Map(billing.receipts.map((r) => [r.invoiceId, r]));
    recentInvoiceStats = billing.invoices
      .map((inv) => {
        const settlementRowsForInvoice = inv.settlementIds.map((id) => settlementMap.get(id)).filter((x) => Boolean(x));
        const studentNameSet = new Set(
          settlementRowsForInvoice.map((x) => x?.student?.name?.trim() || "").filter(Boolean)
        );
        const totalHours = settlementRowsForInvoice.reduce((acc, x) => acc + Number(x?.hours ?? 0), 0);
        return {
          invoiceId: inv.id,
          invoiceNo: inv.invoiceNo,
          createdAt: inv.createdAt,
          mode: inv.mode,
          monthKey: inv.monthKey,
          studentNames: Array.from(studentNameSet),
          settlementCount: inv.settlementIds.length,
          itemCount: inv.lines.length,
          totalHours: Number(totalHours.toFixed(2)),
          totalAmount: inv.totalAmount,
          receiptNo: receiptByInvoiceId.get(inv.id)?.receiptNo ?? null,
        };
      })
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 100);
  } catch (e) {
    if (isSchemaNotReadyError(e)) {
      schemaNotReady = true;
      modePackages = await prisma.coursePackage
        .findMany({
          where: { student: { sourceChannelId: source.id } },
          orderBy: [{ updatedAt: "desc" }],
          select: {
            id: true,
            status: true,
            type: true,
            remainingMinutes: true,
            student: { select: { id: true, name: true } },
            course: { select: { id: true, name: true } },
          },
          take: 500,
        })
        .then((rows) => rows.map((x) => ({ ...x, settlementMode: null })));
    } else {
      throw e;
    }
  }

  const onlinePendingTotalAmount = onlinePending.reduce(
    (acc, p) => acc + calcAmountByRatePer45(Number(p.pendingMinutes ?? 0), rates.onlineRatePer45),
    0,
  );
  const offlinePendingTotalAmount = offlinePending.reduce(
    (acc, r) => acc + calcAmountByRatePer45(r.totalMinutes, rates.offlineRatePer45),
    0,
  );
  const cardStyle = { border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, marginBottom: 14, background: "#fff" };
  const primaryBtn = { border: "1px solid #93c5fd", background: "#eff6ff", color: "#1e3a8a", borderRadius: 8, padding: "4px 10px", fontWeight: 700 };
  const dangerBtn = { border: "1px solid #fecdd3", background: "#fff1f2", color: "#9f1239", borderRadius: 8, padding: "4px 10px", fontWeight: 700 };
  const thCell = { position: "sticky", top: 0, background: "#f5f5f5", zIndex: 1 } as const;
  const pendingPill = { color: "#92400e", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 999, padding: "2px 8px", fontWeight: 700, display: "inline-block" };
  const donePill = { color: "#166534", background: "#dcfce7", border: "1px solid #86efac", borderRadius: 999, padding: "2px 8px", fontWeight: 700, display: "inline-block" };
  const sectionTitleStyle = { marginTop: 0, marginBottom: 12 } as const;
  const sectionHintStyle = { color: "#6b7280", fontSize: 13, marginTop: -4, marginBottom: 12 } as const;
  const buildPageHref = (overrides: Record<string, string | null | undefined>) => {
    const params = new URLSearchParams();
    params.set("month", month);
    if (historyFilter && historyFilter !== "all") params.set("history", historyFilter);
    if (focusType) params.set("focusType", focusType);
    if (focusId) params.set("focusId", focusId);
    if (openPanel) params.set("panel", openPanel);
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null || value === undefined || value === "") params.delete(key);
      else params.set(key, value);
    }
    return `/admin/reports/partner-settlement?${params.toString()}`;
  };
  const translatedMsg =
    msg === "rate-updated"
      ? t(lang, "Settlement rates updated.", "结算费率已更新。")
      : msg === "online-created"
      ? t(lang, "Online settlement record created.", "线上结算记录已创建。")
      : msg === "offline-created"
      ? t(lang, "Offline settlement record created.", "线下结算记录已创建。")
      : msg === "settlements-cleared"
      ? t(lang, "Settlement test records cleared.", "测试结算记录已清空。")
      : msg === "settlement-reverted"
      ? t(lang, "Settlement record reverted.", "结算记录已撤回。")
      : msg === "already-settled"
      ? t(lang, "This item has already been settled.", "该项目已经结算过。")
      : msg;

  const filteredInvoiceStats = recentInvoiceStats.filter((r) => {
    if (historyFilter === "receipt-created") return Boolean(r.receiptNo);
    if (historyFilter === "receipt-pending") return !r.receiptNo;
    return true;
  });
  const warningSummary = {
    missingFeedbackRows: offlineWarnings.filter((w) => w.missingFeedbackCount > 0).length,
    statusExcludedRows: offlineWarnings.filter((w) => w.statusExcludedCount > 0).length,
  };
  const firstMissingFeedbackWarning = offlineWarnings.find((w) => w.missingFeedbackCount > 0) ?? null;
  const firstStatusExcludedWarning = offlineWarnings.find((w) => w.statusExcludedCount > 0) ?? null;
  const focusedRecordRow = focusType === "record" ? recentPendingSettlements.find((r) => r.id === focusId) ?? null : null;
  const nextPendingRecord = recentPendingSettlements.find((r) => r.id !== focusId) ?? recentPendingSettlements[0] ?? null;
  const flowCard =
    settlementFlow === "online-created"
      ? {
          tone: "green" as const,
          title: t(lang, "Online settlement record created.", "线上结算记录已创建。"),
          detail: focusedRecordRow
            ? t(lang, "The new billing record stays highlighted below so you can continue in billing workspace without re-scanning the queue.", "新生成的结算记录会在下方继续高亮，方便你直接进入账单工作区，不用重新扫描队列。")
            : t(lang, "The record was created. Continue in billing workspace or move to the next online package.", "结算记录已经生成。你可以继续进入账单工作区，或回到下一条线上课包。"),
          links: [
            focusedRecordRow
              ? { href: "#partner-record-" + focusedRecordRow.id, label: t(lang, "Jump to new record", "跳到新记录") }
              : null,
            { href: `/admin/reports/partner-settlement/billing?mode=ONLINE_PACKAGE_END&month=${encodeURIComponent(month)}`, label: t(lang, "Open billing workspace", "打开账单工作区") },
            onlinePending[0]
              ? { href: buildPageHref({ focusType: "online", focusId: onlinePending[0].id }) + "#partner-online-" + onlinePending[0].id, label: t(lang, "Open next online item", "打开下一条线上项") }
              : null,
          ].filter((item): item is { href: string; label: string } => Boolean(item)),
        }
      : settlementFlow === "offline-created"
      ? {
          tone: "green" as const,
          title: t(lang, "Offline settlement record created.", "线下结算记录已创建。"),
          detail: focusedRecordRow
            ? t(lang, "The new billing record stays highlighted below so you can continue with invoice review or move back to the next offline student.", "新生成的结算记录会在下方继续高亮，方便你继续开票，或回到下一位线下学生。")
            : t(lang, "The record was created. Continue in billing workspace or return to the next offline queue item.", "结算记录已经生成。你可以继续进入账单工作区，或回到下一条线下队列。"),
          links: [
            focusedRecordRow
              ? { href: "#partner-record-" + focusedRecordRow.id, label: t(lang, "Jump to new record", "跳到新记录") }
              : null,
            { href: `/admin/reports/partner-settlement/billing?mode=OFFLINE_MONTHLY&month=${encodeURIComponent(month)}`, label: t(lang, "Open billing workspace", "打开账单工作区") },
            offlinePending[0]
              ? { href: buildPageHref({ focusType: "offline", focusId: offlinePending[0].studentId }) + "#partner-offline-" + offlinePending[0].studentId, label: t(lang, "Open next offline item", "打开下一条线下项") }
              : null,
          ].filter((item): item is { href: string; label: string } => Boolean(item)),
        }
      : settlementFlow === "settlement-reverted"
      ? {
          tone: "amber" as const,
          title: t(lang, "Settlement record reverted.", "结算记录已撤回。"),
          detail: nextPendingRecord
            ? t(lang, "The queue has been refreshed. Move straight to the next pending billing record so work keeps flowing.", "队列已经刷新。你可以直接继续处理下一条待开票记录。")
            : t(lang, "The selected record was removed from billing queue. Return to online or offline queues if you need to recreate it.", "这条记录已经从待开票队列移除；如果需要重建，请返回线上或线下队列。"),
          links: [
            nextPendingRecord
              ? { href: buildPageHref({ focusType: "record", focusId: nextPendingRecord.id }) + "#partner-record-" + nextPendingRecord.id, label: t(lang, "Open next billing record", "打开下一条待开票记录") }
              : null,
            { href: "#action-queue-online", label: t(lang, "Back to online queue", "回到线上队列") },
            { href: "#action-queue-offline", label: t(lang, "Back to offline queue", "回到线下队列") },
          ].filter((item): item is { href: string; label: string } => Boolean(item)),
        }
      : settlementFlow === "rate-updated"
      ? {
          tone: "blue" as const,
          title: t(lang, "Settlement rates updated.", "结算费率已更新。"),
          detail: t(lang, "The new rates will apply to future settlement records. Return to the active queue when you are ready to keep working.", "新的费率会应用到后续结算记录。确认后可以回到当前队列继续处理。"),
          links: [
            { href: "#settlement-setup", label: t(lang, "Jump to setup", "跳到结算配置") },
            { href: "#action-queue-records", label: t(lang, "Back to live queue", "回到实时队列") },
          ],
        }
      : settlementFlow === "settlements-cleared"
      ? {
          tone: "amber" as const,
          title: t(lang, "Settlement test records cleared.", "测试结算记录已清空。"),
          detail: t(lang, "The billing queue has been reset for this source. Rebuild only the records you actually need next.", "该来源的测试结算记录已经清空。接下来只重建真正需要继续处理的记录即可。"),
          links: [
            { href: "#action-queue-online", label: t(lang, "Open online queue", "打开线上队列") },
            { href: "#action-queue-offline", label: t(lang, "Open offline queue", "打开线下队列") },
          ],
        }
      : null;
  const flowCardStyle =
    flowCard?.tone === "green"
      ? { border: "1px solid #86efac", background: "#f0fdf4", color: "#166534" }
      : flowCard?.tone === "blue"
      ? { border: "1px solid #93c5fd", background: "#eff6ff", color: "#1d4ed8" }
      : { border: "1px solid #fcd34d", background: "#fffbeb", color: "#92400e" };

  const selectedItem = (() => {
    if (focusType === "record" && focusId) {
      const row = recentPendingSettlements.find((r) => r.id === focusId);
      if (row) {
        return {
          type: "record" as const,
          title: t(lang, "Pending billing record", "待开票记录"),
          name: row.student?.name ?? "-",
          summary: `${row.mode === "ONLINE_PACKAGE_END" ? t(lang, "Online", "线上") : t(lang, "Offline Monthly", "线下按月")} · ${row.monthKey ?? month}`,
          amount: row.amount,
          hours: row.hours,
          note: t(lang, "Next step: review this record in billing workspace or revert it if it should not proceed.", "下一步：到账单工作区处理，或在确认不应继续时撤回。"),
          actionKind: "link" as const,
          actionHref: `/admin/reports/partner-settlement/billing?mode=${encodeURIComponent(row.mode)}&month=${encodeURIComponent(row.monthKey ?? month)}`,
          actionLabel: t(lang, "Review billing record", "处理这条开票记录"),
          hiddenMonth: row.monthKey ?? month,
        };
      }
    }
    if (focusType === "online" && focusId) {
      const row = onlinePending.find((r) => r.id === focusId);
      if (row) {
        return {
          type: "online" as const,
          title: t(lang, "Online settlement candidate", "线上结算候选"),
          name: row.student?.name ?? "-",
          summary: row.course?.name ?? "-",
          amount: calcAmountByRatePer45(Number(row.pendingMinutes ?? 0), rates.onlineRatePer45),
          hours: toHours(row.pendingMinutes ?? 0),
          note: t(lang, "Next step: create one settlement item for this completed package.", "下一步：为这个已完结课包生成一条结算记录。"),
          actionKind: "create-online" as const,
          actionLabel: t(lang, "Create online settlement", "生成线上结算"),
          packageId: row.id,
        };
      }
    }
    if (focusType === "offline" && focusId) {
      const row = offlinePending.find((r) => r.studentId === focusId);
      if (row) {
        return {
          type: "offline" as const,
          title: t(lang, "Offline settlement candidate", "线下结算候选"),
          name: row.studentName,
          summary: month,
          amount: calcAmountByRatePer45(row.totalMinutes, rates.offlineRatePer45),
          hours: row.hours,
          note: t(lang, "Next step: confirm attendance and feedback, then create the monthly settlement.", "下一步：确认点名与反馈后，生成该学生的月度结算。"),
          actionKind: "create-offline" as const,
          actionLabel: t(lang, "Create offline settlement", "生成线下结算"),
          studentId: row.studentId,
        };
      }
    }
    if (focusType === "warning" && focusId) {
      const row = offlineWarnings.find((r) => r.studentId === focusId);
      if (row) {
        return {
          type: "warning" as const,
          title: t(lang, "Settlement warning", "结算预警"),
          name: row.studentName,
          summary: `${t(lang, "Gap", "差额")}: ${row.totalAttendances - row.eligibleAttendances}`,
          amount: null,
          hours: null,
          note: t(lang, "Next step: open the student attendance view and check missing feedback or excluded statuses before billing.", "下一步：打开学生点名视图，先核对缺失反馈或不纳入状态，再决定是否生成账单。"),
          actionKind: "link" as const,
          actionHref: studentAttendanceHref(row.studentId, month),
          actionLabel: t(lang, "Fix attendance issues", "修复点名异常"),
        };
      }
    }

    const defaultRecord = recentPendingSettlements[0];
    if (defaultRecord) {
      return {
        type: "record" as const,
        title: t(lang, "Pending billing record", "待开票记录"),
        name: defaultRecord.student?.name ?? "-",
        summary: `${defaultRecord.mode === "ONLINE_PACKAGE_END" ? t(lang, "Online", "线上") : t(lang, "Offline Monthly", "线下按月")} · ${defaultRecord.monthKey ?? month}`,
        amount: defaultRecord.amount,
        hours: defaultRecord.hours,
        note: t(lang, "Next step: review this record in billing workspace or revert it if it should not proceed.", "下一步：到账单工作区处理，或在确认不应继续时撤回。"),
        actionKind: "link" as const,
        actionHref: `/admin/reports/partner-settlement/billing?mode=${encodeURIComponent(defaultRecord.mode)}&month=${encodeURIComponent(defaultRecord.monthKey ?? month)}`,
        actionLabel: t(lang, "Review billing record", "处理这条开票记录"),
        hiddenMonth: defaultRecord.monthKey ?? month,
      };
    }
    const defaultWarning = offlineWarnings[0];
    if (defaultWarning) {
      return {
        type: "warning" as const,
        title: t(lang, "Settlement warning", "结算预警"),
        name: defaultWarning.studentName,
        summary: `${t(lang, "Gap", "差额")}: ${defaultWarning.totalAttendances - defaultWarning.eligibleAttendances}`,
        amount: null,
        hours: null,
        note: t(lang, "Next step: open the student attendance view and check missing feedback or excluded statuses before billing.", "下一步：打开学生点名视图，先核对缺失反馈或不纳入状态，再决定是否生成账单。"),
        actionKind: "link" as const,
        actionHref: studentAttendanceHref(defaultWarning.studentId, month),
        actionLabel: t(lang, "Fix attendance issues", "修复点名异常"),
      };
    }
    return null;
  })();

  return (
    <div>
      <RememberedWorkbenchQueryClient
        cookieKey={PARTNER_SETTLEMENT_COOKIE}
        storageKey="adminPartnerSettlementPreferredView"
        value={rememberedViewValue}
      />
      <h2>{t(lang, "Partner Settlement", "合作方结算中心")}</h2>
      <div style={{ marginBottom: 10, color: "#666" }}>
        {t(
          lang,
          `Only students with source channel = ${PARTNER_SOURCE_NAME} are included.`,
          `仅纳入来源为${PARTNER_SOURCE_NAME}的学生。`
        )}
      </div>
      {resumedRememberedView ? (
        <div
          style={{
            marginBottom: 12,
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
              "Resumed your last settlement view. Use the shortcut on the right if you want to return to the default workbench.",
              "已恢复你上次的结算工作视图；如果要回到默认工作台，可直接使用右侧快捷入口。"
            )}
          </div>
          <a href="/admin/reports/partner-settlement">{t(lang, "Back to default workbench", "回到默认工作台")}</a>
        </div>
      ) : null}
      {schemaNotReady || err === "schema-not-ready" ? (
        <div
          style={{
            marginBottom: 10,
            color: "#92400e",
            border: "1px solid #f59e0b",
            background: "#fffbeb",
            borderRadius: 8,
            padding: "8px 10px",
          }}
        >
          {t(
            lang,
            "Preview database migration is not ready yet. Please run migrations on this environment before using settlement actions.",
            "Preview database migration is not ready yet. Please run migrations on this environment before using settlement actions."
          )}
        </div>
      ) : null}

      {translatedMsg ? <div style={{ marginBottom: 8, color: "#166534" }}>{translatedMsg}</div> : null}
      {err ? <div style={{ marginBottom: 8, color: "#b00" }}>{err}</div> : null}
      {err === "forbidden" ? <div style={{ marginBottom: 8, color: "#b00" }}>{t(lang, "Finance role cannot modify this data.", "财务角色不能修改此类数据。")}</div> : null}
      {err === "invalid-settlement" ? <div style={{ marginBottom: 8, color: "#b00" }}>{t(lang, "Settlement record not found.", "未找到结算记录。")}</div> : null}
      {err === "settlement-invoiced" ? <div style={{ marginBottom: 8, color: "#b00" }}>{t(lang, "Cannot revert: this settlement is already linked to an invoice.", "不能撤回：该结算记录已关联Invoice。")}</div> : null}
      {err === "manager-reject-reason" ? <div style={{ marginBottom: 8, color: "#b00" }}>{t(lang, "Please enter manager reject reason.", "请填写管理驳回原因。")}</div> : null}
      {err === "finance-reject-reason" ? <div style={{ marginBottom: 8, color: "#b00" }}>{t(lang, "Please enter reject reason.", "请填写驳回原因。")}</div> : null}
      {err === "manager-approval-required" ? <div style={{ marginBottom: 8, color: "#b00" }}>{t(lang, "All manager approvals are required before finance approval.", "财务审批前必须先完成全部管理审批。")}</div> : null}
      {err === "settlement-locked" ? <div style={{ marginBottom: 8, color: "#b00" }}>{t(lang, "Settlement already exported and locked.", "该结算单已导出并锁定。")}</div> : null}
      {flowCard ? (
        <div
          style={{
            ...flowCardStyle,
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
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

      <div style={{ ...cardStyle, position: "sticky", top: 8, zIndex: 5 }}>
        <form method="GET" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label>
            {t(lang, "Month", "月份")}: <input type="month" name="month" defaultValue={month} style={{ marginLeft: 6 }} />
          </label>
          <button type="submit" data-apply-submit="1" style={primaryBtn}>{t(lang, "Apply", "应用")}</button>
          <a
            href={`/admin/reports/partner-settlement/billing?mode=ONLINE_PACKAGE_END&month=${encodeURIComponent(month)}`}
            style={{ marginLeft: 8, fontWeight: 700 }}
          >
            {t(lang, "Open Billing Workspace", "打开账单工作区")}
          </a>
        </form>
      </div>

      <div id="overview" style={{ ...cardStyle, background: "#f8fafc" }}>
        <h3 style={{ marginTop: 0 }}>{t(lang, "Pending Overview", "待结算概览")}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
            <div style={{ color: "#6b7280", fontSize: 12 }}>{t(lang, "Online Pending", "线上待结算")}</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{onlinePending.length}</div>
            <div style={{ color: "#334155" }}>SGD {onlinePendingTotalAmount.toFixed(2)}</div>
            <div style={{ marginTop: 8 }}>
              <a href="#action-queue-online" style={{ fontWeight: 700 }}>{t(lang, "Go to queue", "前往处理")}</a>
            </div>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
            <div style={{ color: "#6b7280", fontSize: 12 }}>{t(lang, "Offline Pending", "线下待结算")}</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{offlinePending.length}</div>
            <div style={{ color: "#334155" }}>SGD {offlinePendingTotalAmount.toFixed(2)}</div>
            <div style={{ marginTop: 8 }}>
              <a href="#action-queue-offline" style={{ fontWeight: 700 }}>{t(lang, "Go to queue", "前往处理")}</a>
            </div>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
            <div style={{ color: "#6b7280", fontSize: 12 }}>{t(lang, "Pending Records", "待开票记录")}</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{recentPendingSettlements.length}</div>
            <div style={{ color: "#334155" }}>{t(lang, "Can be reverted", "可撤回")}</div>
            <div style={{ marginTop: 8 }}>
              <a href="#action-queue-records" style={{ fontWeight: 700 }}>{t(lang, "Review now", "立即查看")}</a>
            </div>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
            <div style={{ color: "#6b7280", fontSize: 12 }}>{t(lang, "Invoiced Records", "已开票记录")}</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{recentInvoiceStats.length}</div>
            <div style={{ color: "#334155" }}>{t(lang, "Grouped by invoice", "按Invoice聚合")}</div>
            <div style={{ marginTop: 8 }}>
              <a href={`${buildPageHref({ panel: "history" })}#billing-history`} style={{ fontWeight: 700 }}>
                {t(lang, "Open history", "打开历史")}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div id="action-queue" style={cardStyle}>
        <h3 style={sectionTitleStyle}>{t(lang, "What needs action now", "当前待处理")}</h3>
        <div style={sectionHintStyle}>
          {t(
            lang,
            "Focus on pending billing work first. History and settlement setup are below.",
            "先处理待结算和待开票项目，历史记录和结算配置在页面下方。"
          )}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href="#action-queue-records" style={{ fontWeight: 700 }}>{t(lang, "Pending billing records", "待开票记录")}</a>
          <a href="#action-queue-online" style={{ fontWeight: 700 }}>{t(lang, "Online queue", "线上队列")}</a>
          <a href="#action-queue-offline" style={{ fontWeight: 700 }}>{t(lang, "Offline queue", "线下队列")}</a>
          <a href="#integrity-workbench" style={{ fontWeight: 700 }}>{t(lang, "Integrity workbench", "异常工作台")}</a>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(320px, 0.9fr)", gap: 14, alignItems: "start" }}>
        <div>
          <div id="integrity-workbench" style={{ ...cardStyle, background: "#fffbeb", borderColor: "#f59e0b" }}>
            <h3 style={sectionTitleStyle}>{t(lang, "Integrity workbench", "异常工作台")}</h3>
            <div style={sectionHintStyle}>
              {t(
                lang,
                "Handle students with settlement gaps or package-binding issues here before creating billing records.",
                "先在这里处理结算差额或课包绑定异常，再继续生成账单。"
              )}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href="/admin/reports/undeducted-completed" style={{ fontWeight: 700 }}>
                {t(lang, "Open repair report", "打开减扣修复报表")}
              </a>
              <a href="/admin/todos" style={{ fontWeight: 700 }}>
                {t(lang, "Open todo center", "打开待办中心")}
              </a>
            </div>
            <div style={{ marginTop: 10, color: "#92400e", fontSize: 13 }}>
              {offlineWarnings.length > 0
                ? t(lang, `${offlineWarnings.length} offline warning rows need review before billing.`, `当前有 ${offlineWarnings.length} 条线下预警，建议先核对后再结算。`)
                : t(lang, "No offline warning rows need attention right now.", "当前没有需要优先处理的线下预警。")}
            </div>
            {offlineWarnings.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, marginTop: 10 }}>
                <div style={{ border: "1px solid #fde68a", borderRadius: 8, padding: 8, background: "#fff" }}>
                  <div style={{ color: "#92400e", fontSize: 12 }}>{t(lang, "Missing feedback rows", "缺反馈条目")}</div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{warningSummary.missingFeedbackRows}</div>
                  {firstMissingFeedbackWarning ? (
                    <div style={{ marginTop: 6 }}>
                      <a
                        href={buildPageHref({ focusType: "warning", focusId: firstMissingFeedbackWarning.studentId })}
                        style={{ fontWeight: 700 }}
                      >
                        {t(lang, "Review first row", "查看首条")}
                      </a>
                    </div>
                  ) : null}
                </div>
                <div style={{ border: "1px solid #fde68a", borderRadius: 8, padding: 8, background: "#fff" }}>
                  <div style={{ color: "#92400e", fontSize: 12 }}>{t(lang, "Status excluded rows", "状态不纳入条目")}</div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{warningSummary.statusExcludedRows}</div>
                  {firstStatusExcludedWarning ? (
                    <div style={{ marginTop: 6 }}>
                      <a
                        href={buildPageHref({ focusType: "warning", focusId: firstStatusExcludedWarning.studentId })}
                        style={{ fontWeight: 700 }}
                      >
                        {t(lang, "Review first row", "查看首条")}
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ ...cardStyle, position: "sticky", top: 92 }}>
          <h3 style={sectionTitleStyle}>{t(lang, "Selected item", "当前处理项")}</h3>
          {selectedItem ? (
            <>
              <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 6 }}>{selectedItem.title}</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{selectedItem.name}</div>
              <div style={{ color: "#334155", marginBottom: 10 }}>{selectedItem.summary}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginBottom: 10 }}>
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }}>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>{t(lang, "Hours", "课时")}</div>
                  <div style={{ fontWeight: 700 }}>{selectedItem.hours ?? "-"}</div>
                </div>
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }}>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>{t(lang, "Amount", "金额")}</div>
                  <div style={{ fontWeight: 700 }}>{selectedItem.amount === null ? "-" : `SGD ${Number(selectedItem.amount).toFixed(2)}`}</div>
                </div>
              </div>
              <div style={{ color: "#475569", fontSize: 13, marginBottom: 12 }}>{selectedItem.note}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {selectedItem.actionKind === "link" ? (
                  <a href={selectedItem.actionHref} style={{ ...primaryBtn, textDecoration: "none", display: "inline-block" }}>
                    {selectedItem.actionLabel}
                  </a>
                ) : selectedItem.actionKind === "create-online" ? (
                  !isFinanceOnlyUser ? (
                    <form action={createOnlineSettlementAction}>
                      <input type="hidden" name="month" value={month} />
                      <input type="hidden" name="packageId" value={selectedItem.packageId} />
                      <button type="submit" style={primaryBtn}>
                        {selectedItem.actionLabel}
                      </button>
                    </form>
                  ) : (
                    <span style={{ color: "#999" }}>{t(lang, "Read only", "只读")}</span>
                  )
                ) : !isFinanceOnlyUser ? (
                  <form action={createOfflineSettlementAction}>
                    <input type="hidden" name="month" value={month} />
                    <input type="hidden" name="studentId" value={selectedItem.studentId} />
                    <button type="submit" style={primaryBtn}>
                      {selectedItem.actionLabel}
                    </button>
                  </form>
                ) : (
                  <span style={{ color: "#999" }}>{t(lang, "Read only", "只读")}</span>
                )}
                <a href={buildPageHref({ focusType: null, focusId: null })} style={{ fontWeight: 700 }}>
                  {t(lang, "Clear focus", "清除聚焦")}
                </a>
              </div>
            </>
          ) : (
            <div style={{ color: "#6b7280" }}>
              {t(lang, "No pending item is selected yet. Choose one row from the queues below.", "当前还没有选中待处理项，请从下方队列里选择一条。")}
            </div>
          )}
        </div>
      </div>

      <div id="action-queue-records" style={cardStyle}>
        <h3 style={sectionTitleStyle}>{t(lang, "Pending billing records", "待开票记录")}</h3>
        <div style={sectionHintStyle}>
          {t(
            lang,
            "These settlement records are created and waiting for invoice review. Revert only when the settlement should not continue.",
            "这些结算记录已经生成，正在等待开票处理。只有在确认不应继续结算时才使用撤回。"
          )}
        </div>
        {!isFinanceOnlyUser ? <form action={clearSettlementRecordsAction} style={{ marginBottom: 8 }}>
          <input type="hidden" name="month" value={month} />
          <button type="submit" style={dangerBtn}>
            {t(lang, "Clear Test Records", "清空测试结算记录")}
          </button>
        </form> : null}
        {recentPendingSettlements.length === 0 ? (
          <div style={{ color: "#999" }}>{t(lang, "No pending billing records.", "暂无待开票结算记录。")}</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
          <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", minWidth: 1100 }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th align="left">{t(lang, "Created", "创建时间")}</th>
                <th align="left">{t(lang, "Student", "学生")}</th>
                <th align="left">{t(lang, "Mode", "模式")}</th>
                <th align="left">{t(lang, "Month", "月份")}</th>
                <th align="left">{t(lang, "Course", "课程")}</th>
                <th align="left">{t(lang, "Hours", "课时")}</th>
                <th align="left">{t(lang, "Amount", "金额")}</th>
                <th align="left">{t(lang, "Status", "状态")}</th>
                <th align="left">{t(lang, "Focus", "聚焦")}</th>
                <th align="left">{t(lang, "Next step", "下一步")}</th>
              </tr>
            </thead>
            <tbody>
              {recentPendingSettlements.map((r) => (
                <tr
                  key={r.id}
                  id={`partner-record-${r.id}`}
                  style={{
                    borderTop: "1px solid #eee",
                    background: focusType === "record" && focusId === r.id ? "#eff6ff" : "#fff",
                    boxShadow: focusType === "record" && focusId === r.id ? "inset 0 0 0 2px rgba(37,99,235,0.28)" : "none",
                  }}
                >
                  <td>{formatBusinessDateTime(new Date(r.createdAt))}</td>
                  <td>{r.student ? <a href={studentAttendanceHref(r.student.id, r.monthKey ?? month)}>{r.student.name}</a> : "-"}</td>
                  <td>{r.mode === "ONLINE_PACKAGE_END" ? t(lang, "Online", "线上") : t(lang, "Offline Monthly", "线下按月")}</td>
                  <td>{r.monthKey ?? "-"}</td>
                  <td>{r.courseName}</td>
                  <td>{r.hours}</td>
                  <td>{r.amount}</td>
                  <td><span style={pendingPill}>{r.status}</span></td>
                  <td>
                    <a href={buildPageHref({ focusType: "record", focusId: r.id })} style={{ fontWeight: 700 }}>
                      {t(lang, "Focus", "聚焦")}
                    </a>
                  </td>
                  <td>
                    {!isFinanceOnlyUser ? (
                      <form action={revertSettlementRecordAction}>
                        <input type="hidden" name="month" value={month} />
                        <input type="hidden" name="settlementId" value={r.id} />
                        <button type="submit" style={dangerBtn}>{t(lang, "Revert", "撤回")}</button>
                      </form>
                    ) : (
                      <span style={{ color: "#0f766e", fontWeight: 700 }}>{t(lang, "Review in billing workspace", "到账单工作区处理")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <div id="action-queue-online" style={cardStyle}>
      <h3 style={sectionTitleStyle}>{t(lang, "Ready to settle: completed online packages", "可结算：已完结线上课包")}</h3>
      <div style={{ marginBottom: 8, color: "#4b5563", fontSize: 13 }}>
        {t(
          lang,
          "Rule: one completed package = one settlement item. New purchased packages are settled separately, even for the same student.",
          "规则：每个完结课包对应一条独立结算。即使同一学生再次购买新课包，也必须分开结算。"
        )}
      </div>
      {onlinePending.length === 0 ? (
        <div style={{ color: "#999", marginBottom: 12 }}>{t(lang, "No online pending items.", "暂无线上待结算项。")}</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 18, minWidth: 980 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left" style={thCell}>{t(lang, "Student", "学生")}</th>
              <th align="left" style={thCell}>{t(lang, "Course", "课程")}</th>
              <th align="left" style={thCell}>{t(lang, "Package Status", "课包状态")}</th>
              <th align="left" style={thCell}>{t(lang, "Hours", "课时")}</th>
              <th align="left" style={thCell}>{t(lang, "Amount", "金额")}</th>
              <th align="left" style={thCell}>{t(lang, "Focus", "聚焦")}</th>
              <th align="left" style={thCell}>{t(lang, "Action", "操作")}</th>
            </tr>
          </thead>
          <tbody>
            {onlinePending.map((p) => (
              <tr
                key={p.id}
                id={`partner-online-${p.id}`}
                style={{
                  borderTop: "1px solid #eee",
                  background: focusType === "online" && focusId === p.id ? "#eff6ff" : "#fff",
                  boxShadow: focusType === "online" && focusId === p.id ? "inset 0 0 0 2px rgba(37,99,235,0.28)" : "none",
                }}
              >
                <td>
                  {p.student ? <a href={studentAttendanceHref(p.student.id, month)}>{p.student.name}</a> : "-"}
                </td>
                <td>{p.course?.name ?? "-"}</td>
                <td>{p.status}</td>
                <td>{toHours(p.pendingMinutes ?? 0)}</td>
                <td>{calcAmountByRatePer45(Number(p.pendingMinutes ?? 0), rates.onlineRatePer45)}</td>
                <td>
                  <a href={buildPageHref({ focusType: "online", focusId: p.id })} style={{ fontWeight: 700 }}>
                    {t(lang, "Focus", "聚焦")}
                  </a>
                </td>
                <td>
                  {!isFinanceOnlyUser ? (
                    <form action={createOnlineSettlementAction}>
                      <input type="hidden" name="month" value={month} />
                      <input type="hidden" name="packageId" value={p.id} />
                      <button type="submit" style={primaryBtn}>{t(lang, "Create Bill", "生成账单")}</button>
                    </form>
                  ) : (
                    <span style={{ color: "#999" }}>{t(lang, "Read only", "只读")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      </div>

      <div id="action-queue-offline" style={cardStyle}>
      <h3 style={sectionTitleStyle}>{t(lang, "Ready to settle: offline monthly attendance", "可结算：线下月度课次")}</h3>
      <div style={{ color: "#666", fontSize: 13, marginBottom: 8 }}>
        {t(
          lang,
          "Rule: include attendances where status in (PRESENT, LATE) OR (EXCUSED with charged deduction), package mode = OFFLINE_MONTHLY, session start time is within selected month (UTC+8 business month), and session has non-empty feedback. Sessions = attendance count. Hours = sum of (endAt - startAt) in minutes / 60. Charged EXCUSED count is additionally marked.",
          "统计口径：纳入 status in (PRESENT, LATE) 或（EXCUSED 且已扣课时），课包模式 = OFFLINE_MONTHLY、课次开始时间在所选月份（按 UTC+8 业务月）且该课次反馈不为空。课次 = 点名记录数；课时 = 所有课次（结束时间-开始时间）分钟总和 / 60。并额外标记“取消但扣课时”数量。"
        )}
      </div>
      {offlineWarnings.length > 0 ? (
        <div
          style={{
            marginBottom: 12,
            border: "1px solid #f59e0b",
            background: "#fffbeb",
            borderRadius: 8,
            padding: "10px 12px",
          }}
        >
          <div style={{ fontWeight: 700, color: "#92400e", marginBottom: 8 }}>
            {t(lang, "Settlement Warnings", "结算预警")} ({offlineWarnings.length})
          </div>
          <div style={{ color: "#92400e", fontSize: 13, marginBottom: 8 }}>
            {t(
              lang,
              "Monthly attendance count differs from settlement count for these pending students. Please verify feedback/status before billing.",
              "以下待结算学生存在“月内点名数”与“可结算数”不一致，请先核对反馈与状态后再生成账单。"
            )}
          </div>
          <div style={{ overflowX: "auto" }}>
          <table cellPadding={6} style={{ borderCollapse: "collapse", width: "100%", minWidth: 920 }}>
            <thead>
              <tr style={{ background: "#fef3c7" }}>
                <th align="left">{t(lang, "Student", "学生")}</th>
                <th align="left">{t(lang, "Attendance Total", "点名总数")}</th>
                <th align="left">{t(lang, "Settlement Eligible", "可结算数")}</th>
                <th align="left">{t(lang, "Gap", "差额")}</th>
                <th align="left">{t(lang, "Missing Feedback", "缺反馈")}</th>
                <th align="left">{t(lang, "Status Excluded", "状态不纳入")}</th>
                <th align="left">{t(lang, "Focus", "聚焦")}</th>
              </tr>
            </thead>
            <tbody>
              {offlineWarnings.map((w) => (
                <tr
                  key={w.studentId}
                  id={`partner-warning-${w.studentId}`}
                  style={{
                    borderTop: "1px solid #fde68a",
                    background: focusType === "warning" && focusId === w.studentId ? "#eff6ff" : "#fff",
                    boxShadow: focusType === "warning" && focusId === w.studentId ? "inset 0 0 0 2px rgba(37,99,235,0.28)" : "none",
                  }}
                >
                  <td>
                    <a href={studentAttendanceHref(w.studentId, month)}>{w.studentName}</a>
                  </td>
                  <td>{w.totalAttendances}</td>
                  <td>{w.eligibleAttendances}</td>
                  <td style={{ color: "#b45309", fontWeight: 700 }}>{w.totalAttendances - w.eligibleAttendances}</td>
                  <td>{w.missingFeedbackCount}</td>
                  <td>{w.statusExcludedCount}</td>
                  <td>
                    <a href={buildPageHref({ focusType: "warning", focusId: w.studentId })} style={{ fontWeight: 700 }}>
                      {t(lang, "Focus", "聚焦")}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ) : null}
      {offlinePending.length === 0 ? (
        <div style={{ color: "#999", marginBottom: 12 }}>{t(lang, "No offline pending items.", "暂无线下待结算项。")}</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 18, minWidth: 980 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left" style={thCell}>{t(lang, "Student", "学生")}</th>
              <th align="left" style={thCell}>{t(lang, "Month", "月份")}</th>
              <th align="left" style={thCell}>{t(lang, "Sessions", "课次")}</th>
              <th align="left" style={thCell}>{t(lang, "Cancelled+Charged", "取消但扣课时")}</th>
              <th align="left" style={thCell}>{t(lang, "Hours", "课时")}</th>
              <th align="left" style={thCell}>{t(lang, "Amount", "金额")}</th>
              <th align="left" style={thCell}>{t(lang, "Focus", "聚焦")}</th>
              <th align="left" style={thCell}>{t(lang, "Action", "操作")}</th>
            </tr>
          </thead>
          <tbody>
            {offlinePending.map((r) => (
              <tr
                key={`${r.studentId}-${month}`}
                id={`partner-offline-${r.studentId}`}
                style={{
                  borderTop: "1px solid #eee",
                  background: focusType === "offline" && focusId === r.studentId ? "#eff6ff" : "#fff",
                  boxShadow: focusType === "offline" && focusId === r.studentId ? "inset 0 0 0 2px rgba(37,99,235,0.28)" : "none",
                }}
              >
                <td>
                  <a href={studentAttendanceHref(r.studentId, month)}>{r.studentName}</a>
                </td>
                <td>{month}</td>
                <td>{r.sessions}</td>
                <td style={{ color: r.chargedExcusedSessions > 0 ? "#9a3412" : "#64748b", fontWeight: 700 }}>{r.chargedExcusedSessions}</td>
                <td>{r.hours}</td>
                <td>{calcAmountByRatePer45(r.totalMinutes, rates.offlineRatePer45)}</td>
                <td>
                  <a href={buildPageHref({ focusType: "offline", focusId: r.studentId })} style={{ fontWeight: 700 }}>
                    {t(lang, "Focus", "聚焦")}
                  </a>
                </td>
                <td>
                  {!isFinanceOnlyUser ? (
                    <form action={createOfflineSettlementAction}>
                      <input type="hidden" name="studentId" value={r.studentId} />
                      <input type="hidden" name="month" value={month} />
                      <button type="submit" style={primaryBtn}>{t(lang, "Create Bill", "生成账单")}</button>
                    </form>
                  ) : (
                    <span style={{ color: "#999" }}>{t(lang, "Read only", "只读")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      </div>

      <details id="billing-history" open={openPanel === "history"} style={{ ...cardStyle, background: "#fafafa" }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>
          {t(lang, "Billing history", "开票历史")}
        </summary>
        <div style={{ ...sectionHintStyle, marginTop: 10 }}>
          {t(
            lang,
            "Use this section to review previously invoiced records. It is separated from the live work queue to reduce clutter.",
            "这里用于查看已开票历史，和当前待处理队列分开显示，避免主工作区过于拥挤。"
          )}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <a href={buildPageHref({ history: "all" })} style={{ fontWeight: historyFilter === "all" ? 800 : 600 }}>
            {t(lang, "All history", "全部历史")}
          </a>
          <a href={buildPageHref({ history: "receipt-pending" })} style={{ fontWeight: historyFilter === "receipt-pending" ? 800 : 600 }}>
            {t(lang, "Invoice only", "仅已开票")}
          </a>
          <a href={buildPageHref({ history: "receipt-created" })} style={{ fontWeight: historyFilter === "receipt-created" ? 800 : 600 }}>
            {t(lang, "Receipt created", "仅已开收据")}
          </a>
        </div>
        {filteredInvoiceStats.length === 0 ? (
          <div style={{ color: "#999" }}>{t(lang, "No invoiced records yet.", "暂无已开票记录。")}</div>
        ) : (
          <>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{t(lang, "Invoiced records (grouped by Invoice No.)", "已开票记录（按Invoice聚合）")}</div>
            <div style={{ overflowX: "auto" }}>
              <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", minWidth: 1200 }}>
                <thead>
                  <tr style={{ background: "#f5f5f5" }}>
                    <th align="left">{t(lang, "Created", "创建时间")}</th>
                    <th align="left">Invoice No.</th>
                    <th align="left">{t(lang, "Mode", "模式")}</th>
                    <th align="left">{t(lang, "Month", "月份")}</th>
                    <th align="left">{t(lang, "Students", "学生列表")}</th>
                    <th align="left">{t(lang, "Settlement Items", "结算项")}</th>
                    <th align="left">{t(lang, "Invoice Lines", "Invoice条目")}</th>
                    <th align="left">{t(lang, "Hours", "课时")}</th>
                    <th align="left">{t(lang, "Amount", "金额")}</th>
                    <th align="left">{t(lang, "Status", "状态")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoiceStats.map((r) => (
                    <tr key={r.invoiceId} style={{ borderTop: "1px solid #eee" }}>
                      <td>{formatBusinessDateTime(new Date(r.createdAt))}</td>
                      <td>
                        <a
                          href={`/admin/reports/partner-settlement/billing?mode=${encodeURIComponent(r.mode)}&month=${encodeURIComponent(r.monthKey ?? month)}`}
                        >
                          {r.invoiceNo}
                        </a>
                      </td>
                      <td>{r.mode === "ONLINE_PACKAGE_END" ? t(lang, "Online", "线上") : t(lang, "Offline Monthly", "线下按月")}</td>
                      <td>{r.monthKey ?? "-"}</td>
                      <td style={{ maxWidth: 360 }}>{r.studentNames.length > 0 ? r.studentNames.join(", ") : "-"}</td>
                      <td>{r.settlementCount}</td>
                      <td>{r.itemCount}</td>
                      <td>{r.totalHours}</td>
                      <td>{r.totalAmount}</td>
                      <td><span style={r.receiptNo ? donePill : pendingPill}>{r.receiptNo ? t(lang, "Receipt Created", "已创建收据") : t(lang, "Invoiced", "已开Invoice")}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </details>

      <details id="settlement-setup" open={openPanel === "setup"} style={cardStyle}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>
          {t(lang, "Settlement setup", "结算配置")}
        </summary>
        <div style={{ ...sectionHintStyle, marginTop: 10 }}>
          {t(
            lang,
            "These settings affect how future settlement records are created. They are kept collapsed to keep daily work focused.",
            "这些配置会影响后续结算记录的生成。默认折叠，避免干扰日常操作。"
          )}
        </div>
        {!isFinanceOnlyUser ? <div style={{ marginBottom: 14 }}>
          <h3 style={sectionTitleStyle}>{t(lang, "Rate Settings", "费率设置")}</h3>
          <form action={updateRateSettingsAction} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
            <input type="hidden" name="month" value={month} />
            <label>
              {t(lang, "Online rate per 45min", "线上每45分钟单价")}:
              <input name="onlineRatePer45" type="number" min={0} step={0.01} defaultValue={rates.onlineRatePer45} style={{ marginLeft: 6, width: 110 }} />
            </label>
            <label>
              {t(lang, "Offline rate per 45min", "线下每45分钟单价")}:
              <input name="offlineRatePer45" type="number" min={0} step={0.01} defaultValue={rates.offlineRatePer45} style={{ marginLeft: 6, width: 110 }} />
            </label>
            <button type="submit" style={primaryBtn}>{t(lang, "Save Rates", "保存费率")}</button>
          </form>
          <div style={{ marginTop: -8, marginBottom: 16, color: "#666", fontSize: 13 }}>
            {t(
              lang,
              "Bill amount formula: amount = (minutes / 45) x rate.",
              "账单金额公式：金额 = （总分钟 / 45）x 单价。"
            )}
          </div>
        </div> : null}

        <div>
          <h3 style={sectionTitleStyle}>{t(lang, "Package Mode Config", "课包结算模式配置")}</h3>
          <div style={{ overflowX: "auto" }}>
            <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 18, minWidth: 980 }}>
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  <th align="left" style={thCell}>{t(lang, "Student", "学生")}</th>
                  <th align="left" style={thCell}>{t(lang, "Course", "课程")}</th>
                  <th align="left" style={thCell}>{t(lang, "Type", "类型")}</th>
                  <th align="left" style={thCell}>{t(lang, "Remaining", "剩余")}</th>
                  <th align="left" style={thCell}>{t(lang, "Status", "状态")}</th>
                  <th align="left" style={thCell}>{t(lang, "Mode", "模式")}</th>
                </tr>
              </thead>
              <tbody>
                {modePackages.map((p) => (
                  <tr key={p.id} style={{ borderTop: "1px solid #eee" }}>
                    <td>{p.student?.name ?? "-"}</td>
                    <td>{p.course?.name ?? "-"}</td>
                    <td>{p.type}</td>
                    <td>{p.remainingMinutes ?? "-"}</td>
                    <td>{p.status}</td>
                    <td>{modeLabel(p.settlementMode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </div>
  );
}
