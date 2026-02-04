import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getLang, t } from "@/lib/i18n";
import PackageEditModal from "../_components/PackageEditModal";
import ConfirmSubmitButton from "../_components/ConfirmSubmitButton";
import StudentSearchSelect from "../_components/StudentSearchSelect";

const LOW_MINUTES = 120;

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
function fmtDateInput(d: Date | null) {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

async function createPackage(formData: FormData) {
  "use server";
  const studentId = String(formData.get("studentId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const type = String(formData.get("type") ?? "HOURS");
  const status = String(formData.get("status") ?? "PAUSED");

  const validFromStr = String(formData.get("validFrom") ?? "");
  const validToStr = String(formData.get("validTo") ?? "");
  const note = String(formData.get("note") ?? "");
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
  if (paidAtStr && Number.isNaN(paidAt.getTime())) {
    redirect(`/admin/packages?err=Invalid+paidAt`);
  }

  const overlapCheckTo = validTo ?? new Date(2999, 0, 1);
  const overlap = await prisma.coursePackage.findFirst({
    where: {
      studentId,
      courseId,
      status: "ACTIVE",
      validFrom: { lte: overlapCheckTo },
      OR: [{ validTo: null }, { validTo: { gte: validFrom } }],
    },
    select: { id: true },
  });
  if (overlap) {
    redirect(`/admin/packages?err=Overlapping+ACTIVE+package+exists`);
  }

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
        note: note || null,
        txns: {
          create: { kind: "PURCHASE", deltaMinutes: totalMinutes, note: note || null },
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
        note: note || null,
        txns: {
          create: { kind: "PURCHASE", deltaMinutes: 0, note: note || null },
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
  const note = String(formData.get("note") ?? "");
  const paid = String(formData.get("paid") ?? "") === "on";
  const paidAtStr = String(formData.get("paidAt") ?? "");
  const paidAmountRaw = String(formData.get("paidAmount") ?? "");
  const paidNote = String(formData.get("paidNote") ?? "");

  if (!id || !validFromStr) redirect(`/admin/packages?err=Missing+id/validFrom`);

  const pkg = await prisma.coursePackage.findUnique({
    where: { id },
    select: { remainingMinutes: true },
  });

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
  searchParams?: { msg?: string; err?: string; q?: string; courseId?: string; paid?: string };
}) {
  const lang = await getLang();
  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";
  const q = (searchParams?.q ?? "").trim();
  const filterCourseId = searchParams?.courseId ?? "";
  const filterPaid = searchParams?.paid ?? "";

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

  const today = new Date();
  const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div>
      <h2>{t(lang, "Packages", "课时包")}</h2>

      {err && (
        <div style={{ padding: 12, border: "1px solid #f2b3b3", background: "#fff5f5", marginBottom: 12 }}>
          <b>{t(lang, "Error", "错误")}:</b> {err}
        </div>
      )}
      {msg && (
        <div style={{ padding: 12, border: "1px solid #b9e6c3", background: "#f2fff5", marginBottom: 12 }}>
          <b>{t(lang, "OK", "成功")}:</b> {msg}
        </div>
      )}

      <h3>{t(lang, "Create Package", "创建课包")}</h3>
      <form action={createPackage} style={{ display: "grid", gap: 10, maxWidth: 760, marginBottom: 18 }}>
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
            <option value="MONTHLY">{t(lang, "MONTHLY (valid period)", "月卡(按有效期)")}</option>
          </select>
        </label>

        <label>
          {t(lang, "totalMinutes (HOURS only)", "总分钟数(仅课时包)")}:
          <input name="totalMinutes" type="number" min={30} step={30} defaultValue={600} style={{ marginLeft: 8 }} />
          <span style={{ color: "#666", marginLeft: 8 }}>
            {t(lang, "e.g. 600 = 10 hours, step 30 minutes", "例如 600=10小时，步进30分钟")}
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

      <h3>{t(lang, "Packages List", "课包列表")}</h3>
      <form method="GET" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
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
        <button type="submit">{t(lang, "Apply", "应用")}</button>
        <a href="/admin/packages" style={{ color: "#666" }}>
          {t(lang, "Clear", "清除")}
        </a>
        <span style={{ color: "#666" }}>
          {t(lang, "Showing", "显示")} {packages.length}
        </span>
      </form>

      {packages.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No packages yet.", "暂无课包")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Student", "学生")}</th>
              <th align="left">{t(lang, "Course", "课程")}</th>
              <th align="left">{t(lang, "Type", "类型")}</th>
              <th align="left">{t(lang, "Remaining", "剩余")}</th>
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
            {packages.map((p) => (
              <tr key={p.id} style={{ borderTop: "1px solid #eee" }}>
                <td>{p.student?.name ?? "-"}</td>
                <td>{p.course?.name ?? "-"}</td>
                <td>{p.type}</td>
                <td>
                  {p.type === "HOURS" ? (
                    <span
                      style={{
                        fontWeight: (p.remainingMinutes ?? 0) <= LOW_MINUTES ? 700 : 400,
                        color: (p.remainingMinutes ?? 0) <= LOW_MINUTES ? "#b00" : undefined,
                      }}
                    >
                      {fmtMinutes(p.remainingMinutes)}
                    </span>
                  ) : (
                    "-"
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
                <td>{p.note ?? "-"}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
