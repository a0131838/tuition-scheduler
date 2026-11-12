import { formatBusinessDateOnly, formatBusinessDateTime, parseBusinessDateStart } from "@/lib/date-only";
import { prisma } from "@/lib/prisma";
import { adminRoomReservationsPath, requireRoomReservationUser, saveRoomReservation, teacherRoomReservationsPath, type RoomReservationArea } from "@/lib/room-reservations";
import { revalidatePath } from "next/cache";
import RoomBookingForm from "./RoomBookingForm";

const paths = { admin: adminRoomReservationsPath, teacher: teacherRoomReservationsPath };
const weekMs = 7 * 86400000;
const formAnchor = "room-booking-form";
const listAnchor = "room-booking-list";

function roomsHref(area: RoomReservationArea, params: Record<string, string>, anchor?: string) {
  return `${paths[area]}?${new URLSearchParams(params)}${anchor ? `#${anchor}` : ""}`;
}

async function save(area: RoomReservationArea, data: FormData) {
  "use server";
  const date = String(data.get("date") || "");
  const id = String(data.get("id") || "");
  const startAt = String(data.get("startAt")) + "+08:00";
  try {
    await saveRoomReservation(area, {
      id: id || undefined,
      updatedAt: String(data.get("updatedAt") || ""),
      roomId: String(data.get("roomId") || ""),
      organization: String(data.get("organization") || ""),
      contact: String(data.get("contact") || ""),
      note: String(data.get("note") || ""),
      startAt,
      endAt: String(data.get("endAt")) + "+08:00",
      repeatWeeks: Number(data.get("repeatWeeks") || 1),
      status: String(data.get("status") || "CONFIRMED"),
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Save failed / 保存失败" };
  }
  revalidatePath("/teacher/lead");
  revalidatePath(adminRoomReservationsPath);
  revalidatePath(teacherRoomReservationsPath);

  const viewStart = parseBusinessDateStart(date);
  const bookingStart = new Date(startAt);
  const savedDate = id && viewStart && (+bookingStart < +viewStart || +bookingStart >= +viewStart + weekMs)
    ? formatBusinessDateOnly(bookingStart)
    : date;
  return { href: roomsHref(area, { date: savedDate, saved: id ? "edited" : "1" }, listAnchor) };
}

export type RoomReservationsSearch = Promise<{ date?: string; saved?: string; id?: string }>;

export default async function RoomReservationsPage({ area, searchParams }: {
  area: RoomReservationArea;
  searchParams: RoomReservationsSearch;
}) {
  await requireRoomReservationUser(area);
  const { date = formatBusinessDateOnly(new Date()), saved, id } = await searchParams;
  const from = parseBusinessDateStart(date);
  if (!from) return <p>Invalid date / 日期无效</p>;
  const to = new Date(+from + weekMs);
  const [rooms, rows, editing] = await Promise.all([
    prisma.room.findMany({ include: { campus: true }, orderBy: { name: "asc" } }),
    prisma.roomReservation.findMany({ where: { startAt: { gte: from, lt: to } }, orderBy: { startAt: "asc" } }),
    id ? prisma.roomReservation.findUnique({ where: { id } }) : null,
  ]);
  const roomLabels = new Map(rooms.map(room => [room.id, `${room.campus.name} / ${room.name}`]));
  const cancelHref = roomsHref(area, { date }, listAnchor);
  const bookingLabel = editing && `${editing.organization} · ${roomLabels.get(editing.roomId) ?? editing.roomId} · ${formatBusinessDateTime(editing.startAt)}`;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {area === "teacher" ? <a href={`/teacher/lead?date=${encodeURIComponent(date)}`}>Back to Lead Desk / 返回主管工作台</a> : null}
      <h1>Classroom reservations / 教室预约</h1>
      <p>External room use only. No student attendance, package deduction or teacher payroll is created. / 外部教室使用记录，不产生学生考勤、扣课或老师工资。</p>
      <form method="get">
        <label>Week starts / 周起始 <input type="date" name="date" defaultValue={date} /></label>
        <button>View / 查看</button>
      </form>

      <section id={formAnchor} tabIndex={-1} aria-labelledby="room-booking-heading"
        style={{ scrollMarginTop: 16, maxWidth: 650, padding: 16, border: `1px solid ${editing ? "#93c5fd" : "#e2e8f0"}`, borderRadius: 12, background: editing ? "#eff6ff" : "white" }}>
        <h2 id="room-booking-heading" style={{ margin: "0 0 8px" }}>
          {editing ? "Edit booking / 修改预约" : id ? "Booking unavailable / 预约不可用" : "Book a classroom / 新增预约"}
        </h2>
        {editing ? <>
          <p style={{ margin: "0 0 6px", fontWeight: 700 }}>{bookingLabel}</p>
          <p style={{ margin: "0 0 12px" }}>Update the details below, then select Save changes. / 在下方修改资料，再点击「保存修改」。</p>
        </> : null}
        {id && !editing ? <a href={cancelHref}>Back to bookings / 返回预约列表</a> : (
          <RoomBookingForm key={editing?.id ?? "new"} action={save.bind(null, area)}>
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="id" value={editing?.id || ""} />
            <input type="hidden" name="updatedAt" value={editing?.updatedAt.toISOString() || ""} />
            <label>Organization / 机构 <input name="organization" list="organizations" required maxLength={120} defaultValue={editing?.organization || ""} /></label>
            <datalist id="organizations"><option>XDF</option><option>2B</option></datalist>
            <label>Room / 教室 <select name="roomId" required defaultValue={editing?.roomId || ""}>
              <option value="">Select / 请选择</option>
              {rooms.map(room => <option key={room.id} value={room.id}>{roomLabels.get(room.id)}</option>)}
            </select></label>
            <label>Start / 开始 <input name="startAt" type="datetime-local" required defaultValue={editing ? formatBusinessDateTime(editing.startAt).replace(" ", "T") : date + "T09:00"} /></label>
            <label>End / 结束 <input name="endAt" type="datetime-local" required defaultValue={editing ? formatBusinessDateTime(editing.endAt).replace(" ", "T") : date + "T10:00"} /></label>
            <label>Contact / 联系人 <input name="contact" maxLength={300} defaultValue={editing?.contact || ""} /></label>
            <label>Purpose / 用途及接待安排 <textarea name="note" maxLength={2000} defaultValue={editing?.note || ""} /></label>
            {editing ? (
              <label>Status / 状态 <select name="status" defaultValue={editing.status}>
                <option value="CONFIRMED">Confirmed / 已预约</option>
                <option value="CANCELLED">Cancelled / 已取消</option>
                <option value="COMPLETED">Used / 已使用</option>
              </select></label>
            ) : (
              <label>Weekly occurrences / 每周重复次数 <input name="repeatWeeks" type="number" min={1} max={12} defaultValue={1} /></label>
            )}
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <button style={{ background: "#1d4ed8", color: "white", borderColor: "#1d4ed8", fontWeight: 700 }}>
                {editing ? "Save changes / 保存修改" : "Save booking / 保存预约"}
              </button>
              {editing ? <a href={cancelHref}>Cancel editing / 取消编辑</a> : null}
            </div>
          </RoomBookingForm>
        )}
      </section>

      <section id={listAnchor} tabIndex={-1} style={{ scrollMarginTop: 16, minWidth: 0 }}>
        <h2 style={{ margin: "0 0 8px" }}>Bookings / 预约列表</h2>
        {saved ? (
          <p role="status" style={{ color: "#166534", background: "#f0fdf4", padding: 10, borderRadius: 8 }}>
            {saved === "edited" ? "Changes saved / 修改已保存" : "Booking saved / 预约已保存"}
          </p>
        ) : null}
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead><tr><th>Time / 时间</th><th>Room / 教室</th><th>Organization / 机构</th><th>Status / 状态</th><th>Details / 说明</th><th>Action / 操作</th></tr></thead>
            <tbody>{rows.map(row => (
              <tr key={row.id} style={row.id === editing?.id ? { background: "#eff6ff" } : undefined}>
                <td>{formatBusinessDateTime(row.startAt)} – {formatBusinessDateTime(row.endAt)}</td>
                <td>{roomLabels.get(row.roomId) ?? row.roomId}</td>
                <td>{row.organization}</td>
                <td>{row.status}</td>
                <td>{row.contact} {row.note}</td>
                <td><a href={roomsHref(area, { date, id: row.id }, formAnchor)}>Edit booking / 修改预约</a></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
