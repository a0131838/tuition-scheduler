import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import ScheduleCourseFilter from "../_components/ScheduleCourseFilter";
import NoticeBanner from "../_components/NoticeBanner";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";
import ConflictsAppointmentActionsClient from "./_components/ConflictsAppointmentActionsClient";
import ConflictsSessionActionsClient from "./_components/ConflictsSessionActionsClient";

function parseDateOnly(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [Y, M, D] = s.split("-").map(Number);
  if (!Number.isFinite(Y) || !Number.isFinite(M) || !Number.isFinite(D)) return null;
  const dt = new Date(Y, M - 1, D, 0, 0, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  // Guard against JS date overflow like 2026-02-31 -> 2026-03-03.
  if (dt.getFullYear() !== Y || dt.getMonth() !== M - 1 || dt.getDate() !== D) return null;
  return dt;
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

function canTeachClass(teacher: any, courseId?: string | null, subjectId?: string | null) {
  if (subjectId) {
    if (teacher?.subjectCourseId === subjectId) return true;
    if (Array.isArray(teacher?.subjects) && teacher.subjects.some((s: any) => s?.id === subjectId)) return true;
    return false;
  }

  if (!courseId) return false;
  if (teacher?.subjectCourse?.courseId === courseId) return true;
  if (Array.isArray(teacher?.subjects)) {
    return teacher.subjects.some((s: any) => s?.courseId === courseId);
  }
  return false;
}

// Server actions were removed; conflict resolution now uses client fetch + /api routes.

export default async function ConflictsPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string; to?: string; courseId?: string; subjectId?: string; msg?: string; err?: string }>;
}) {
  const lang = await getLang();
  const today = new Date();
  const defaultFrom = ymd(today);
  const toDefault = new Date(today);
  toDefault.setDate(toDefault.getDate() + 14);
  const defaultTo = ymd(toDefault);

  const sp = await searchParams;
  const fromStr = (sp?.from ?? defaultFrom).trim();
  const toStr = (sp?.to ?? defaultTo).trim();
  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const filterCourseId = (sp?.courseId ?? "").trim();
  const filterSubjectId = (sp?.subjectId ?? "").trim();

  const fromParsed = parseDateOnly(fromStr) ?? parseDateOnly(defaultFrom)!;
  const toParsed = parseDateOnly(toStr) ?? parseDateOnly(defaultTo)!;
  const from = fromParsed <= toParsed ? fromParsed : toParsed;
  const to = fromParsed <= toParsed ? toParsed : fromParsed;
  const fromSafeStr = ymd(from);
  const toSafeStr = ymd(to);
  to.setHours(23, 59, 59, 999);

  const [sessions, appointments, teachers, rooms, courses, subjects] = await Promise.all([
    prisma.session.findMany({
      where: { startAt: { lte: to }, endAt: { gte: from } },
      include: {
        teacher: true,
        student: true,
        class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { startAt: { lte: to }, endAt: { gte: from } },
      include: { student: true, teacher: true },
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
  const teacherAppointmentConflicts = new Map<string, typeof appointments>();

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

  const sessionsByTeacher = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const tid = effectiveTeacherId(s);
    const arr = sessionsByTeacher.get(tid) ?? [];
    arr.push(s);
    sessionsByTeacher.set(tid, arr);
  }
  const apptsByTeacher = new Map<string, typeof appointments>();
  for (const a of appointments) {
    const arr = apptsByTeacher.get(a.teacherId) ?? [];
    arr.push(a);
    apptsByTeacher.set(a.teacherId, arr);
  }
  for (const [tid, appts] of apptsByTeacher.entries()) {
    const list = sessionsByTeacher.get(tid) ?? [];
    for (const s of list) {
      for (const a of appts) {
        if (a.startAt < s.endAt && a.endAt > s.startAt) {
          const arr = teacherAppointmentConflicts.get(s.id) ?? [];
          arr.push(a);
          teacherAppointmentConflicts.set(s.id, arr);
        }
      }
    }
  }

  const conflictSessions = sessions.filter(
    (s) =>
      (teacherConflicts.get(s.id)?.size ?? 0) > 0 ||
      (roomConflicts.get(s.id)?.size ?? 0) > 0 ||
      (teacherAppointmentConflicts.get(s.id)?.length ?? 0) > 0
  );
  const filteredConflicts = conflictSessions.filter((s) => {
    if (filterCourseId && s.class.courseId !== filterCourseId) return false;
    if (filterSubjectId && s.class.subjectId !== filterSubjectId) return false;
    return true;
  });

  const sessionMap = new Map(sessions.map((s) => [s.id, s]));
  const returnToBase = `/admin/conflicts?${new URLSearchParams({
    from: fromSafeStr,
    to: toSafeStr,
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
            <input name="from" type="date" defaultValue={fromSafeStr} style={{ marginLeft: 6 }} />
          </label>
          <label>
            {t(lang, "To", "到")}:
            <input name="to" type="date" defaultValue={toSafeStr} style={{ marginLeft: 6 }} />
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
            const conflictAppointments = teacherAppointmentConflicts.get(s.id) ?? [];
            const eligibleTeachers = teachers.filter((tch) => canTeachClass(tch, cls.courseId, cls.subjectId));
            const eligibleAppointmentTeachers = eligibleTeachers;
            const campusRooms = rooms.filter((r) => r.campusId === cls.campusId);
            const eligibleTeacherOptions = eligibleTeachers.map((x) => ({ id: x.id, name: x.name }));
            const campusRoomOptions = campusRooms.map((r) => ({ id: r.id, name: r.name, capacity: r.capacity }));
            const conflictTags = [
              conflictTeacherIds.length > 0 ? t(lang, "Teacher conflict", "老师冲突") : null,
              conflictRoomIds.length > 0 ? t(lang, "Room conflict", "教室冲突") : null,
              conflictAppointments.length > 0 ? t(lang, "Teacher appointment conflict", "老师约课冲突") : null,
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
                  <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <ClassTypeBadge capacity={cls.capacity} compact />
                    <span>
                      {cls.course.name}
                      {cls.subject ? ` / ${cls.subject.name}` : ""}
                      {cls.level ? ` / ${cls.level.name}` : ""} | {cls.campus.name} / {cls.room?.name ?? "(none)"}
                    </span>
                  </span>
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

                {(conflictTeacherIds.length > 0 || conflictRoomIds.length > 0 || conflictAppointments.length > 0) && (
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
                    {conflictAppointments.length > 0 ? (
                      <div style={{ marginTop: 6 }}>
                        {t(lang, "Teacher appointment conflict", "老师约课冲突")}:
                        <div style={{ marginTop: 4, color: "#8a4b08" }}>
                          {conflictAppointments.map((a) => (
                            <div key={a.id} style={{ borderTop: "1px dashed #fcd34d", paddingTop: 6, marginTop: 6 }}>
                              <div>
                                {fmtRange(a.startAt, a.endAt)} | {a.teacher?.name ?? "-"} | {a.student?.name ?? "-"}
                              </div>
                              <div style={{ marginTop: 6 }}>                                 <ConflictsAppointmentActionsClient                                   appointmentId={a.id}                                   classId={cls.id}                                   teachers={eligibleAppointmentTeachers.map((x) => ({ id: x.id, name: x.name }))}                                   defaultTeacherId={a.teacherId}                                   labels={{                                     changeTeacher: t(lang, "Change appointment teacher", "换约课老师"),                                     reasonOptional: t(lang, "Reason (optional)", "原因(可选)"),                                     confirmChange: t(lang, "Confirm Change Appointment Teacher", "确认更换约课老师"),                                     cancel: t(lang, "Cancel Appointment", "取消约课"),                                     errorPrefix: t(lang, "Error", "错误"),                                   }}                                 />                               </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  {conflictAppointments.length > 0 ? (
                    <div style={{ border: "1px solid #fde68a", borderRadius: 8, padding: 8, background: "#fffdf5" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 6 }}>
                        {t(lang, "A. Resolve Appointment", "A. 处理约课")}
                      </div>
                      <div style={{ fontSize: 12, color: "#92400e" }}>
                        {t(lang, "Use the controls above in appointment conflict section.", "请使用上方约课冲突区的操作。")}
                      </div>
                    </div>
                  ) : null}

                  <ConflictsSessionActionsClient
                    sessionId={s.id}
                    classId={cls.id}
                    eligibleTeachers={eligibleTeacherOptions}
                    defaultTeacherId={teacherId ?? ""}
                    rooms={campusRoomOptions}
                    defaultRoomId={cls.roomId ?? ""}
                    classCapacity={cls.capacity}
                    rangeFrom={fromSafeStr}
                    rangeTo={toSafeStr}
                    labels={{
                      errorPrefix: t(lang, "Error", "错误"),
                      changeSessionTeacher: t(lang, "B. Resolve Session", "B. 处理课次"),
                      reasonOptional: t(lang, "Reason (optional)", "原因(可选)"),
                      confirmChangeSessionTeacher: t(lang, "Confirm Change Session Teacher", "确认更换课次老师"),
                      noEligibleTeachers: t(lang, "No eligible teachers for this course.", "该课程暂无可选老师。"),
                      changeRoomClass: t(lang, "Change Room (class)", "换教室(班级)"),
                      noneRoom: t(lang, "(none)", "(无)"),
                      capacityLabel: t(lang, "capacity", "容量"),
                      confirm: t(lang, "Confirm", "确认"),
                      noRooms: t(lang, "No rooms available in this campus.", "该校区暂无教室。"),
                      cancelSession: t(lang, "Cancel Session", "取消课次"),
                      roomNote: t(lang, "Note: changing room affects the whole class (in selected date range).", "提示: 换教室会影响该班级(所选日期范围内)。"),
                      disabledRoomNotePrefix: t(lang, `Some rooms are disabled because class capacity is ${cls.capacity}.`, `部分教室已禁用: 当前班级容量为 ${cls.capacity}。`),
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
