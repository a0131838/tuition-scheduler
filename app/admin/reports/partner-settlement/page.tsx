import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const BIZ_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

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

function parseMode(v: FormDataEntryValue | null) {
  const x = typeof v === "string" ? v : "";
  if (x === "ONLINE_PACKAGE_END" || x === "OFFLINE_MONTHLY") return x;
  return "";
}

function isSchemaNotReadyError(err: unknown) {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  return err.code === "P2021" || err.code === "P2022";
}

async function updateStudentModeAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const studentId = typeof formData.get("studentId") === "string" ? String(formData.get("studentId")) : "";
  const mode = parseMode(formData.get("mode"));
  const month = typeof formData.get("month") === "string" ? String(formData.get("month")) : monthKey(new Date());

  if (!studentId) {
    redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&err=invalid-student`);
  }

  try {
    await prisma.student.update({
      where: { id: studentId },
      data: {
        settlementMode: mode ? mode : null,
      },
    });
  } catch (err) {
    if (isSchemaNotReadyError(err)) {
      redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&err=schema-not-ready`);
    }
    throw err;
  }

  revalidatePath("/admin/reports/partner-settlement");
  redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&msg=mode-updated`);
}

async function createOnlineSettlementAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const packageId = typeof formData.get("packageId") === "string" ? String(formData.get("packageId")) : "";
  const month = typeof formData.get("month") === "string" ? String(formData.get("month")) : monthKey(new Date());
  if (!packageId) {
    redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&err=invalid-package`);
  }

  let pkg: Awaited<ReturnType<typeof prisma.coursePackage.findUnique>>;
  try {
    pkg = await prisma.coursePackage.findUnique({
      where: { id: packageId },
      include: {
        student: { include: { sourceChannel: true } },
        settlements: { where: { mode: "ONLINE_PACKAGE_END" } },
      },
    });
  } catch (err) {
    if (isSchemaNotReadyError(err)) {
      redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&err=schema-not-ready`);
    }
    throw err;
  }

  if (!pkg || pkg.student?.sourceChannel?.name !== "新东方学生") {
    redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&err=package-not-eligible`);
  }

  if (pkg.settlements.length > 0) {
    redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&msg=already-settled`);
  }

  try {
    await prisma.partnerSettlement.create({
      data: {
        studentId: pkg.studentId,
        packageId: pkg.id,
        mode: "ONLINE_PACKAGE_END",
        status: "PENDING",
        hours: Number(toHours(pkg.totalMinutes ?? 0).toFixed(2)),
        amount: pkg.paidAmount ?? 0,
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
  await requireAdmin();
  const studentId = typeof formData.get("studentId") === "string" ? String(formData.get("studentId")) : "";
  const month = typeof formData.get("month") === "string" ? String(formData.get("month")) : monthKey(new Date());
  const range = toBizMonthRange(month);

  if (!studentId || !range) {
    redirect(`/admin/reports/partner-settlement?month=${encodeURIComponent(month)}&err=invalid-offline-input`);
  }

  let existed: Awaited<ReturnType<typeof prisma.partnerSettlement.findFirst>>;
  try {
    existed = await prisma.partnerSettlement.findFirst({
      where: {
        studentId,
        monthKey: month,
        mode: "OFFLINE_MONTHLY",
      },
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
      status: { not: "UNMARKED" },
      session: {
        startAt: { gte: range.start, lt: range.end },
        feedbacks: { some: { content: { not: "" } } },
      },
    },
    include: {
      session: { select: { id: true, startAt: true, endAt: true } },
    },
  });

  let totalMinutes = 0;
  for (const r of rows) {
    const min = Math.max(0, Math.round((r.session.endAt.getTime() - r.session.startAt.getTime()) / 60000));
    totalMinutes += min;
  }

  try {
    await prisma.partnerSettlement.create({
      data: {
        studentId,
        monthKey: month,
        mode: "OFFLINE_MONTHLY",
        status: "PENDING",
        hours: Number(toHours(totalMinutes).toFixed(2)),
        amount: 0,
        note: `Offline monthly settlement ${month}`,
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

export default async function PartnerSettlementPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; msg?: string; err?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const month = sp?.month ?? monthKey(new Date());
  const msg = sp?.msg ?? "";
  const err = sp?.err ?? "";

  const monthRange = toBizMonthRange(month);
  if (!monthRange) {
    return (
      <div>
        <h2>{t(lang, "Partner Settlement", "合作方结算中心")}</h2>
        <div style={{ color: "#b00" }}>{t(lang, "Invalid month format. Use YYYY-MM.", "月份格式错误，请使用 YYYY-MM。")}</div>
      </div>
    );
  }

  const source = await prisma.studentSourceChannel.findFirst({
    where: { name: "新东方学生" },
    select: { id: true, name: true },
  });

  if (!source) {
    return (
      <div>
        <h2>{t(lang, "Partner Settlement", "合作方结算中心")}</h2>
        <div style={{ color: "#b00" }}>{t(lang, "Source channel not found: 新东方学生", "未找到学生来源：新东方学生")}</div>
      </div>
    );
  }

  let schemaNotReady = false;
  let partnerStudents: Array<{ id: string; name: string; settlementMode: "ONLINE_PACKAGE_END" | "OFFLINE_MONTHLY" | null }> = [];
  let onlinePending: Array<{
    id: string;
    student: { id: string; name: string } | null;
    course: { name: string } | null;
    status: string;
    totalMinutes: number | null;
    paidAmount: number | null;
  }> = [];
  let offlinePending: Array<{ studentId: string; studentName: string; sessions: number; hours: number }> = [];
  let recentSettlements: Array<{
    id: string;
    createdAt: Date;
    student: { name: string } | null;
    mode: string;
    monthKey: string | null;
    package: { course: { name: string } | null } | null;
    hours: Prisma.Decimal;
    amount: number;
    status: string;
  }> = [];

  try {
    partnerStudents = await prisma.student.findMany({
      where: { sourceChannelId: source.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        settlementMode: true,
      },
    });

    const onlinePackages = await prisma.coursePackage.findMany({
      where: {
        student: {
          sourceChannelId: source.id,
          settlementMode: "ONLINE_PACKAGE_END",
        },
        OR: [{ status: "EXPIRED" }, { remainingMinutes: { lte: 0 } }],
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

    const offlineStudents = partnerStudents.filter((s) => s.settlementMode === "OFFLINE_MONTHLY");
    const offlineIds = offlineStudents.map((s) => s.id);

    const [offlineAttendanceRows, offlineSettledRows] = await Promise.all([
      offlineIds.length
        ? prisma.attendance.findMany({
            where: {
              studentId: { in: offlineIds },
              status: { not: "UNMARKED" },
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
          })
        : Promise.resolve([]),
      offlineIds.length
        ? prisma.partnerSettlement.findMany({
            where: {
              mode: "OFFLINE_MONTHLY",
              monthKey: month,
              studentId: { in: offlineIds },
            },
            select: { id: true, studentId: true },
          })
        : Promise.resolve([]),
    ]);

    const offlineSettledSet = new Set(offlineSettledRows.map((x) => x.studentId));
    const offlineAgg = new Map<string, { studentName: string; sessions: number; totalMinutes: number }>();
    for (const row of offlineAttendanceRows) {
      const prev = offlineAgg.get(row.studentId);
      const minutes = Math.max(0, Math.round((row.session.endAt.getTime() - row.session.startAt.getTime()) / 60000));
      if (prev) {
        prev.sessions += 1;
        prev.totalMinutes += minutes;
      } else {
        offlineAgg.set(row.studentId, {
          studentName: row.student?.name ?? "-",
          sessions: 1,
          totalMinutes: minutes,
        });
      }
    }

    offlinePending = Array.from(offlineAgg.entries())
      .filter(([studentId]) => !offlineSettledSet.has(studentId))
      .map(([studentId, agg]) => ({
        studentId,
        studentName: agg.studentName,
        sessions: agg.sessions,
        hours: toHours(agg.totalMinutes),
      }))
      .sort((a, b) => a.studentName.localeCompare(b.studentName));

    recentSettlements = await prisma.partnerSettlement.findMany({
      where: {
        student: { sourceChannelId: source.id },
      },
      include: {
        student: { select: { name: true } },
        package: { include: { course: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  } catch (e) {
    if (isSchemaNotReadyError(e)) {
      schemaNotReady = true;
      partnerStudents = await prisma.student.findMany({
        where: { sourceChannelId: source.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }).then((rows) => rows.map((x) => ({ ...x, settlementMode: null })));
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
          "Only students with source channel = 新东方学生 are included.",
          "仅学生来源为“新东方学生”的学生会进入结算。"
        )}
      </div>
      {schemaNotReady || err === "schema-not-ready" ? (
        <div style={{ marginBottom: 10, color: "#92400e", border: "1px solid #f59e0b", background: "#fffbeb", borderRadius: 8, padding: "8px 10px" }}>
          {t(
            lang,
            "Preview database migration is not ready yet. Please run migrations on this environment before using settlement actions.",
            "预览环境数据库迁移尚未完成。请先在该环境执行迁移，再使用结算功能。"
          )}
        </div>
      ) : null}

      {msg ? <div style={{ marginBottom: 8, color: "#166534" }}>{msg}</div> : null}
      {err ? <div style={{ marginBottom: 8, color: "#b00" }}>{err}</div> : null}

      <form method="GET" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <label>
          {t(lang, "Month", "月份")}: <input type="month" name="month" defaultValue={month} style={{ marginLeft: 6 }} />
        </label>
        <button type="submit">{t(lang, "Apply", "应用")}</button>
      </form>

      <h3>{t(lang, "Student Mode Config", "学生结算模式配置")}</h3>
      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 18 }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th align="left">{t(lang, "Student", "学生")}</th>
            <th align="left">{t(lang, "Mode", "模式")}</th>
            <th align="left">{t(lang, "Action", "操作")}</th>
          </tr>
        </thead>
        <tbody>
          {partnerStudents.map((s) => (
            <tr key={s.id} style={{ borderTop: "1px solid #eee" }}>
              <td>{s.name}</td>
              <td>
                <form action={updateStudentModeAction} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="hidden" name="studentId" value={s.id} />
                  <input type="hidden" name="month" value={month} />
                  <select name="mode" defaultValue={s.settlementMode ?? ""}>
                    <option value="">{t(lang, "Not Included", "不纳入")}</option>
                    <option value="ONLINE_PACKAGE_END">{t(lang, "Online: Package End", "线上：课包完结")}</option>
                    <option value="OFFLINE_MONTHLY">{t(lang, "Offline: Monthly", "线下：按月")}</option>
                  </select>
                  <button type="submit">{t(lang, "Save", "保存")}</button>
                </form>
              </td>
              <td />
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
                <td>{p.student?.name ?? "-"}</td>
                <td>{p.course?.name ?? "-"}</td>
                <td>{p.status}</td>
                <td>{toHours(p.totalMinutes ?? 0)}</td>
                <td>{p.paidAmount ?? 0}</td>
                <td>
                  <form action={createOnlineSettlementAction}>
                    <input type="hidden" name="month" value={month} />
                    <input type="hidden" name="packageId" value={p.id} />
                    <button type="submit">{t(lang, "Create Bill", "生成账单")}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>{t(lang, "Offline Pending (Monthly)", "线下待结算（按月）")}</h3>
      {offlinePending.length === 0 ? (
        <div style={{ color: "#999", marginBottom: 12 }}>{t(lang, "No offline pending items.", "暂无线下待结算项。")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 18 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Student", "学生")}</th>
              <th align="left">{t(lang, "Month", "月份")}</th>
              <th align="left">{t(lang, "Sessions", "课次数")}</th>
              <th align="left">{t(lang, "Hours", "课时")}</th>
              <th align="left">{t(lang, "Action", "操作")}</th>
            </tr>
          </thead>
          <tbody>
            {offlinePending.map((r) => (
              <tr key={`${r.studentId}-${month}`} style={{ borderTop: "1px solid #eee" }}>
                <td>{r.studentName}</td>
                <td>{month}</td>
                <td>{r.sessions}</td>
                <td>{r.hours}</td>
                <td>
                  <form action={createOfflineSettlementAction}>
                    <input type="hidden" name="studentId" value={r.studentId} />
                    <input type="hidden" name="month" value={month} />
                    <button type="submit">{t(lang, "Create Bill", "生成账单")}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>{t(lang, "Recent Settlement Records", "最近结算记录")}</h3>
      {recentSettlements.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No settlement records yet.", "暂无结算记录。")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
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
            </tr>
          </thead>
          <tbody>
            {recentSettlements.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>{r.student?.name ?? "-"}</td>
                <td>{r.mode}</td>
                <td>{r.monthKey ?? "-"}</td>
                <td>{r.package?.course?.name ?? "-"}</td>
                <td>{String(r.hours)}</td>
                <td>{r.amount}</td>
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
