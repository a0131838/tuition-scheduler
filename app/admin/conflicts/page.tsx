import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getLang, t } from "@/lib/i18n";
import ScheduleCourseFilter from "../_components/ScheduleCourseFilter";
import NoticeBanner from "../_components/NoticeBanner";

function parseDateOnly(s: string) {
  const [Y, M, D] = s.split("-").map(Number);
  return new Date(Y, M - 1, D, 0, 0, 0, 0);
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fmtHHMM(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function fmtRange(startAt: Date, endAt: Date) {
  return `${ymd(startAt)} ${fmtHHMM(startAt)}-${fmtHHMM(endAt)}`;
}

function classLabel(cls: {
  course: { name: string };
  subject?: { name: string } | null;
  level?: { name: string } | null;
}) {
  return `${cls.course.name}${cls.subject ? ` / ${cls.subject.name}` : ""}${cls.level ? ` / ${cls.level.name}` : ""}`;
}

function roomLabel(cls: { room?: { name: string } | null; campus: { name: string } }) {
  return `${cls.campus.name}${cls.room ? ` / ${cls.room.name}` : ""}`;
}

function canTeachSubject(teacher: any, subjectId?: string | null) {
  if (!subjectId) return true;
  if (teacher?.subjectCourseId === subjectId) return true;
  if (Array.isArray(teacher?.subjects)) {
    return teacher.subjects.some((s: any) => s?.id === subjectId);
  }
  return false;
}

async function checkTeacherAvailability(teacherId: string, startAt: Date, endAt: Date) {
  if (startAt.toDateString() !== endAt.toDateString()) {
    return "Session spans multiple days";
  }

  const startMin = startAt.getHours() * 60 + startAt.getMinutes();
  const endMin = endAt.getHours() * 60 + endAt.getMinutes();

  const dayStart = new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate(), 23, 59, 59, 999);

  let slots = await prisma.teacherAvailabilityDate.findMany({
    where: { teacherId, date: { gte: dayStart, lte: dayEnd } },
    select: { startMin: true, endMin: true },
    orderBy: { startMin: "asc" },
  });

  if (slots.length === 0) {
    const weekday = startAt.getDay();
    slots = await prisma.teacherAvailability.findMany({
      where: { teacherId, weekday },
      select: { startMin: true, endMin: true },
      orderBy: { startMin: "asc" },
    });
  }

  if (slots.length === 0) return "No availability (no slots)";

  const ok = slots.some((s) => s.startMin <= startMin && s.endMin >= endMin);
  if (!ok) return "Outside availability";
  return null;
}

async function replaceSessionTeacher(formData: FormData) {
  "use server";
  const sessionId = String(formData.get("sessionId") ?? "");
  const newTeacherId = String(formData.get("newTeacherId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const returnTo = String(formData.get("returnTo") ?? "/admin/conflicts");

  if (!sessionId || !newTeacherId) redirect(`${returnTo}?err=Missing+sessionId+or+newTeacherId`);

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { class: true, teacher: true },
  });
  if (!session) redirect(`${returnTo}?err=Session+not+found`);

  const teacher = await prisma.teacher.findUnique({
    where: { id: newTeacherId },
    include: { subjects: true },
  });
  if (!teacher) redirect(`${returnTo}?err=Teacher+not+found`);
  if (!canTeachSubject(teacher, session.class.subjectId)) {
    const cls = await prisma.class.findUnique({
      where: { id: session.classId },
      include: { course: true, subject: true, level: true },
    });
    const label = cls ? classLabel(cls) : "Class";
    redirect(`${returnTo}?err=${encodeURIComponent(`Teacher cannot teach this course: ${label}`)}`);
  }

  const availErr = await checkTeacherAvailability(newTeacherId, session.startAt, session.endAt);
  if (availErr) {
    redirect(`${returnTo}?err=${encodeURIComponent(`Availability conflict: ${availErr}`)}`);
  }

  const conflict = await prisma.session.findFirst({
    where: {
      id: { not: session.id },
      startAt: { lt: session.endAt },
      endAt: { gt: session.startAt },
      OR: [{ teacherId: newTeacherId }, { teacherId: null, class: { teacherId: newTeacherId } }],
    },
    include: { class: { include: { course: true, subject: true, level: true } } },
  });
  if (conflict) {
    const label = classLabel(conflict.class);
    const time = fmtRange(conflict.startAt, conflict.endAt);
    redirect(`${returnTo}?err=${encodeURIComponent(`Teacher time conflict: ${label} | ${time}`)}`);
  }

  const fromTeacherId = session.teacherId ?? session.class.teacherId;
  const toTeacherId = newTeacherId;
  const clsInfo = await prisma.class.findUnique({
    where: { id: session.classId },
    include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true },
  });
  const label = clsInfo ? classLabel(clsInfo) : "Class";
  const time = fmtRange(session.startAt, session.endAt);
  const fromName = session.teacher?.name ?? clsInfo?.teacher?.name ?? "Teacher";
  const toName = teacher.name;

  await prisma.$transaction(async (tx) => {
    await tx.session.update({
      where: { id: session.id },
      data: { teacherId: toTeacherId === session.class.teacherId ? null : toTeacherId },
    });
    await tx.sessionTeacherChange.create({
      data: { sessionId: session.id, fromTeacherId, toTeacherId, reason },
    });
  });

  redirect(`${returnTo}?msg=${encodeURIComponent(`Teacher updated: ${label} | ${time} | ${fromName} → ${toName}`)}`);
}

async function changeClassRoom(formData: FormData) {
  "use server";
  const classId = String(formData.get("classId") ?? "");
  const roomIdRaw = String(formData.get("roomId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/admin/conflicts");
  const rangeFrom = String(formData.get("rangeFrom") ?? "");
  const rangeTo = String(formData.get("rangeTo") ?? "");

  if (!classId) redirect(`${returnTo}?err=Missing+classId`);

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { campus: true },
  });
  if (!cls) redirect(`${returnTo}?err=Class+not+found`);

  const clsInfo = await prisma.class.findUnique({
    where: { id: classId },
    include: { course: true, subject: true, level: true, campus: true, room: true },
  });
  const label = clsInfo ? classLabel(clsInfo) : "Class";
  const oldRoomLabel = clsInfo ? roomLabel(clsInfo) : "(no room)";

  const roomId = roomIdRaw || null;
  let nextRoomLabel = "(none)";
  if (roomId) {
    const room = await prisma.room.findUnique({ where: { id: roomId }, include: { campus: true } });
    if (!room || room.campusId !== cls.campusId) {
      redirect(`${returnTo}?err=${encodeURIComponent(`Room not in this campus: ${cls.campus.name}`)}`);
    }
    nextRoomLabel = `${room.campus.name} / ${room.name}`;
  }

  if (rangeFrom && rangeTo && roomId) {
    const from = parseDateOnly(rangeFrom);
    const to = parseDateOnly(rangeTo);
    to.setHours(23, 59, 59, 999);
    const classSessions = await prisma.session.findMany({
      where: { classId, startAt: { lte: to }, endAt: { gte: from } },
      select: { id: true, startAt: true, endAt: true },
    });

    for (const s of classSessions) {
      const conflict = await prisma.session.findFirst({
        where: {
          id: { not: s.id },
          class: { roomId },
          startAt: { lt: s.endAt },
          endAt: { gt: s.startAt },
        },
        select: { id: true },
      });
      if (conflict) {
        const conflictClass = await prisma.class.findUnique({
          where: { id: conflict.classId },
          include: { course: true, subject: true, level: true, campus: true, room: true },
        });
        const label = conflictClass ? classLabel(conflictClass) : "Class";
        const place = conflictClass ? roomLabel(conflictClass) : "Room";
        const time = fmtRange(conflict.startAt, conflict.endAt);
        redirect(`${returnTo}?err=${encodeURIComponent(`Room conflict: ${label} | ${place} | ${time}`)}`);
      }
    }
  }

  await prisma.class.update({
    where: { id: classId },
    data: { roomId },
  });

  redirect(
    `${returnTo}?msg=${encodeURIComponent(
      `Room updated: ${label} | ${oldRoomLabel} → ${nextRoomLabel}`
    )}`
  );
}

async function cancelSession(formData: FormData) {
  "use server";
  const sessionId = String(formData.get("sessionId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/admin/conflicts");
  if (!sessionId) redirect(`${returnTo}?err=Missing+sessionId`);
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { class: { include: { course: true, subject: true, level: true } } },
  });
  if (!session) redirect(`${returnTo}?err=Session+not+found`);
  const label = classLabel(session.class);
  const time = fmtRange(session.startAt, session.endAt);
  await prisma.session.delete({ where: { id: sessionId } });
  redirect(`${returnTo}?msg=${encodeURIComponent(`Session cancelled: ${label} | ${time}`)}`);
}

export default async function ConflictsPage({
  searchParams,
}: {
  searchParams?: { from?: string; to?: string; courseId?: string; subjectId?: string; msg?: string; err?: string };
}) {
  const lang = await getLang();
  const today = new Date();
  const defaultFrom = ymd(today);
  const toDefault = new Date(today);
  toDefault.setDate(toDefault.getDate() + 14);
  const defaultTo = ymd(toDefault);

  const fromStr = (searchParams?.from ?? defaultFrom).trim();
  const toStr = (searchParams?.to ?? defaultTo).trim();
  const msg = searchParams?.msg ? decodeURIComponent(searchParams.msg) : "";
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";
  const filterCourseId = (searchParams?.courseId ?? "").trim();
  const filterSubjectId = (searchParams?.subjectId ?? "").trim();

  const from = parseDateOnly(fromStr);
  const to = parseDateOnly(toStr);
  to.setHours(23, 59, 59, 999);

  const [sessions, teachers, rooms, courses, subjects] = await Promise.all([
    prisma.session.findMany({
      where: { startAt: { lte: to }, endAt: { gte: from } },
      include: {
        teacher: true,
        student: true,
        class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.teacher.findMany({ include: { subjects: true, subjectCourse: true }, orderBy: { name: "asc" } }),
    prisma.room.findMany({ include: { campus: true }, orderBy: { name: "asc" } }),
    prisma.course.findMany({ orderBy: { name: "asc" } }),
    prisma.subject.findMany({ include: { course: true }, orderBy: [{ courseId: "asc" }, { name: "asc" }] }),
  ]);

  const byTeacher = new Map<string, typeof sessions>();
  const byRoom = new Map<string, typeof sessions>();
  const effectiveTeacherId = (s: (typeof sessions)[number]) => s.teacherId ?? s.class.teacherId;

  for (const s of sessions) {
    const tid = effectiveTeacherId(s);
    if (tid) {
      const arr = byTeacher.get(tid) ?? [];
      arr.push(s);
      byTeacher.set(tid, arr);
    }
    if (s.class.roomId) {
      const arr = byRoom.get(s.class.roomId) ?? [];
      arr.push(s);
      byRoom.set(s.class.roomId, arr);
    }
  }

  const teacherConflicts = new Map<string, Set<string>>();
  const roomConflicts = new Map<string, Set<string>>();

  function addConflict(map: Map<string, Set<string>>, a: string, b: string) {
    if (!map.has(a)) map.set(a, new Set());
    map.get(a)!.add(b);
  }

  for (const list of byTeacher.values()) {
    list.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    for (let i = 0; i < list.length; i += 1) {
      const s = list[i];
      for (let j = i + 1; j < list.length; j += 1) {
        const o = list[j];
        if (o.startAt >= s.endAt) break;
        if (o.endAt > s.startAt) {
          addConflict(teacherConflicts, s.id, o.id);
          addConflict(teacherConflicts, o.id, s.id);
        }
      }
    }
  }

  for (const list of byRoom.values()) {
    list.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    for (let i = 0; i < list.length; i += 1) {
      const s = list[i];
      for (let j = i + 1; j < list.length; j += 1) {
        const o = list[j];
        if (o.startAt >= s.endAt) break;
        if (o.endAt > s.startAt) {
          addConflict(roomConflicts, s.id, o.id);
          addConflict(roomConflicts, o.id, s.id);
        }
      }
    }
  }

  const conflictSessions = sessions.filter(
    (s) => (teacherConflicts.get(s.id)?.size ?? 0) > 0 || (roomConflicts.get(s.id)?.size ?? 0) > 0
  );
  const filteredConflicts = conflictSessions.filter((s) => {
    if (filterCourseId && s.class.courseId !== filterCourseId) return false;
    if (filterSubjectId && s.class.subjectId !== filterSubjectId) return false;
    return true;
  });

  const sessionMap = new Map(sessions.map((s) => [s.id, s]));
  const returnToBase = `/admin/conflicts?${new URLSearchParams({
    from: fromStr,
    to: toStr,
    ...(filterCourseId ? { courseId: filterCourseId } : {}),
    ...(filterSubjectId ? { subjectId: filterSubjectId } : {}),
  }).toString()}`;

  return (
    <div>
      <h2>{t(lang, "Conflict Center", "冲突处理中心")}</h2>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fafafa", marginBottom: 12 }}>
        <form method="GET" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label>
            {t(lang, "From", "从")}:
            <input name="from" type="date" defaultValue={fromStr} style={{ marginLeft: 6 }} />
          </label>
          <label>
            {t(lang, "To", "到")}:
            <input name="to" type="date" defaultValue={toStr} style={{ marginLeft: 6 }} />
          </label>
          <ScheduleCourseFilter
            courses={courses.map((c) => ({ id: c.id, name: c.name }))}
            subjects={subjects.map((s) => ({ id: s.id, name: s.name, courseId: s.courseId, courseName: s.course.name }))}
            initialCourseId={filterCourseId}
            initialSubjectId={filterSubjectId}
            labels={{
              course: t(lang, "Course", "课程"),
              subject: t(lang, "Subject", "科目"),
              courseAll: t(lang, "Course (all)", "课程（全部）"),
              subjectAll: t(lang, "Subject (all)", "科目（全部）"),
            }}
          />
          <button type="submit">{t(lang, "Apply", "应用")}</button>
        </form>
        <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
          {t(lang, "Conflicts in range", "所选范围冲突")}: <b>{filteredConflicts.length}</b>
        </div>
      </div>

      {err ? <NoticeBanner type="error" title={t(lang, "Error", "错误")} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={t(lang, "Success", "成功")} message={msg} /> : null}

      {filteredConflicts.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No conflicts found in selected range.", "所选范围内暂无冲突。")}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
          {filteredConflicts.map((s) => {
            const teacherId = effectiveTeacherId(s);
            const cls = s.class;
            const conflictTeacherIds = Array.from(teacherConflicts.get(s.id) ?? []).map((id) => sessionMap.get(id)).filter(Boolean) as typeof sessions;
            const conflictRoomIds = Array.from(roomConflicts.get(s.id) ?? []).map((id) => sessionMap.get(id)).filter(Boolean) as typeof sessions;
            const eligibleTeachers = teachers.filter((tch) => canTeachSubject(tch, cls.subjectId));
            const campusRooms = rooms.filter((r) => r.campusId === cls.campusId);
            const conflictTags = [
              conflictTeacherIds.length > 0 ? t(lang, "Teacher conflict", "老师冲突") : null,
              conflictRoomIds.length > 0 ? t(lang, "Room conflict", "教室冲突") : null,
            ].filter(Boolean) as string[];

            return (
              <div key={s.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontWeight: 700 }}>{fmtRange(s.startAt, s.endAt)}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {conflictTags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          background: "#fef3c7",
                          color: "#92400e",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 4, color: "#666", fontSize: 12 }}>
                  {cls.course.name}
                  {cls.subject ? ` / ${cls.subject.name}` : ""}
                  {cls.level ? ` / ${cls.level.name}` : ""} | {cls.campus.name} / {cls.room?.name ?? "(none)"}
                </div>
                <div style={{ marginTop: 4, color: "#666", fontSize: 12 }}>
                  {t(lang, "Teacher", "老师")}: {s.teacher?.name ?? cls.teacher.name}
                </div>
                {s.student ? (
                  <div style={{ marginTop: 4, color: "#666", fontSize: 12 }}>
                    {t(lang, "Student", "学生")}: {s.student.name}
                  </div>
                ) : null}
                <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <a href={`/admin/classes/${cls.id}`}>{t(lang, "View Class", "查看班级")}</a>
                  <a href={`/admin/classes/${cls.id}/sessions`}>{t(lang, "Sessions", "课次")}</a>
                  <a href={`/admin/sessions/${s.id}/attendance`}>{t(lang, "Attendance", "点名")}</a>
                </div>

                {(conflictTeacherIds.length > 0 || conflictRoomIds.length > 0) && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#b45309" }}>
                    {conflictTeacherIds.length > 0 ? (
                      <div>
                        {t(lang, "Teacher conflict", "老师冲突")}:
                        <div style={{ marginTop: 4, color: "#8a4b08" }}>
                          {conflictTeacherIds.map((c) => (
                            <div key={c.id}>
                              {fmtRange(c.startAt, c.endAt)} | {c.class.course.name} /{" "}
                              {c.class.subject?.name ?? "-"} / {c.class.level?.name ?? "-"} |{" "}
                              {c.class.teacher.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {conflictRoomIds.length > 0 ? (
                      <div style={{ marginTop: 6 }}>
                        {t(lang, "Room conflict", "教室冲突")}:
                        <div style={{ marginTop: 4, color: "#8a4b08" }}>
                          {conflictRoomIds.map((c) => (
                            <div key={c.id}>
                              {fmtRange(c.startAt, c.endAt)} | {c.class.course.name} /{" "}
                              {c.class.subject?.name ?? "-"} / {c.class.level?.name ?? "-"} |{" "}
                              {c.class.room?.name ?? "(none)"}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  <form action={replaceSessionTeacher} style={{ display: "grid", gap: 6 }}>
                    <input type="hidden" name="sessionId" value={s.id} />
                    <input type="hidden" name="returnTo" value={returnToBase} />
                    <label style={{ display: "grid", gap: 4 }}>
                      <span style={{ fontSize: 12 }}>{t(lang, "Change Teacher", "换老师")}</span>
                      <select name="newTeacherId" defaultValue={teacherId ?? ""} disabled={eligibleTeachers.length === 0}>
                        {eligibleTeachers.map((tch) => (
                          <option key={tch.id} value={tch.id}>
                            {tch.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <input name="reason" placeholder={t(lang, "Reason (optional)", "原因(可选)") } />
                    <button type="submit" disabled={eligibleTeachers.length === 0}>
                      {t(lang, "Confirm", "确认")}
                    </button>
                    {eligibleTeachers.length === 0 ? (
                      <div style={{ color: "#b00", fontSize: 12 }}>
                        {t(lang, "No eligible teachers for this course.", "该课程暂无可选老师。")}
                      </div>
                    ) : null}
                  </form>

                  <form action={changeClassRoom} style={{ display: "grid", gap: 6 }}>
                    <input type="hidden" name="classId" value={cls.id} />
                    <input type="hidden" name="returnTo" value={returnToBase} />
                    <input type="hidden" name="rangeFrom" value={fromStr} />
                    <input type="hidden" name="rangeTo" value={toStr} />
                    <label style={{ display: "grid", gap: 4 }}>
                      <span style={{ fontSize: 12 }}>{t(lang, "Change Room (class)", "换教室(班级)")}</span>
                      <select name="roomId" defaultValue={cls.roomId ?? ""} disabled={campusRooms.length === 0}>
                        <option value="">{t(lang, "(none)", "(无)")}</option>
                        {campusRooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div style={{ fontSize: 11, color: "#666" }}>
                      {t(lang, "Note: changing room affects the whole class (in selected date range).", "提示：换教室会影响该班级（所选日期范围内）。")}
                    </div>
                    <button type="submit" disabled={campusRooms.length === 0}>
                      {t(lang, "Confirm", "确认")}
                    </button>
                    {campusRooms.length === 0 ? (
                      <div style={{ color: "#b00", fontSize: 12 }}>
                        {t(lang, "No rooms available in this campus.", "该校区暂无教室。")}
                      </div>
                    ) : null}
                  </form>

                  <form action={cancelSession}>
                    <input type="hidden" name="sessionId" value={s.id} />
                    <input type="hidden" name="returnTo" value={returnToBase} />
                    <button type="submit" style={{ background: "#fee2e2", borderColor: "#fca5a5" }}>
                      {t(lang, "Cancel Session", "取消课次")}
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
