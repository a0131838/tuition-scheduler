import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import PackageEditModal from "../_components/PackageEditModal";
import SimpleModal from "../_components/SimpleModal";
import NoticeBanner from "../_components/NoticeBanner";
import PackageCreateFormClient from "./PackageCreateFormClient";
import { Prisma } from "@prisma/client";
import {
  packageModeFromNote,
  stripGroupPackTag,
} from "@/lib/package-mode";

const LOW_MINUTES = 120;
const LOW_COUNTS = 3;
const FORECAST_WINDOW_DAYS = 30;
const LOW_DAYS = 7;

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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function isSchemaNotReadyError(err: unknown) {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  return err.code === "P2021" || err.code === "P2022";
}

export default async function AdminPackagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ msg?: string; err?: string; q?: string; courseId?: string; paid?: string; warn?: string }>;
}) {
  const lang = await getLang();
  const sp = await searchParams;
  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const q = (sp?.q ?? "").trim();
  const filterCourseId = sp?.courseId ?? "";
  const filterPaid = sp?.paid ?? "";
  const filterWarn = sp?.warn ?? "";

  const wherePackages: any = {};
  if (q) wherePackages.student = { name: { contains: q, mode: "insensitive" } };
  if (filterCourseId) wherePackages.courseId = filterCourseId;
  if (filterPaid === "paid") wherePackages.paid = true;
  if (filterPaid === "unpaid") wherePackages.paid = false;

  let schemaNotReady = false;
  let loadFailed = false;
  let students: Array<{ id: string; name: string }> = [];
  let courses: Array<{ id: string; name: string }> = [];
  let packages: any[] = [];

  try {
    [students, courses] = await Promise.all([
      prisma.student.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
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
        const isGroupPack = p.type === "HOURS" && packageModeFromNote(p.note) === "GROUP_COUNT";
        const lowBalanceThreshold = isGroupPack ? LOW_COUNTS : LOW_MINUTES;
        const estDays =
          p.type === "HOURS" && p.status === "ACTIVE" && remaining > 0 && avgPerDay > 0
            ? Math.ceil(remaining / avgPerDay)
            : null;
        const lowMinutes = p.type === "HOURS" && p.status === "ACTIVE" && remaining <= lowBalanceThreshold;
        const lowDays = p.type === "HOURS" && p.status === "ACTIVE" && estDays != null && estDays <= LOW_DAYS;
        const isAlert = p.type === "HOURS" && p.status === "ACTIVE" && (remaining <= 0 || lowMinutes || lowDays);
        return [p.id, { deducted30, estDays, lowMinutes, lowDays, isAlert, isGroupPack }] as const;
      })
    );

    filteredPackages = filterWarn === "alert" ? packages.filter((p) => packageRiskMap.get(p.id)?.isAlert) : packages;
  } catch (error) {
    loadFailed = true;
    console.error("[admin/packages] failed to load usage summary", error);
  }

  const today = new Date();
  const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div>
      <h2>{t(lang, "Packages", "课时包")}</h2>

      {err ? <NoticeBanner type="error" title={t(lang, "Error", "错误")} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "OK", "成功")} message={msg} /> : null}
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

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <SimpleModal buttonLabel={t(lang, "Create Package", "创建课包")} title={t(lang, "Create Package", "创建课包")} closeOnSubmit>
            <PackageCreateFormClient
              defaultYmd={ymd}
              students={students.map((s) => ({ id: s.id, name: s.name }))}
              courses={courses.map((c) => ({ id: c.id, name: c.name }))}
              labels={{
                student: t(lang, "Student", "学生"),
                studentPlaceholder: t(lang, "Search student name", "搜索学生姓名"),
                course: t(lang, "Course", "课程"),
                type: t(lang, "Type", "类型"),
                typeHours: t(lang, "HOURS (minutes)", "课时包(按分钟)"),
                typeGroup: t(lang, "GROUP (per class)", "班课包(按次)"),
                typeMonthly: t(lang, "MONTHLY (valid period)", "月卡(按有效期)"),
                totalMinutesOrCount: t(lang, "totalMinutes / count (HOURS/GROUP)", "总分钟数/次数(课时包/班课包)"),
                totalMinutesHint: t(
                  lang,
                  "HOURS: minutes (e.g. 600=10h). GROUP: class count (e.g. 20=20 classes).",
                  "课时包按分钟（例如600=10小时）；班课包按次数（例如20=20次）。"
                ),
                validFrom: t(lang, "validFrom", "生效日期"),
                validToOptional: t(lang, "validTo (optional)", "失效日期(可选)"),
                status: t(lang, "Status", "状态"),
                paid: t(lang, "Paid", "已付款"),
                paidAt: t(lang, "Paid At", "付款时间"),
                paidAmount: t(lang, "Paid Amount", "付款金额"),
                paidNote: t(lang, "Paid Note", "付款备注"),
                sharedStudents: t(lang, "Shared Students", "共享学生"),
                note: t(lang, "Note", "备注"),
                create: t(lang, "Create", "创建"),
                confirmCreate: t(lang, "Create this package?", "确认创建课包？"),
                errorPrefix: t(lang, "Error", "错误"),
              }}
            />
        </SimpleModal>
      </div>

      <h3>{t(lang, "Packages List", "课包列表")}</h3>
      <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, background: "#fafafa", marginBottom: 12 }}>
        <form method="GET" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
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
          <button type="submit">{t(lang, "Apply", "应用")}</button>
          <a href="/admin/packages" style={{ padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6 }}>
            {t(lang, "Clear", "清除")}
          </a>
          <span style={{ color: "#666" }}>
            {t(lang, "Showing", "显示")} {filteredPackages.length}
          </span>
        </form>
      </div>

      {filteredPackages.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No packages yet.", "暂无课包")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Student", "学生")}</th>
              <th align="left">{t(lang, "Student Source", "学生来源")}</th>
              <th align="left">{t(lang, "Course", "课程")}</th>
              <th align="left">{t(lang, "Type", "类型")}</th>
              <th align="left">{t(lang, "Remaining", "剩余")}</th>
              <th align="left">{t(lang, "Usage 30d", "近30天消耗")}</th>
              <th align="left">{t(lang, "Forecast", "预计用完")}</th>
              <th align="left">{t(lang, "Alert", "预警")}</th>
              <th align="left">{t(lang, "Valid", "有效期")}</th>
              <th align="left">{t(lang, "Status", "状态")}</th>
              <th align="left">{t(lang, "Paid", "已付款")}</th>
              <th align="left">{t(lang, "Paid At", "付款时间")}</th>
              <th align="left">{t(lang, "Amount", "金额")}</th>
              <th align="left">{t(lang, "Paid Note", "付款备注")}</th>
              <th align="left">{t(lang, "Shared Students", "共享学生")}</th>
              <th align="left">{t(lang, "Note", "备注")}</th>
              <th align="left">{t(lang, "Created", "创建时间")}</th>
              <th align="left">{t(lang, "Action", "操作")}</th>
              <th align="left">{t(lang, "Billing", "账单")}</th>
              <th align="left">{t(lang, "Ledger", "对账单")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredPackages.map((p) => (
              <tr key={p.id} style={{ borderTop: "1px solid #eee" }}>
                {(() => {
                  const remaining = p.remainingMinutes ?? 0;
                  const risk = packageRiskMap.get(p.id);
                  const deducted30 = risk?.deducted30 ?? 0;
                  const estDays = risk?.estDays ?? null;
                  const lowMinutes = risk?.lowMinutes ?? false;
                  const lowDays = risk?.lowDays ?? false;
                  return (
                    <>
                <td>{p.student?.name ?? "-"}</td>
                <td>{p.student?.sourceChannel?.name ?? "-"}</td>
                <td>{p.course?.name ?? "-"}</td>
                <td>
                  {p.type === "HOURS"
                    ? packageModeFromNote(p.note) === "GROUP_COUNT"
                      ? t(lang, "GROUP", "班课包")
                      : "HOURS"
                    : p.type}
                </td>
                <td>
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
                <td>
                  {p.type === "HOURS"
                    ? packageModeFromNote(p.note) === "GROUP_COUNT"
                      ? `${deducted30} cls / ${FORECAST_WINDOW_DAYS}d`
                      : `${fmtMinutes(deducted30)} / ${FORECAST_WINDOW_DAYS}d`
                    : "-"}
                </td>
                <td>
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
                <td>
                  {p.type !== "HOURS" || p.status !== "ACTIVE" ? (
                    "-"
                  ) : remaining <= 0 ? (
                    <span style={{ color: "#b00", fontWeight: 700 }}>{t(lang, "Urgent", "紧急")}</span>
                  ) : lowMinutes || lowDays ? (
                    <span style={{ color: "#b00", fontWeight: 700 }}>
                      {lowMinutes && lowDays
                        ? `${t(lang, "Low balance", "余额低")} + ${t(lang, "Likely to run out soon", "即将用完")}`
                        : lowMinutes
                        ? t(lang, "Low balance", "余额低")
                        : t(lang, "Likely to run out soon", "即将用完")}
                    </span>
                  ) : (
                    <span style={{ color: "#0a7" }}>{t(lang, "Normal", "正常")}</span>
                  )}
                </td>
                <td>
                  {new Date(p.validFrom).toLocaleDateString()} ~ {p.validTo ? new Date(p.validTo).toLocaleDateString() : "(open)"}
                </td>
                <td>{p.status}</td>
                <td>{p.paid ? t(lang, "Yes", "是") : t(lang, "No", "否")}</td>
                <td>{p.paidAt ? new Date(p.paidAt).toLocaleString() : "-"}</td>
                <td>{p.paidAmount ?? "-"}</td>
                <td>{p.paidNote ?? "-"}</td>
                <td>{p.sharedStudents.map((x: any) => x.student.name).join(", ") || "-"}</td>
                <td>{stripGroupPackTag(p.note) || "-"}</td>
                <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                <td>
                  <PackageEditModal
                    pkg={p}
                    students={students.map((s) => ({ id: s.id, name: s.name }))}
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
                </td>
                <td>
                  <a href={`/admin/packages/${p.id}/billing`}>{t(lang, "Billing", "账单")}</a>
                </td>
                <td>
                  <a href={`/admin/packages/${p.id}/ledger`}>{t(lang, "Ledger", "对账单")}</a>
                </td>
                    </>
                  );
                })()}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
