import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseDateOnly(s?: string | null) {
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [Y, M, D] = s.split("-").map(Number);
  if (!Number.isFinite(Y) || !Number.isFinite(M) || !Number.isFinite(D)) return null;
  const d = new Date(Y, M - 1, D, 0, 0, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getFullYear() !== Y || d.getMonth() !== M - 1 || d.getDate() !== D) return null;
  return d;
}

function isChargedExcused(a: { excusedCharge?: boolean | null; deductedCount?: number | null; deductedMinutes?: number | null }) {
  return Boolean(a.excusedCharge) || Number(a.deductedCount ?? 0) > 0 || Number(a.deductedMinutes ?? 0) > 0;
}

type ChargeFilter = "all" | "charged" | "uncharged";

export default async function CancelledSessionsReportPage({
  searchParams,
}: {
  searchParams?: Promise<{
    from?: string;
    to?: string;
    teacherId?: string;
    studentId?: string;
    courseId?: string;
    charge?: ChargeFilter;
    limit?: string;
  }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const defaultFrom = ymd(monthStart);
  const defaultTo = ymd(now);

  const fromRaw = (sp?.from ?? defaultFrom).trim();
  const toRaw = (sp?.to ?? defaultTo).trim();
  const fromParsed = parseDateOnly(fromRaw) ?? parseDateOnly(defaultFrom)!;
  const toParsed = parseDateOnly(toRaw) ?? parseDateOnly(defaultTo)!;
  const from = fromParsed <= toParsed ? fromParsed : toParsed;
  const to = fromParsed <= toParsed ? toParsed : fromParsed;
  const toEnd = new Date(to);
  toEnd.setHours(23, 59, 59, 999);

  const teacherId = (sp?.teacherId ?? "").trim();
  const studentId = (sp?.studentId ?? "").trim();
  const courseId = (sp?.courseId ?? "").trim();
  const charge = (sp?.charge ?? "all") as ChargeFilter;
  const limitRaw = Number(sp?.limit ?? 1000);
  const limit = Number.isFinite(limitRaw) ? Math.max(100, Math.min(5000, Math.floor(limitRaw))) : 1000;

  const [teachers, students, courses, rows] = await Promise.all([
    prisma.teacher.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.student.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" }, take: 2000 }),
    prisma.course.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.attendance.findMany({
      where: {
        status: "EXCUSED",
        studentId: studentId || undefined,
        session: {
          startAt: { gte: from, lte: toEnd },
          class: { courseId: courseId || undefined },
          ...(teacherId
            ? {
                OR: [{ teacherId }, { teacherId: null, class: { teacherId } }],
              }
            : {}),
        },
        ...(charge === "charged"
          ? {
              OR: [{ excusedCharge: true }, { deductedCount: { gt: 0 } }, { deductedMinutes: { gt: 0 } }],
            }
          : charge === "uncharged"
            ? { excusedCharge: false, deductedCount: 0, deductedMinutes: 0 }
            : {}),
      },
      include: {
        student: { select: { id: true, name: true } },
        package: { select: { id: true, type: true } },
        session: {
          include: {
            teacher: { select: { id: true, name: true } },
            class: {
              include: {
                teacher: { select: { id: true, name: true } },
                course: { select: { id: true, name: true } },
                subject: { select: { id: true, name: true } },
                level: { select: { id: true, name: true } },
                campus: { select: { id: true, name: true } },
                room: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ session: { startAt: "desc" } }, { updatedAt: "desc" }],
      take: limit,
    }),
  ]);

  const chargedCount = rows.filter(isChargedExcused).length;
  const unchargedCount = rows.length - chargedCount;
  const totalDeductCount = rows.reduce((sum, r) => sum + Number(r.deductedCount ?? 0), 0);
  const totalDeductMinutes = rows.reduce((sum, r) => sum + Number(r.deductedMinutes ?? 0), 0);

  return (
    <div>
      <h2>{t(lang, "Cancelled Sessions Report", "已取消课次报表")}</h2>

      <form method="GET" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <label>
          {t(lang, "From", "从")}:
          <input type="date" name="from" defaultValue={ymd(from)} style={{ marginLeft: 6 }} />
        </label>
        <label>
          {t(lang, "To", "到")}:
          <input type="date" name="to" defaultValue={ymd(to)} style={{ marginLeft: 6 }} />
        </label>
        <label>
          {t(lang, "Teacher", "老师")}:
          <select name="teacherId" defaultValue={teacherId} style={{ marginLeft: 6 }}>
            <option value="">{t(lang, "All", "全部")}</option>
            {teachers.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t(lang, "Student", "学生")}:
          <select name="studentId" defaultValue={studentId} style={{ marginLeft: 6 }}>
            <option value="">{t(lang, "All", "全部")}</option>
            {students.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t(lang, "Course", "课程")}:
          <select name="courseId" defaultValue={courseId} style={{ marginLeft: 6 }}>
            <option value="">{t(lang, "All", "全部")}</option>
            {courses.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t(lang, "Charge", "扣费")}:
          <select name="charge" defaultValue={charge} style={{ marginLeft: 6 }}>
            <option value="all">{t(lang, "All", "全部")}</option>
            <option value="charged">{t(lang, "Charged", "已扣费")}</option>
            <option value="uncharged">{t(lang, "Uncharged", "未扣费")}</option>
          </select>
        </label>
        <label>
          Limit:
          <input name="limit" type="number" min={100} max={5000} defaultValue={String(limit)} style={{ marginLeft: 6, width: 90 }} />
        </label>
        <button type="submit">{t(lang, "Apply", "应用")}</button>
      </form>

      <div style={{ marginBottom: 10, color: "#475569" }}>
        {t(lang, "Count", "数量")}: <b>{rows.length}</b> | {t(lang, "Charged", "已扣费")}: <b>{chargedCount}</b> |{" "}
        {t(lang, "Uncharged", "未扣费")}: <b>{unchargedCount}</b> | {t(lang, "Deduct Count", "扣次数")}:
        <b> {totalDeductCount}</b> | {t(lang, "Deduct Minutes", "扣分钟")}: <b>{totalDeductMinutes}</b>
      </div>
      <div style={{ marginBottom: 12, color: "#64748b", fontSize: 12 }}>
        {t(
          lang,
          "Scope: attendance status = EXCUSED, filtered by session start time. One row per student attendance.",
          "统计口径：Attendance 状态=EXCUSED，按课次开始时间筛选；每条记录对应1名学生的请假记录。"
        )}
      </div>

      {rows.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No cancelled records in selected range.", "当前筛选范围没有已取消记录。")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Session Time", "课次时间")}</th>
              <th align="left">{t(lang, "Student", "学生")}</th>
              <th align="left">{t(lang, "Teacher", "老师")}</th>
              <th align="left">{t(lang, "Course", "课程")}</th>
              <th align="left">{t(lang, "Campus/Room", "校区/教室")}</th>
              <th align="left">{t(lang, "Charge Flag", "扣费标记")}</th>
              <th align="left">{t(lang, "Deduct Count", "扣次数")}</th>
              <th align="left">{t(lang, "Deduct Minutes", "扣分钟")}</th>
              <th align="left">{t(lang, "Package", "课包")}</th>
              <th align="left">{t(lang, "Note", "备注")}</th>
              <th align="left">{t(lang, "Updated", "更新时间")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const cls = r.session.class;
              const charged = isChargedExcused(r);
              return (
                <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                  <td>
                    {new Date(r.session.startAt).toLocaleString()} - {new Date(r.session.endAt).toLocaleTimeString()}
                  </td>
                  <td>
                    {r.student.name}
                    <div style={{ color: "#94a3b8", fontSize: 11 }}>{r.student.id}</div>
                  </td>
                  <td>{r.session.teacher?.name ?? cls.teacher.name}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <ClassTypeBadge capacity={cls.capacity} compact />
                      <span>
                        {cls.course.name} / {cls.subject?.name ?? "-"} / {cls.level?.name ?? "-"}
                      </span>
                    </div>
                  </td>
                  <td>
                    {cls.campus.name} / {cls.room?.name ?? "(none)"}
                  </td>
                  <td style={{ color: charged ? "#b45309" : "#64748b", fontWeight: 700 }}>
                    {charged ? t(lang, "Charged", "已扣费") : t(lang, "Uncharged", "未扣费")}
                  </td>
                  <td>{r.deductedCount}</td>
                  <td>{r.deductedMinutes}</td>
                  <td>{r.package ? `${r.package.type} (${r.package.id.slice(0, 8)})` : "-"}</td>
                  <td>{r.note?.trim() || "-"}</td>
                  <td>{new Date(r.updatedAt).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

