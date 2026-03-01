import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { listPartnerBilling } from "@/lib/partner-billing";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const BIZ_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
const PARTNER_SOURCE_NAME = "\u65b0\u4e1c\u65b9\u5b66\u751f";
const ONLINE_RATE_KEY = "partner_settlement_online_rate_per_45";
const OFFLINE_RATE_KEY = "partner_settlement_offline_rate_per_45";
const DEFAULT_ONLINE_RATE_PER_45 = 70;
const DEFAULT_OFFLINE_RATE_PER_45 = 90;
const ATTENDED_STATUSES = ["PRESENT", "LATE"] as const;

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
  redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&msg=rate-updated`);
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
        settlements: { where: { mode: "ONLINE_PACKAGE_END" } },
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
  if (pkg.settlements.length > 0) {
    redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&msg=already-settled`);
  }

  const rates = await getSettlementRates();
  const totalMinutes = Number(pkg.totalMinutes ?? 0);

  try {
    await prisma.partnerSettlement.create({
      data: {
        studentId: pkg.studentId,
        packageId: pkg.id,
        mode: "ONLINE_PACKAGE_END",
        status: "PENDING",
        hours: Number(toHours(totalMinutes).toFixed(2)),
        amount: calcAmountByRatePer45(totalMinutes, rates.onlineRatePer45),
        note: `Online package completed: ${pkg.courseId}`,
      },
    });
  } catch (err) {
    if (isSchemaNotReadyError(err)) {
      redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&err=schema-not-ready`);
    }
    throw err;
  }

  revalidatePath("/admin/reports/partner-settlement");
  redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&msg=online-created`);
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

  try {
    await prisma.partnerSettlement.create({
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
  redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&msg=offline-created`);
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
  redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&msg=settlements-cleared`);
}

export default async function PartnerSettlementPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; msg?: string; err?: string }>;
}) {
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const lang = await getLang();
  const sp = await searchParams;
  const month = sp?.month ?? monthKey(new Date());
  const msg = sp?.msg ?? "";
  const err = sp?.err ?? "";
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
    totalMinutes: number | null;
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
        settlements: { where: { mode: "ONLINE_PACKAGE_END" }, select: { id: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });
    onlinePending = onlinePackages.filter((p) => p.settlements.length === 0);

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

  return (
    <div>
      <h2>{t(lang, "Partner Settlement", "合作方结算中心")}</h2>
      <div style={{ marginBottom: 10, color: "#666" }}>
        {t(
          lang,
          `Only students with source channel = ${PARTNER_SOURCE_NAME} are included.`,
          `仅纳入来源为${PARTNER_SOURCE_NAME}的学生。`
        )}
      </div>
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

      {msg ? <div style={{ marginBottom: 8, color: "#166534" }}>{msg}</div> : null}
      {err ? <div style={{ marginBottom: 8, color: "#b00" }}>{err}</div> : null}
      {err === "forbidden" ? <div style={{ marginBottom: 8, color: "#b00" }}>{t(lang, "Finance role cannot modify this data.", "财务角色不能修改此类数据。")}</div> : null}
      {err === "manager-reject-reason" ? <div style={{ marginBottom: 8, color: "#b00" }}>{t(lang, "Please enter manager reject reason.", "请填写管理驳回原因。")}</div> : null}
      {err === "finance-reject-reason" ? <div style={{ marginBottom: 8, color: "#b00" }}>{t(lang, "Please enter reject reason.", "请填写驳回原因。")}</div> : null}
      {err === "manager-approval-required" ? <div style={{ marginBottom: 8, color: "#b00" }}>{t(lang, "All manager approvals are required before finance approval.", "财务审批前必须先完成全部管理审批。")}</div> : null}
      {err === "settlement-locked" ? <div style={{ marginBottom: 8, color: "#b00" }}>{t(lang, "Settlement already exported and locked.", "该结算单已导出并锁定。")}</div> : null}

      <form method="GET" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <label>
          {t(lang, "Month", "月份")}: <input type="month" name="month" defaultValue={month} style={{ marginLeft: 6 }} />
        </label>
        <button type="submit">{t(lang, "Apply", "应用")}</button>
      </form>
      <div style={{ marginBottom: 14 }}>
        <a href={`/admin/reports/partner-settlement/billing?mode=ONLINE_PACKAGE_END&month=${encodeURIComponent(month)}`}>
          {t(lang, "Open Partner Invoice & Receipt Center", "打开合作方Invoice/Receipt中心")}
        </a>
      </div>

      {!isFinanceOnlyUser ? <h3>{t(lang, "Rate Settings", "费率设置")}</h3> : null}
      {!isFinanceOnlyUser ? <form action={updateRateSettingsAction} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <input type="hidden" name="month" value={month} />
        <label>
          {t(lang, "Online rate per 45min", "线上每45分钟单价")}:
          <input name="onlineRatePer45" type="number" min={0} step={0.01} defaultValue={rates.onlineRatePer45} style={{ marginLeft: 6, width: 110 }} />
        </label>
        <label>
          {t(lang, "Offline rate per 45min", "线下每45分钟单价")}:
          <input name="offlineRatePer45" type="number" min={0} step={0.01} defaultValue={rates.offlineRatePer45} style={{ marginLeft: 6, width: 110 }} />
        </label>
        <button type="submit">{t(lang, "Save Rates", "保存费率")}</button>
      </form> : null}
      {!isFinanceOnlyUser ? <div style={{ marginTop: -8, marginBottom: 16, color: "#666", fontSize: 13 }}>
        {t(
          lang,
          "Bill amount formula: amount = (minutes / 45) x rate.",
          "账单金额公式：金额 = （总分钟 / 45）x 单价。"
        )}
      </div> : null}

      <h3>{t(lang, "Package Mode Config", "课包结算模式配置")}</h3>
      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 18 }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th align="left">{t(lang, "Student", "学生")}</th>
            <th align="left">{t(lang, "Course", "课程")}</th>
            <th align="left">{t(lang, "Type", "类型")}</th>
            <th align="left">{t(lang, "Remaining", "剩余")}</th>
            <th align="left">{t(lang, "Status", "状态")}</th>
            <th align="left">{t(lang, "Mode", "模式")}</th>
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

      <h3>{t(lang, "Online Pending (Package Completed)", "线上待结算（课包完结）")}</h3>
      {onlinePending.length === 0 ? (
        <div style={{ color: "#999", marginBottom: 12 }}>{t(lang, "No online pending items.", "暂无线上待结算项。")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 18 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Student", "学生")}</th>
              <th align="left">{t(lang, "Course", "课程")}</th>
              <th align="left">{t(lang, "Package Status", "课包状态")}</th>
              <th align="left">{t(lang, "Hours", "课时")}</th>
              <th align="left">{t(lang, "Amount", "金额")}</th>
              <th align="left">{t(lang, "Action", "操作")}</th>
            </tr>
          </thead>
          <tbody>
            {onlinePending.map((p) => (
              <tr key={p.id} style={{ borderTop: "1px solid #eee" }}>
                <td>
                  {p.student ? <a href={studentAttendanceHref(p.student.id, month)}>{p.student.name}</a> : "-"}
                </td>
                <td>{p.course?.name ?? "-"}</td>
                <td>{p.status}</td>
                <td>{toHours(p.totalMinutes ?? 0)}</td>
                <td>{calcAmountByRatePer45(Number(p.totalMinutes ?? 0), rates.onlineRatePer45)}</td>
                <td>
                  {!isFinanceOnlyUser ? (
                    <form action={createOnlineSettlementAction}>
                      <input type="hidden" name="month" value={month} />
                      <input type="hidden" name="packageId" value={p.id} />
                      <button type="submit">{t(lang, "Create Bill", "生成账单")}</button>
                    </form>
                  ) : (
                    <span style={{ color: "#999" }}>{t(lang, "Read only", "只读")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>{t(lang, "Offline Pending (Monthly)", "线下待结算（按月）")}</h3>
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
          <table cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ background: "#fef3c7" }}>
                <th align="left">{t(lang, "Student", "学生")}</th>
                <th align="left">{t(lang, "Attendance Total", "点名总数")}</th>
                <th align="left">{t(lang, "Settlement Eligible", "可结算数")}</th>
                <th align="left">{t(lang, "Gap", "差额")}</th>
                <th align="left">{t(lang, "Missing Feedback", "缺反馈")}</th>
                <th align="left">{t(lang, "Status Excluded", "状态不纳入")}</th>
              </tr>
            </thead>
            <tbody>
              {offlineWarnings.map((w) => (
                <tr key={w.studentId} style={{ borderTop: "1px solid #fde68a" }}>
                  <td>
                    <a href={studentAttendanceHref(w.studentId, month)}>{w.studentName}</a>
                  </td>
                  <td>{w.totalAttendances}</td>
                  <td>{w.eligibleAttendances}</td>
                  <td style={{ color: "#b45309", fontWeight: 700 }}>{w.totalAttendances - w.eligibleAttendances}</td>
                  <td>{w.missingFeedbackCount}</td>
                  <td>{w.statusExcludedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {offlinePending.length === 0 ? (
        <div style={{ color: "#999", marginBottom: 12 }}>{t(lang, "No offline pending items.", "暂无线下待结算项。")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 18 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Student", "学生")}</th>
              <th align="left">{t(lang, "Month", "月份")}</th>
              <th align="left">{t(lang, "Sessions", "课次")}</th>
              <th align="left">{t(lang, "Cancelled+Charged", "取消但扣课时")}</th>
              <th align="left">{t(lang, "Hours", "课时")}</th>
              <th align="left">{t(lang, "Amount", "金额")}</th>
              <th align="left">{t(lang, "Action", "操作")}</th>
            </tr>
          </thead>
          <tbody>
            {offlinePending.map((r) => (
              <tr key={`${r.studentId}-${month}`} style={{ borderTop: "1px solid #eee" }}>
                <td>
                  <a href={studentAttendanceHref(r.studentId, month)}>{r.studentName}</a>
                </td>
                <td>{month}</td>
                <td>{r.sessions}</td>
                <td style={{ color: r.chargedExcusedSessions > 0 ? "#9a3412" : "#64748b", fontWeight: 700 }}>{r.chargedExcusedSessions}</td>
                <td>{r.hours}</td>
                <td>{calcAmountByRatePer45(r.totalMinutes, rates.offlineRatePer45)}</td>
                <td>
                  {!isFinanceOnlyUser ? (
                    <form action={createOfflineSettlementAction}>
                      <input type="hidden" name="studentId" value={r.studentId} />
                      <input type="hidden" name="month" value={month} />
                      <button type="submit">{t(lang, "Create Bill", "生成账单")}</button>
                    </form>
                  ) : (
                    <span style={{ color: "#999" }}>{t(lang, "Read only", "只读")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>{t(lang, "Recent Settlement Records", "最近结算记录")}</h3>
      {!isFinanceOnlyUser ? <form action={clearSettlementRecordsAction} style={{ marginBottom: 8 }}>
        <input type="hidden" name="month" value={month} />
        <button type="submit" style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#9f1239" }}>
          {t(lang, "Clear Test Records", "清空测试结算记录")}
        </button>
      </form> : null}
      {recentInvoiceStats.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No settlement records yet.", "暂无结算记录。")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
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
            {recentInvoiceStats.map((r) => (
              <tr key={r.invoiceId} style={{ borderTop: "1px solid #eee" }}>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>
                  <a
                    href={`/admin/reports/partner-settlement/billing?mode=${encodeURIComponent(r.mode)}&month=${encodeURIComponent(r.monthKey ?? month)}`}
                  >
                    {r.invoiceNo}
                  </a>
                </td>
                <td>{r.mode === "ONLINE_PACKAGE_END" ? t(lang, "Online", "线上") : t(lang, "Offline Monthly", "线下按月")}</td>
                <td>{r.monthKey ?? "-"}</td>
                <td style={{ maxWidth: 360 }}>
                  {r.studentNames.length > 0 ? r.studentNames.join(", ") : "-"}
                </td>
                <td>{r.settlementCount}</td>
                <td>{r.itemCount}</td>
                <td>{r.totalHours}</td>
                <td>{r.totalAmount}</td>
                <td>{r.receiptNo ? t(lang, "Receipt Created", "已创建收据") : t(lang, "Invoiced", "已开Invoice")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}



