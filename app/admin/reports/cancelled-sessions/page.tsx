import { listLessonChangeHistory } from "@/lib/lesson-change-history";
import { cancellationRequesterLabel, CANCELLATION_REQUESTERS } from "@/lib/lesson-cancellation-policy";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { formatBusinessDateTime } from "@/lib/date-only";
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
    requester?: string;
  }>;
}) {
  const user = await requireAdmin();
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
  const requester = String(sp?.requester || "");
  const history = await listLessonChangeHistory({ from, to: toEnd, studentId, teacherId, courseId });
  const limitRaw = Number(sp?.limit ?? 1000);
  const limit = Number.isFinite(limitRaw) ? Math.max(100, Math.min(5000, Math.floor(limitRaw))) : 1000;

  const [teachers, students, courses, rows] = await Promise.all([
    prisma.teacher.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.student.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" }, take: 2000 }),
    prisma.course.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.attendance.findMany({
      where: {
        status: "EXCUSED",
        ...(requester === "UNKNOWN" ? { cancellationRequestedBy: null } : (CANCELLATION_REQUESTERS as readonly string[]).includes(requester) ? { cancellationRequestedBy: requester } : {}),
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
      <div
        style={{
          border: "1px solid #dbeafe",
          background: "linear-gradient(135deg, #eff6ff 0%, #fff 100%)",
          borderRadius: 16,
          padding: 16,
          marginBottom: 14,
          display: "grid",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", marginBottom: 4 }}>Cancelled Sessions / 已取消课次</div>
          <p>{t(lang,"Read only for Finance. No timetable or deduction changes can be made here.", "财务只读查询，此页不会修改课表或扣课。")}</p>
          <h2 style={{ margin: 0 }}>{t(lang, "Cancelled Sessions Report", "已取消课次报表")}</h2>
          <div style={{ color: "#475569", marginTop: 6 }}>
            {t(lang, "Use date, teacher, student, and charge filters together so finance and operations can review the same cancellation set.", "把日期、老师、学生和扣费条件一起筛好，财务和教务就能对齐同一批取消记录。")}
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Rows", "记录数")}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{rows.length}</div>
          </div>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Charged", "已扣费")}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{chargedCount}</div>
          </div>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 12, background: "#fff", padding: 12 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Uncharged", "未扣费")}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{unchargedCount}</div>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "sticky",
          top: 12,
          zIndex: 5,
          border: "1px solid #dbeafe",
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(8px)",
          borderRadius: 14,
          padding: 10,
          marginBottom: 14,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <a href="#cancelled-session-filters">{t(lang, "Filters", "筛选")}</a>
        <a href="#cancelled-session-list">{t(lang, "Rows", "记录")}</a>
      </div>

      <p>{t(lang,"Choose a future end date to include future cancelled lessons. Requester and charge filters apply to cancelled lessons; history below uses operation dates.", "查询未来取消时，请把截止日期选到课程日期。发起方和扣课筛选适用于取消列表；下方历史按操作日期查询。")}</p>
      <form id="cancelled-session-filters" method="GET" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, scrollMarginTop: 96 }}>
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
        <label>{t(lang,"Requested by", "取消发起方")}<select name="requester" defaultValue={requester}><option value="">{t(lang,"All", "全部")}</option>{CANCELLATION_REQUESTERS.map(v=><option value={v} key={v}>{cancellationRequesterLabel(v,lang)}</option>)}<option value="UNKNOWN">{cancellationRequesterLabel(null,lang)}</option></select></label>
        <label>
          Limit:
          <input name="limit" type="number" min={100} max={5000} defaultValue={String(limit)} style={{ marginLeft: 6, width: 90 }} />
        </label>
        <button type="submit" data-apply-submit="1">{t(lang, "Apply", "应用")}</button>
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
        <table id="cancelled-session-list" cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", scrollMarginTop: 96 }}>
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
              <th align="left">{t(lang, "Requested by", "取消发起方")}</th>
              <th align="left">{t(lang, "Reason", "原因")}</th>
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
                    {formatBusinessDateTime(new Date(r.session.startAt))} - {formatBusinessDateTime(new Date(r.session.endAt))}
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
                  <td>{cancellationRequesterLabel(r.cancellationRequestedBy,lang)}</td>
                  <td>{r.cancellationReason || r.note?.trim() || "-"}</td>
                  <td>{formatBusinessDateTime(new Date(r.updatedAt))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <details id="lesson-change-history" style={{marginTop:20,padding:14,border:"1px solid #cbd5e1",borderRadius:10}}>
        <summary style={{fontWeight:800,cursor:"pointer"}}>{t(lang,"Rescheduling, cancellation & deletion history", "改期、取消及删除历史")} ({history.rows.length})</summary>
        <p>{t(lang,"Filtered by operation date, student, teacher and course. Deleted lessons remain here as recorded history, without returning to the active timetable.", "按操作日期、学生、老师、课程筛选。已删除课程保留历史记录，不重新占用课表。")}</p>
        {history.limited?<p>{t(lang,"Recent 1000 operations searched. Narrow the date range for earlier records.", "当前检索最近1000条操作，请缩小日期范围查询更早记录。")}</p>:null}
        {history.rows.map(h=><div key={h.id} style={{borderTop:"1px solid #e2e8f0",padding:"12px 0"}}>
          <strong>{t(lang, h.action==="SESSION_DELETED"?"Deleted mistaken lesson":h.action==="SESSION_RESCHEDULED"?"Rescheduled":"Cancelled", h.action==="SESSION_DELETED"?"删除误建课次":h.action==="SESSION_RESCHEDULED"?"课程改期":"取消课次")} · {h.studentName}</strong>
          <div>{h.changedAt ? formatBusinessDateTime(new Date(h.changedAt)):""} · {h.actor}</div>
          <div>{t(lang,"Original lesson", "原课程")}: {h.beforeStart?formatBusinessDateTime(new Date(h.beforeStart)):"-"} · {h.courseName} · {h.teacherName}</div>
          {h.afterStart?<div>{t(lang,"New time", "新时间")}: {formatBusinessDateTime(new Date(h.afterStart))}</div>:null}
          <div>{h.reason}</div>
          {user.role!=="FINANCE" && h.sessionId?<a href={`/admin/sessions/${encodeURIComponent(h.sessionId)}/attendance`}>{t(lang,"Original lesson & recorded history", "原课及已保存历史")}</a>:null}
        </div>)}
        {!history.rows.length?<p>{t(lang,"No recorded changes in this operation date range.", "此操作日期范围内没有已记录的变更。")}</p>:null}
      </details>
    </div>
  );
}
