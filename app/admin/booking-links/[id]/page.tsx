import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { bookingSlotKey, listBookingSlotsForMonth, monthKey, parseMonth, ymd } from "@/lib/booking";
import CopyTextButton from "../../_components/CopyTextButton";
import SlotVisibilityToggleCard from "./_components/SlotVisibilityToggleCard";
import BookingLinkAdminActionsClient from "./_components/BookingLinkAdminActionsClient";
import BookingRequestActionsClient from "./_components/BookingRequestActionsClient";

function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? "";
}

function buildCalendarDays(monthDate: Date) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(first);
  const day = start.getDay();
  const shift = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + shift);
  return Array.from({ length: 42 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { date: d, inMonth: d.getMonth() === monthDate.getMonth() };
  });
}

export default async function AdminBookingLinkDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ month?: string; msg?: string; err?: string }>;
}) {
  const lang = await getLang();
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";

  const link = await prisma.studentBookingLink.findUnique({
    where: { id },
    include: {
      student: true,
      teachers: { include: { teacher: true }, orderBy: { teacher: { name: "asc" } } },
      selectedSlots: { select: { teacherId: true, startAt: true, endAt: true } },
      requests: {
        include: { teacher: true },
        orderBy: { createdAt: "desc" },
        take: 300,
      },
    },
  });
  if (!link) {
    return <div>{t(lang, "Booking link not found.", "链接不存在。")}</div>;
  }

  const selectedMonth = sp?.month ?? monthKey(new Date(link.startDate));
  const parsed = parseMonth(selectedMonth);
  const monthDate = parsed ? new Date(parsed.year, parsed.month - 1, 1) : new Date(link.startDate);
  const currentMonth = monthKey(monthDate);
  const prevMonth = monthKey(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1));
  const nextMonth = monthKey(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1));

  const slotsData = await listBookingSlotsForMonth({
    linkId: link.id,
    teachers: link.teachers.map((x) => ({ teacherId: x.teacherId, teacherName: x.teacher.name })),
    startDate: link.startDate,
    endDate: link.endDate,
    durationMin: link.durationMin,
    stepMin: link.slotStepMin,
    month: currentMonth,
  });
  const slots = slotsData?.slots ?? [];
  const selectedSet = new Set(
    link.selectedSlots.map((s) => bookingSlotKey(s.teacherId, new Date(s.startAt), new Date(s.endAt)))
  );
  const dayMap = new Map<string, typeof slots>();
  for (const s of slots) {
    const arr = dayMap.get(s.dateKey) ?? [];
    arr.push(s);
    dayMap.set(s.dateKey, arr);
  }
  const days = buildCalendarDays(monthDate);
  const base = appBaseUrl();
  const publicUrl = `${base}/booking/${link.token}`;

  return (
    <div>
      <p><a href="/admin/booking-links">← {t(lang, "Back to links", "返回链接列表")}</a></p>
      <h2>{link.title || t(lang, "Student Booking Link", "学生选课链接")}</h2>
      {err ? <div style={{ color: "#b00", marginBottom: 8 }}>{err}</div> : null}
      {msg ? <div style={{ color: "#087", marginBottom: 8 }}>{msg}</div> : null}

      <div style={{ marginBottom: 10 }}>
        <div><b>{t(lang, "Student", "学生")}:</b> {link.student.name}</div>
        <div><b>{t(lang, "Teachers", "老师")}:</b> {link.teachers.map((x) => x.teacher.name).join(", ")}</div>
        <div><b>{t(lang, "Window", "范围")}:</b> {new Date(link.startDate).toLocaleDateString()} - {new Date(link.endDate).toLocaleDateString()}</div>
        <div><b>{t(lang, "Duration", "时长")}:</b> {link.durationMin} min</div>
        <div><b>{t(lang, "Selected Slots", "已勾选时段")}:</b> {link.selectedSlots.length}</div>
        <div><b>{t(lang, "Student Visible Mode", "学生展示模式")}:</b> {link.onlySelectedSlots ? t(lang, "Only selected slots", "仅展示已选时段") : t(lang, "All generated slots", "展示所有生成时段")}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <b>{t(lang, "Public Link", "公开链接")}:</b>
          <a href={`/booking/${link.token}`} target="_blank" rel="noreferrer">{publicUrl}</a>
          <CopyTextButton
            text={publicUrl}
            label={t(lang, "Copy Link", "复制链接")}
            copiedLabel={t(lang, "Copied", "已复制")}
          />
        </div>
        <div><a href={`/api/booking-links/${link.id}/export/pdf?month=${currentMonth}`}>{t(lang, "Export PDF", "导出PDF")}</a></div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <BookingLinkAdminActionsClient
          lang={lang}
          linkId={link.id}
          initialIsActive={!!link.isActive}
          initialOnlySelectedSlots={!!link.onlySelectedSlots}
        />
      </div>

      <h3>{t(lang, "Monthly Availability", "月历可选时段")}</h3>
      <div style={{ display: "flex", gap: 12, marginBottom: 8, fontSize: 12 }}>
        <span style={{ background: "#effcf3", border: "1px solid #98d8b5", borderRadius: 4, padding: "2px 6px", color: "#157347" }}>
          {t(lang, "Visible to student", "学生可见")}
        </span>
        <span style={{ background: "#f8f8f8", border: "1px solid #e3e3e3", borderRadius: 4, padding: "2px 6px", color: "#777" }}>
          {t(lang, "Hidden from student", "学生不可见")}
        </span>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
        <a href={`/admin/booking-links/${link.id}?month=${prevMonth}`}>← {t(lang, "Prev", "上月")}</a>
        <b>{currentMonth}</b>
        <a href={`/admin/booking-links/${link.id}?month=${nextMonth}`}>{t(lang, "Next", "下月")} →</a>
      </div>
      <table cellPadding={6} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 20 }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((x) => <th key={x} align="left">{x}</th>)}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, row) => (
            <tr key={row}>
              {days.slice(row * 7, row * 7 + 7).map((d) => {
                const key = ymd(d.date);
                const items = dayMap.get(key) ?? [];
                return (
                  <td key={key} style={{ border: "1px solid #eee", verticalAlign: "top", width: `${100 / 7}%`, height: 120, background: d.inMonth ? "#fff" : "#fafafa" }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, color: d.inMonth ? "#222" : "#aaa" }}>{d.date.getDate()}</div>
                    <div style={{ display: "grid", gap: 4 }}>
                      {items.map((s, i) => {
                        const isVisibleToStudent = selectedSet.has(s.slotKey);
                        return (
                          <SlotVisibilityToggleCard
                            key={`${s.teacherId}-${s.startAt.toISOString()}-${i}`}
                            lang={lang}
                            linkId={link.id}
                            teacherId={s.teacherId}
                            startAtIso={s.startAt.toISOString()}
                            endAtIso={s.endAt.toISOString()}
                            startLabel={s.startLabel}
                            endLabel={s.endLabel}
                            teacherName={s.teacherName}
                            initialVisible={isVisibleToStudent}
                          />
                        );
                      })}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <h3>{t(lang, "Student Requests", "学生提交请求")}</h3>
      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th align="left">{t(lang, "Created", "创建时间")}</th>
            <th align="left">{t(lang, "Teacher", "老师")}</th>
            <th align="left">{t(lang, "Time", "时段")}</th>
            <th align="left">{t(lang, "Preference", "科目偏好")}</th>
            <th align="left">{t(lang, "Note", "备注")}</th>
            <th align="left">{t(lang, "Status", "状态")}</th>
            <th align="left">{t(lang, "Action", "操作")}</th>
          </tr>
        </thead>
        <tbody>
          {link.requests.map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
              <td>{new Date(r.createdAt).toLocaleString()}</td>
              <td>{r.teacher.name}</td>
              <td>{new Date(r.startAt).toLocaleString()} - {new Date(r.endAt).toLocaleTimeString()}</td>
              <td>{r.coursePref || "-"}</td>
              <td style={{ whiteSpace: "pre-wrap" }}>{r.note || "-"}</td>
              <td>{r.status}</td>
                <td>
                  {r.status === "PENDING" ? (
                    <BookingRequestActionsClient
                      linkId={link.id}
                      requestId={r.id}
                      labels={{
                        approve: t(lang, "Approve", "通过"),
                        reject: t(lang, "Reject", "拒绝"),
                        rejectNote: t(lang, "Reject note", "拒绝原因"),
                        errorPrefix: t(lang, "Error", "错误"),
                      }}
                    />
                  ) : (
                    <span style={{ color: "#666" }}>{r.reviewedBy ? `${r.reviewedBy} @ ${new Date(r.reviewedAt || r.updatedAt).toLocaleString()}` : "-"}</span>
                  )}
                </td>
            </tr>
          ))}
          {link.requests.length === 0 ? (
            <tr><td colSpan={7}>{t(lang, "No requests yet.", "暂无请求")}</td></tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}


