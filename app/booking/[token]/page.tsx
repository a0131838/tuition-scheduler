import crypto from "crypto";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { bookingSlotKey, listBookingSlotsForMonth, monthKey, parseMonth, ymd } from "@/lib/booking";

async function submitBookingRequest(token: string, formData: FormData) {
  "use server";
  const teacherId = String(formData.get("teacherId") ?? "");
  const startAtRaw = String(formData.get("startAt") ?? "");
  const endAtRaw = String(formData.get("endAt") ?? "");
  const coursePref = String(formData.get("coursePref") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  const link = await prisma.studentBookingLink.findUnique({
    where: { token },
    include: { teachers: true, selectedSlots: { select: { teacherId: true, startAt: true, endAt: true } } },
  });
  if (!link || !link.isActive) redirect(`/booking/${token}?err=Link+not+available`);
  if (link.expiresAt && link.expiresAt < new Date()) redirect(`/booking/${token}?err=Link+expired`);
  if (!link.teachers.some((x) => x.teacherId === teacherId)) redirect(`/booking/${token}?err=Invalid+teacher`);

  const startAt = new Date(startAtRaw);
  const endAt = new Date(endAtRaw);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    redirect(`/booking/${token}?err=Invalid+time+range`);
  }
  if (startAt < link.startDate || startAt > new Date(link.endDate.getTime() + 24 * 60 * 60 * 1000)) {
    redirect(`/booking/${token}?err=Out+of+range`);
  }
  if (link.onlySelectedSlots) {
    const selectedSet = new Set(
      link.selectedSlots.map((s) => bookingSlotKey(s.teacherId, new Date(s.startAt), new Date(s.endAt)))
    );
    if (!selectedSet.has(bookingSlotKey(teacherId, startAt, endAt))) {
      redirect(`/booking/${token}?err=This+slot+is+not+available`);
    }
  }

  const sessionConflict = await prisma.session.findFirst({
    where: {
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      OR: [{ teacherId }, { teacherId: null, class: { teacherId } }],
    },
  });
  if (sessionConflict) redirect(`/booking/${token}?err=Time+already+taken`);
  const apptConflict = await prisma.appointment.findFirst({
    where: { teacherId, startAt: { lt: endAt }, endAt: { gt: startAt } },
  });
  if (apptConflict) redirect(`/booking/${token}?err=Time+already+taken`);

  const existing = await prisma.studentBookingRequest.findFirst({
    where: { teacherId, startAt, endAt, status: { in: ["PENDING", "APPROVED"] } },
  });
  if (existing) redirect(`/booking/${token}?err=This+slot+was+just+taken`);

  try {
    await prisma.$transaction(async (tx) => {
      const req = await tx.studentBookingRequest.create({
        data: {
          linkId: link.id,
          studentId: link.studentId,
          teacherId,
          startAt,
          endAt,
          coursePref,
          note,
          status: "PENDING",
        },
      });

      await tx.$executeRaw`
        INSERT INTO "StudentBookingRequestSlotLock"
          ("id", "requestId", "teacherId", "startAt", "endAt", "createdAt")
        VALUES
          (${crypto.randomUUID()}, ${req.id}, ${teacherId}, ${startAt}, ${endAt}, NOW())
      `;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(`/booking/${token}?err=This+slot+was+just+taken`);
    }
    throw error;
  }
  redirect(`/booking/${token}?msg=Request+submitted`);
}

async function cancelBookingRequest(token: string, formData: FormData) {
  "use server";
  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) redirect(`/booking/${token}?err=Invalid+request`);

  const link = await prisma.studentBookingLink.findUnique({
    where: { token },
    select: { id: true, studentId: true, isActive: true, expiresAt: true },
  });
  if (!link) redirect(`/booking/${token}?err=Link+not+available`);

  const req = await prisma.studentBookingRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      linkId: true,
      studentId: true,
      status: true,
      sessionId: true,
      appointmentId: true,
      adminNote: true,
    },
  });
  if (!req || req.linkId !== link.id || req.studentId !== link.studentId) {
    redirect(`/booking/${token}?err=Request+not+found`);
  }
  if (req.status !== "PENDING") {
    redirect(`/booking/${token}?err=Only+pending+requests+can+be+cancelled`);
  }
  if (req.sessionId || req.appointmentId) {
    redirect(`/booking/${token}?err=Request+already+scheduled`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.studentBookingRequest.update({
      where: { id: req.id },
      data: {
        status: "CANCELLED",
        adminNote: [req.adminNote || "", `Cancelled by student @ ${new Date().toISOString()}`]
          .filter(Boolean)
          .join("\n"),
      },
    });
    await tx.$executeRaw`
      DELETE FROM "StudentBookingRequestSlotLock"
      WHERE "requestId" = ${req.id}
    `;
  });

  redirect(`/booking/${token}?msg=Request+cancelled`);
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

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams?: { month?: string; msg?: string; err?: string };
}) {
  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";

  const link = await prisma.studentBookingLink.findUnique({
    where: { token: params.token },
    include: {
      student: true,
      teachers: {
        include: {
          teacher: {
            include: {
              subjects: true,
              subjectCourse: true,
            },
          },
        },
        orderBy: { teacher: { name: "asc" } },
      },
      selectedSlots: { select: { teacherId: true, startAt: true, endAt: true } },
    },
  });
  if (!link || !link.isActive) {
    return <div style={{ maxWidth: 760, margin: "24px auto" }}><h2>Booking link is unavailable.</h2></div>;
  }
  if (link.expiresAt && link.expiresAt < new Date()) {
    return <div style={{ maxWidth: 760, margin: "24px auto" }}><h2>This booking link has expired.</h2></div>;
  }

  const fallbackMonth = monthKey(new Date(link.startDate));
  const parsed = parseMonth(searchParams?.month ?? fallbackMonth);
  const monthDate = parsed ? new Date(parsed.year, parsed.month - 1, 1) : new Date(link.startDate);
  const currentMonth = monthKey(monthDate);
  const prevMonth = monthKey(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1));
  const nextMonth = monthKey(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1));

  const teacherSubjectMap = new Map(
    link.teachers.map((x) => {
      const names = x.teacher.subjects.map((s) => s.name);
      const legacy = x.teacher.subjectCourse?.name ? [x.teacher.subjectCourse.name] : [];
      const label = Array.from(new Set([...names, ...legacy])).join(", ");
      return [x.teacherId, label];
    })
  );

  const slotsData = await listBookingSlotsForMonth({
    linkId: link.id,
    teachers: link.teachers.map((x) => ({
      teacherId: x.teacherId,
      teacherName: x.teacher.name,
      subjectLabel: teacherSubjectMap.get(x.teacherId) || "",
    })),
    startDate: link.startDate,
    endDate: link.endDate,
    durationMin: link.durationMin,
    stepMin: link.slotStepMin,
    month: currentMonth,
    selectedSlotSet: link.onlySelectedSlots
      ? new Set(link.selectedSlots.map((s) => bookingSlotKey(s.teacherId, new Date(s.startAt), new Date(s.endAt))))
      : undefined,
    onlySelectedSlots: link.onlySelectedSlots,
  });

  const slots = slotsData?.slots ?? [];
  const dayMap = new Map<string, typeof slots>();
  for (const s of slots) {
    const arr = dayMap.get(s.dateKey) ?? [];
    arr.push(s);
    dayMap.set(s.dateKey, arr);
  }
  const days = buildCalendarDays(monthDate);

  const existingRequests = await prisma.studentBookingRequest.findMany({
    where: { linkId: link.id, status: { in: ["PENDING", "APPROVED"] } },
    include: { teacher: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div style={{ maxWidth: 1100, margin: "20px auto", padding: "0 12px", fontFamily: "system-ui" }}>
      <h2>{link.title || "Select Your Preferred 1:1 Times"}</h2>
      <p>
        Student: <b>{link.student.name}</b><br />
        Teachers: <b>{link.teachers.map((x) => x.teacher.name).join(", ")}</b><br />
        Window: <b>{new Date(link.startDate).toLocaleDateString()} - {new Date(link.endDate).toLocaleDateString()}</b><br />
        Duration per class: <b>{link.durationMin} minutes</b><br />
        Start time interval: <b>{link.slotStepMin} minutes</b>
      </p>
      <div style={{ marginBottom: 10 }}>
        {link.teachers.map((x) => {
          const subjectLabel = teacherSubjectMap.get(x.teacherId);
          return (
            <div key={x.teacherId} style={{ fontSize: 13, color: "#555" }}>
              {x.teacher.name}{subjectLabel ? ` - ${subjectLabel}` : ""}
            </div>
          );
        })}
      </div>
      {link.note ? <div style={{ padding: 10, border: "1px solid #eee", background: "#fafafa", whiteSpace: "pre-wrap", marginBottom: 12 }}>{link.note}</div> : null}
      {err ? <div style={{ color: "#b00", marginBottom: 8 }}>{err}</div> : null}
      {msg ? <div style={{ color: "#087", marginBottom: 8 }}>{msg}</div> : null}
      {existingRequests.length > 0 ? (
        <div style={{ padding: 10, border: "1px solid #e8e8e8", background: "#fcfcfc", marginBottom: 10 }}>
          <b>Your submitted requests</b>
          <ul style={{ margin: "8px 0 0 18px" }}>
            {existingRequests.map((r) => (
              <li key={r.id}>
                {new Date(r.startAt).toLocaleString()} - {new Date(r.endAt).toLocaleTimeString()} | {r.teacher.name} | {r.status}
                {r.status === "PENDING" ? (
                  <form action={cancelBookingRequest.bind(null, params.token)} style={{ display: "inline", marginLeft: 8 }}>
                    <input type="hidden" name="requestId" value={r.id} />
                    <button type="submit" style={{ fontSize: 12 }}>Cancel</button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
        <a href={`/booking/${params.token}?month=${prevMonth}`}>← Prev</a>
        <b>{currentMonth}</b>
        <a href={`/booking/${params.token}?month=${nextMonth}`}>Next →</a>
      </div>

      <table cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
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
                  <td key={key} style={{ border: "1px solid #eee", verticalAlign: "top", width: `${100 / 7}%`, height: 180, background: d.inMonth ? "#fff" : "#fafafa" }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, color: d.inMonth ? "#222" : "#aaa" }}>{d.date.getDate()}</div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {items.slice(0, 5).map((s) => (
                        <details key={`${s.teacherId}|${s.startAt.toISOString()}`} style={{ border: "1px solid #eee", borderRadius: 4, padding: 4 }}>
                          <summary style={{ cursor: "pointer", fontSize: 12 }}>
                            {s.startLabel}-{s.endLabel} {s.teacherName}
                          </summary>
                          {s.teacherSubjectLabel ? (
                            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{s.teacherSubjectLabel}</div>
                          ) : null}
                          <form action={submitBookingRequest.bind(null, params.token)} style={{ display: "grid", gap: 4, marginTop: 6 }}>
                            <input type="hidden" name="teacherId" value={s.teacherId} />
                            <input type="hidden" name="startAt" value={s.startAt.toISOString()} />
                            <input type="hidden" name="endAt" value={s.endAt.toISOString()} />
                            <input name="coursePref" placeholder="Course preference (optional)" />
                            <textarea name="note" rows={2} placeholder="Message to admin (optional)" />
                            <button type="submit">Request This Slot</button>
                          </form>
                        </details>
                      ))}
                      {items.length > 5 ? (
                        <details style={{ fontSize: 12 }}>
                          <summary style={{ cursor: "pointer", color: "#666" }}>+{items.length - 5} more</summary>
                          <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
                            {items.slice(5).map((s) => (
                              <details key={`${s.teacherId}|${s.startAt.toISOString()}|more`} style={{ border: "1px solid #eee", borderRadius: 4, padding: 4 }}>
                                <summary style={{ cursor: "pointer", fontSize: 12 }}>
                                  {s.startLabel}-{s.endLabel} {s.teacherName}
                                </summary>
                                {s.teacherSubjectLabel ? (
                                  <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{s.teacherSubjectLabel}</div>
                                ) : null}
                                <form action={submitBookingRequest.bind(null, params.token)} style={{ display: "grid", gap: 4, marginTop: 6 }}>
                                  <input type="hidden" name="teacherId" value={s.teacherId} />
                                  <input type="hidden" name="startAt" value={s.startAt.toISOString()} />
                                  <input type="hidden" name="endAt" value={s.endAt.toISOString()} />
                                  <input name="coursePref" placeholder="Course preference (optional)" />
                                  <textarea name="note" rows={2} placeholder="Message to admin (optional)" />
                                  <button type="submit">Request This Slot</button>
                                </form>
                              </details>
                            ))}
                          </div>
                        </details>
                      ) : null}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}



