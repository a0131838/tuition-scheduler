import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getLang, t } from "@/lib/i18n";
import PackageEditModal from "../_components/PackageEditModal";
import ConfirmSubmitButton from "../_components/ConfirmSubmitButton";
import StudentSearchSelect from "../_components/StudentSearchSelect";
import SimpleModal from "../_components/SimpleModal";
import NoticeBanner from "../_components/NoticeBanner";
import {
  GROUP_PACK_TAG,
  composePackageNote,
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

type PackageModeKey = "HOURS_MINUTES" | "GROUP_COUNT" | "MONTHLY";

function modeKeyFromCreateType(typeRaw: string, type: string): PackageModeKey {
  if (type === "MONTHLY") return "MONTHLY";
  return typeRaw === "GROUP_COUNT" ? "GROUP_COUNT" : "HOURS_MINUTES";
}

function modeKeyFromSaved(type: string, note: string | null): PackageModeKey {
  if (type === "MONTHLY") return "MONTHLY";
  return packageModeFromNote(note) === "GROUP_COUNT" ? "GROUP_COUNT" : "HOURS_MINUTES";
}

function sameModeWhere(mode: PackageModeKey) {
  if (mode === "MONTHLY") return { type: "MONTHLY" as const };
  if (mode === "GROUP_COUNT") {
    return { type: "HOURS" as const, note: { startsWith: GROUP_PACK_TAG } };
  }
  return {
    type: "HOURS" as const,
    OR: [{ note: null }, { NOT: { note: { startsWith: GROUP_PACK_TAG } } }],
  };
}

async function createPackage(formData: FormData) {
  "use server";
  const studentId = String(formData.get("studentId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const typeRaw = String(formData.get("type") ?? "HOURS");
  const type = typeRaw === "GROUP_COUNT" ? "HOURS" : typeRaw;
  const status = String(formData.get("status") ?? "PAUSED");

  const validFromStr = String(formData.get("validFrom") ?? "");
  const validToStr = String(formData.get("validTo") ?? "");
  const noteRaw = String(formData.get("note") ?? "");
  const paid = String(formData.get("paid") ?? "") === "on";
  const paidAtStr = String(formData.get("paidAt") ?? "");
  const paidAmountRaw = String(formData.get("paidAmount") ?? "");
  const paidNote = String(formData.get("paidNote") ?? "");

  const totalMinutes = Number(formData.get("totalMinutes") ?? 0);

  if (!studentId || !courseId || !validFromStr) {
    redirect(`/admin/packages?err=Missing+student/course/validFrom`);
  }

  const validFrom = parseDateStart(validFromStr);
  const validTo = validToStr ? parseDateEnd(validToStr) : null;
  const paidAt = paidAtStr ? new Date(paidAtStr) : paid ? new Date() : null;
  let paidAmount: number | null = null;
  if (paidAmountRaw !== "") {
    const n = Number(paidAmountRaw);
    if (Number.isFinite(n)) paidAmount = n;
    else redirect(`/admin/packages?err=Invalid+paidAmount`);
  }
  if (paid && !paidAtStr && paidAmount == null) {
    redirect(`/admin/packages?err=Paid+requires+paidAt+or+paidAmount`);
  }
  if (paidAtStr && (!paidAt || Number.isNaN(paidAt.getTime()))) {
    redirect(`/admin/packages?err=Invalid+paidAt`);
  }

  const overlapCheckTo = validTo ?? new Date(2999, 0, 1);
  const createMode = modeKeyFromCreateType(typeRaw, type);
  const overlap = await prisma.coursePackage.findFirst({
    where: {
      studentId,
      courseId,
      ...sameModeWhere(createMode),
      status: "ACTIVE",
      validFrom: { lte: overlapCheckTo },
      OR: [{ validTo: null }, { validTo: { gte: validFrom } }],
    },
    select: { id: true },
  });
  if (overlap) {
    redirect(`/admin/packages?err=Overlapping+ACTIVE+package+exists`);
  }

  const packageNote = composePackageNote(typeRaw === "GROUP_COUNT" ? "GROUP_COUNT" : "HOURS_MINUTES", noteRaw);

  if (type === "HOURS") {
    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
      redirect(`/admin/packages?err=HOURS+package+needs+totalMinutes`);
    }

    await prisma.coursePackage.create({
      data: {
        studentId,
        courseId,
        type: "HOURS",
        status: (status as any) || "PAUSED",
        remainingMinutes: totalMinutes,
        validFrom,
        validTo,
        paid,
        paidAt,
        paidAmount,
        paidNote: paidNote || null,
        note: packageNote || null,
        txns: {
          create: { kind: "PURCHASE", deltaMinutes: totalMinutes, note: packageNote || null },
        },
      },
    });
  } else {
    await prisma.coursePackage.create({
      data: {
        studentId,
        courseId,
        type: "MONTHLY",
        status: (status as any) || "PAUSED",
        validFrom,
        validTo,
        paid,
        paidAt,
        paidAmount,
        paidNote: paidNote || null,
        note: packageNote || null,
        txns: {
          create: { kind: "PURCHASE", deltaMinutes: 0, note: packageNote || null },
        },
      },
    });
  }

  redirect(`/admin/packages?msg=Created`);
}

async function updatePackage(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const remainingMinutesRaw = String(formData.get("remainingMinutes") ?? "");
  const validFromStr = String(formData.get("validFrom") ?? "");
  const validToStr = String(formData.get("validTo") ?? "");
  const noteRaw = String(formData.get("note") ?? "");
  const paid = String(formData.get("paid") ?? "") === "on";
  const paidAtStr = String(formData.get("paidAt") ?? "");
  const paidAmountRaw = String(formData.get("paidAmount") ?? "");
  const paidNote = String(formData.get("paidNote") ?? "");

  if (!id || !validFromStr) redirect(`/admin/packages?err=Missing+id/validFrom`);

  const pkg = await prisma.coursePackage.findUnique({
    where: { id },
    select: { remainingMinutes: true, note: true, type: true, studentId: true, courseId: true },
  });
  if (!pkg) redirect(`/admin/packages?err=Package+not+found`);

  const validFrom = parseDateStart(validFromStr);
  const validTo = validToStr ? parseDateEnd(validToStr) : null;
  const paidAt = paidAtStr ? new Date(paidAtStr) : paid ? new Date() : null;
  let paidAmount: number | null = null;
  if (paidAmountRaw !== "") {
    const n = Number(paidAmountRaw);
    if (Number.isFinite(n)) paidAmount = n;
  }

  let remainingMinutes: number | null = null;
  if (remainingMinutesRaw !== "") {
    const n = Number(remainingMinutesRaw);
    if (Number.isFinite(n) && n >= 0) remainingMinutes = n;
  }

  const note = composePackageNote(
    packageModeFromNote(pkg?.note ?? null) === "GROUP_COUNT" ? "GROUP_COUNT" : "HOURS_MINUTES",
    noteRaw
  );
  const updateMode = modeKeyFromSaved(pkg.type, note);
  const overlapCheckTo = validTo ?? new Date(2999, 0, 1);
  if (status === "ACTIVE") {
    const overlap = await prisma.coursePackage.findFirst({
      where: {
        id: { not: id },
        studentId: pkg.studentId,
        courseId: pkg.courseId,
        ...sameModeWhere(updateMode),
        status: "ACTIVE",
        validFrom: { lte: overlapCheckTo },
        OR: [{ validTo: null }, { validTo: { gte: validFrom } }],
      },
      select: { id: true },
    });
    if (overlap) {
      redirect(`/admin/packages?err=Overlapping+ACTIVE+package+exists+for+same+mode`);
    }
  }

  await prisma.coursePackage.update({
    where: { id },
    data: {
      status: (status as any) || undefined,
      remainingMinutes,
      validFrom,
      validTo,
      paid,
      paidAt: paid ? paidAt : null,
      paidAmount: paid ? paidAmount : null,
      paidNote: paid ? paidNote || null : null,
      note: note || null,
    },
  });

  if (pkg && remainingMinutes != null && pkg.remainingMinutes != null && remainingMinutes !== pkg.remainingMinutes) {
    const delta = remainingMinutes - pkg.remainingMinutes;
    await prisma.packageTxn.create({
      data: {
        packageId: id,
        kind: "ADJUST",
        deltaMinutes: delta,
        note: `manual adjust`,
      },
    });
  }

  redirect(`/admin/packages?msg=Updated`);
}

async function deletePackage(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.packageTxn.deleteMany({ where: { packageId: id } });
  await prisma.attendance.updateMany({ where: { packageId: id }, data: { packageId: null } });
  await prisma.coursePackage.delete({ where: { id } });

  redirect(`/admin/packages?msg=Deleted`);
}

export default async function AdminPackagesPage({
  searchParams,
}: {
  searchParams?: { msg?: string; err?: string; q?: string; courseId?: string; paid?: string; warn?: string };
}) {
  const lang = await getLang();
  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";
  const q = (searchParams?.q ?? "").trim();
  const filterCourseId = searchParams?.courseId ?? "";
  const filterPaid = searchParams?.paid ?? "";
  const filterWarn = searchParams?.warn ?? "";

  const wherePackages: any = {};
  if (q) wherePackages.student = { name: { contains: q, mode: "insensitive" } };
  if (filterCourseId) wherePackages.courseId = filterCourseId;
  if (filterPaid === "paid") wherePackages.paid = true;
  if (filterPaid === "unpaid") wherePackages.paid = false;

  const [students, courses, packages] = await Promise.all([
    prisma.student.findMany({ orderBy: { name: "asc" } }),
    prisma.course.findMany({ orderBy: { name: "asc" } }),
    prisma.coursePackage.findMany({
      where: wherePackages,
      include: { student: true, course: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

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

  const packageRiskMap = new Map(
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
  const filteredPackages = filterWarn === "alert" ? packages.filter((p) => packageRiskMap.get(p.id)?.isAlert) : packages;

  const today = new Date();
  const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div>
      <h2>{t(lang, "Packages", "课时包")}</h2>

      {err ? <NoticeBanner type="error" title={t(lang, "Error", "错误")} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "OK", "成功")} message={msg} /> : null}

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <SimpleModal buttonLabel={t(lang, "Create Package", "创建课包")} title={t(lang, "Create Package", "创建课包")} closeOnSubmit>
          <form action={createPackage} style={{ display: "grid", gap: 10, maxWidth: 760 }}>
            <label>
              {t(lang, "Student", "学生")}:
              <div style={{ marginLeft: 8 }}>
                <StudentSearchSelect
                  name="studentId"
                  placeholder={t(lang, "Search student name", "搜索学生姓名")}
                  students={students.map((s) => ({ id: s.id, name: s.name }))}
                />
              </div>
            </label>

            <label>
              {t(lang, "Course", "课程")}:
              <select name="courseId" defaultValue={courses[0]?.id ?? ""} style={{ marginLeft: 8, minWidth: 520 }}>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {t(lang, "Type", "类型")}:
              <select name="type" defaultValue="HOURS" style={{ marginLeft: 8, minWidth: 220 }}>
                <option value="HOURS">{t(lang, "HOURS (minutes)", "课时包(按分钟)")}</option>
                <option value="GROUP_COUNT">{t(lang, "GROUP (per class)", "班课包(按次)")}</option>
                <option value="MONTHLY">{t(lang, "MONTHLY (valid period)", "月卡(按有效期)")}</option>
              </select>
            </label>

            <label>
              {t(lang, "totalMinutes / count (HOURS/GROUP)", "总分钟数/次数(课时包/班课包)")}:
              <input name="totalMinutes" type="number" min={1} step={1} defaultValue={20} style={{ marginLeft: 8 }} />
              <span style={{ color: "#666", marginLeft: 8 }}>
                {t(lang, "HOURS: minutes (e.g. 600=10h). GROUP: class count (e.g. 20=20 classes).", "课时包按分钟（例如600=10小时）；班课包按次数（例如20=20次）。")}
              </span>
            </label>

            <label>
              {t(lang, "validFrom", "生效日期")}:
              <input name="validFrom" type="date" defaultValue={ymd} style={{ marginLeft: 8 }} />
            </label>

            <label>
              {t(lang, "validTo (optional)", "失效日期(可选)")}:
              <input name="validTo" type="date" style={{ marginLeft: 8 }} />
            </label>

            <label>
              {t(lang, "Status", "状态")}:
              <select name="status" defaultValue="PAUSED" style={{ marginLeft: 8, minWidth: 220 }}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAUSED">PAUSED</option>
                <option value="EXPIRED">EXPIRED</option>
              </select>
            </label>

            <label>
              {t(lang, "Paid", "已付款")}:
              <input type="checkbox" name="paid" style={{ marginLeft: 8 }} />
            </label>

            <label>
              {t(lang, "Paid At", "付款时间")}:
              <input name="paidAt" type="datetime-local" style={{ marginLeft: 8 }} />
            </label>

            <label>
              {t(lang, "Paid Amount", "付款金额")}:
              <input name="paidAmount" type="number" min={0} step={1} style={{ marginLeft: 8, width: 180 }} />
            </label>

            <label>
              {t(lang, "Paid Note", "付款备注")}:
              <input name="paidNote" type="text" placeholder={t(lang, "Paid note", "付款备注")} style={{ marginLeft: 8, width: 520 }} />
            </label>

            <label>
              {t(lang, "Note", "备注")}:
              <input name="note" type="text" placeholder={t(lang, "Note", "备注")} style={{ marginLeft: 8, width: 520 }} />
            </label>

            <ConfirmSubmitButton message={t(lang, "Create this package?", "确认创建课包？")}>
              {t(lang, "Create", "创建")}
            </ConfirmSubmitButton>
          </form>
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
              <th align="left">{t(lang, "Note", "备注")}</th>
              <th align="left">{t(lang, "Created", "创建时间")}</th>
              <th align="left">{t(lang, "Action", "操作")}</th>
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
                <td>{stripGroupPackTag(p.note) || "-"}</td>
                <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                <td>
                  <PackageEditModal
                    pkg={p}
                    onUpdate={updatePackage}
                    onDelete={deletePackage}
                    labels={{
                      edit: t(lang, "Edit", "编辑"),
                      update: t(lang, "Update", "更新"),
                      deleteLabel: t(lang, "Delete", "删除"),
                      paid: t(lang, "Paid", "已付款"),
                      paidAt: t(lang, "Paid At", "付款时间"),
                      paidAmount: t(lang, "Amount", "金额"),
                      paidNote: t(lang, "Paid Note", "付款备注"),
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
