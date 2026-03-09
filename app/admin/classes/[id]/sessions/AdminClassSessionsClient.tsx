"use client";

import { useEffect, useMemo, useState } from "react";
import SimpleModal from "../../../_components/SimpleModal";
import NoticeBanner from "../../../_components/NoticeBanner";
import StudentPackageBalanceCard from "../../../_components/StudentPackageBalanceCard";
import BlurTimeInput from "@/app/_components/BlurTimeInput";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";
import DateTimeSplitInput from "@/app/_components/DateTimeSplitInput";

type EnrollmentRow = { studentId: string; studentName: string };
type TeacherOption = { id: string; name: string };

type SessionRow = {
  id: string;
  startAt: string; // ISO
  endAt: string; // ISO
  teacherId: string | null;
  teacherName: string | null;
  studentId: string | null;
  studentName: string | null;
};

function fmtSessionRange(startAtIso: string, endAtIso: string) {
  const startAt = new Date(startAtIso);
  const endAt = new Date(endAtIso);
  return `${startAt.toLocaleString()} - ${endAt.toLocaleTimeString()}`;
}

function toLocalDateTimeInput(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

function durationMinutes(startIso: string, endIso: string) {
  const s = new Date(startIso).getTime();
  const e = new Date(endIso).getTime();
  const mins = Math.round((e - s) / 60000);
  return Number.isFinite(mins) && mins > 0 ? mins : 60;
}

function firstWeeklyOccurrence(startDate: string, weekday: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{2}:\d{2}$/.test(time)) return "";
  const [year, month, day] = startDate.split("-").map(Number);
  const targetWeekday = Number(weekday);
  if (!Number.isFinite(targetWeekday) || targetWeekday < 1 || targetWeekday > 7) return "";
  const base = new Date(year, month - 1, day, 0, 0, 0, 0);
  const jsTarget = targetWeekday === 7 ? 0 : targetWeekday;
  const diff = (jsTarget - base.getDay() + 7) % 7;
  base.setDate(base.getDate() + diff);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, "0");
  const dd = String(base.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}T${time}`;
}

export default function AdminClassSessionsClient({
  classId,
  classCourseId,
  classCapacity,
  classTeacherId,
  classTeacherName,
  courseLabel,
  campusName,
  roomName,
  enrollments,
  eligibleTeachers,
  initialSessions,
  labels,
}: {
  classId: string;
  classCourseId: string;
  classCapacity: number;
  classTeacherId: string;
  classTeacherName: string;
  courseLabel: string;
  campusName: string;
  roomName: string;
  enrollments: EnrollmentRow[];
  eligibleTeachers: TeacherOption[];
  initialSessions: SessionRow[];
  labels: {
    rejected: string;
    ok: string;
    error: string;
    createOne: string;
    generateWeekly: string;
    student: string;
    selectStudent: string;
    start: string;
    durationMin: string;
    create: string;
    startDateFrom: string;
    weekday: string;
    time: string;
    weeks: string;
    onConflict: string;
    rejectImmediately: string;
    skipConflicts: string;
    generate: string;
    existing: string;
    none: string;
    attendance: string;
    delete: string;
    replaceTeacher: string;
    reschedule: string;
    rescheduleScope: string;
    newStart: string;
    rescheduleDurationMin: string;
    scope: string;
    thisSessionOnly: string;
    futureSessions: string;
    reasonOptional: string;
    confirm: string;
    replaced: string;
    assignStudent: string;
    totalSessions: string;
    course: string;
    teacher: string;
    campus: string;
    room: string;
    notAssigned: string;
    replacedTag: string;
  };
}) {
  const [sessions, setSessions] = useState<SessionRow[]>(initialSessions);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [createStudentId, setCreateStudentId] = useState("");
  const [createStartAt, setCreateStartAt] = useState("");
  const [createDurationMin, setCreateDurationMin] = useState("60");
  const [weeklyStudentId, setWeeklyStudentId] = useState("");
  const [weeklyStartDate, setWeeklyStartDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [weeklyWeekday, setWeeklyWeekday] = useState(String(new Date().getDay() === 0 ? 7 : new Date().getDay()));
  const [weeklyTime, setWeeklyTime] = useState("19:00");
  const [weeklyDurationMin, setWeeklyDurationMin] = useState("60");
  const weeklyPreviewStartAt = useMemo(
    () => firstWeeklyOccurrence(weeklyStartDate, weeklyWeekday, weeklyTime),
    [weeklyStartDate, weeklyWeekday, weeklyTime]
  );

  async function reloadSessions() {
    const res = await fetch(`/api/admin/classes/${encodeURIComponent(classId)}/sessions`);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      throw new Error(String(data?.message ?? "Failed to load sessions"));
    }
    setSessions(
      (data.sessions as any[]).map((s) => ({
        id: s.id,
        startAt: s.startAt,
        endAt: s.endAt,
        teacherId: s.teacherId,
        teacherName: s.teacherName,
        studentId: s.studentId,
        studentName: s.studentName,
      }))
    );
  }

  async function createOne(close: () => void, form: { startAt: string; durationMin: number; studentId?: string }) {
    setErr("");
    setMsg("");
    const res = await fetch(`/api/admin/classes/${encodeURIComponent(classId)}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setErr(String(data?.message ?? "Create failed"));
      return;
    }
    await reloadSessions();
    setMsg("OK");
    close();
  }

  async function generateWeekly(close: () => void, form: any) {
    setErr("");
    setMsg("");
    const res = await fetch(`/api/admin/classes/${encodeURIComponent(classId)}/sessions/generate-weekly`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setErr(String(data?.message ?? "Generate failed"));
      return;
    }
    await reloadSessions();
    setMsg(String(data?.msg ?? "OK"));
    close();
  }

  async function del(sessionId: string) {
    if (!confirm("Delete session?")) return;
    setErr("");
    setMsg("");
    const res = await fetch(`/api/admin/classes/${encodeURIComponent(classId)}/sessions`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setErr(String(data?.message ?? "Delete failed"));
      return;
    }
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setMsg("OK");
  }

  async function replaceTeacher(form: { sessionId: string; newTeacherId: string; scope: string; reason?: string }) {
    setErr("");
    setMsg("");
    const res = await fetch(`/api/admin/classes/${encodeURIComponent(classId)}/sessions/replace-teacher`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setErr(String(data?.message ?? "Replace failed"));
      return;
    }
    await reloadSessions();
    setMsg(`OK (${data.replaced})`);
  }

  async function reschedule(form: { sessionId: string; startAt: string; durationMin: number; scope: string }) {
    setErr("");
    setMsg("");
    const res = await fetch(`/api/admin/classes/${encodeURIComponent(classId)}/sessions/reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setErr(String(data?.message ?? "Reschedule failed"));
      return;
    }
    await reloadSessions();
    setMsg(`OK (${data.rescheduled})`);
  }

  async function assignStudent(form: { sessionId: string; studentId: string }) {
    setErr("");
    setMsg("");
    const res = await fetch(`/api/admin/classes/${encodeURIComponent(classId)}/sessions/assign-student`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setErr(String(data?.message ?? "Assign failed"));
      return;
    }
    setSessions((prev) =>
      prev.map((s) => (s.id === form.sessionId ? { ...s, studentId: data.studentId, studentName: data.studentName } : s))
    );
    setMsg("OK");
  }

  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  return (
    <div>
      {err ? <NoticeBanner type="error" title={labels.rejected} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={labels.ok} message={msg} /> : null}

      <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <b>{labels.course}:</b>
          <ClassTypeBadge capacity={classCapacity} compact />
          <span>{courseLabel}</span>
        </div>
        <div>
          <b>{labels.teacher}:</b> {classTeacherName}
        </div>
        <div>
          <b>{labels.campus}:</b> {campusName}
        </div>
        <div>
          <b>{labels.room}:</b> {roomName}
        </div>
        <div style={{ marginTop: 8 }}>
          <b>{labels.totalSessions}:</b> {sessions.length}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <SimpleModal buttonLabel={labels.createOne} title={labels.createOne}>
          {({ close }) => (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const startAt = String(fd.get("startAt") ?? "");
                const durationMin = Number(fd.get("durationMin") ?? 60);
                const studentId = String(fd.get("studentId") ?? "");
                createOne(close, { startAt, durationMin, studentId });
              }}
              style={{ display: "grid", gap: 10, maxWidth: 520 }}
            >
              {classCapacity === 1 && (
                <label>
                  {labels.student}:
                  <select
                    name="studentId"
                    value={createStudentId}
                    onChange={(e) => setCreateStudentId(e.target.value)}
                    style={{ marginLeft: 8, minWidth: 240 }}
                  >
                    <option value="">{labels.selectStudent}</option>
                    {enrollments.map((e) => (
                      <option key={e.studentId} value={e.studentId}>
                        {e.studentName}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                {labels.start}:
                <DateTimeSplitInput
                  name="startAt"
                  required
                  value={createStartAt}
                  onChange={setCreateStartAt}
                  wrapperStyle={{ marginLeft: 8 }}
                />
              </label>
              <label>
                {labels.durationMin}:
                <input
                  name="durationMin"
                  type="number"
                  min={15}
                  step={15}
                  value={createDurationMin}
                  onChange={(e) => setCreateDurationMin(e.target.value)}
                  style={{ marginLeft: 8 }}
                />
              </label>
              {classCapacity === 1 && createStudentId ? (
                <StudentPackageBalanceCard
                  studentId={createStudentId}
                  courseId={classCourseId}
                  startAt={createStartAt}
                  durationMin={Number(createDurationMin || 60)}
                  kind="oneOnOne"
                />
              ) : null}
              <button type="submit">{labels.create}</button>
            </form>
          )}
        </SimpleModal>

        <SimpleModal buttonLabel={labels.generateWeekly} title={labels.generateWeekly}>
          {({ close }) => (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                generateWeekly(close, {
                  studentId: String(fd.get("studentId") ?? ""),
                  startDate: String(fd.get("startDate") ?? ""),
                  weekday: Number(fd.get("weekday") ?? 1),
                  time: String(fd.get("time") ?? "19:00"),
                  durationMin: Number(fd.get("durationMin") ?? 60),
                  weeks: Number(fd.get("weeks") ?? 8),
                  onConflict: String(fd.get("onConflict") ?? "reject"),
                });
              }}
              style={{ display: "grid", gap: 10, maxWidth: 720 }}
            >
              {classCapacity === 1 && (
                <label>
                  {labels.student}:
                  <select
                    name="studentId"
                    value={weeklyStudentId}
                    onChange={(e) => setWeeklyStudentId(e.target.value)}
                    style={{ marginLeft: 8, minWidth: 240 }}
                  >
                    <option value="">{labels.selectStudent}</option>
                    {enrollments.map((e) => (
                      <option key={e.studentId} value={e.studentId}>
                        {e.studentName}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                {labels.startDateFrom}:
                <input
                  name="startDate"
                  type="date"
                  value={weeklyStartDate}
                  onChange={(e) => setWeeklyStartDate(e.target.value)}
                  style={{ marginLeft: 8 }}
                />
              </label>
              <label>
                {labels.weekday}:
                <select
                  name="weekday"
                  value={weeklyWeekday}
                  onChange={(e) => setWeeklyWeekday(e.target.value)}
                  style={{ marginLeft: 8, minWidth: 200 }}
                >
                  <option value={1}>Mon</option>
                  <option value={2}>Tue</option>
                  <option value={3}>Wed</option>
                  <option value={4}>Thu</option>
                  <option value={5}>Fri</option>
                  <option value={6}>Sat</option>
                  <option value={7}>Sun</option>
                </select>
              </label>
              <label>
                {labels.time}:
                <BlurTimeInput name="time" value={weeklyTime} onValueChange={setWeeklyTime} style={{ marginLeft: 8 }} />
              </label>
              <label>
                {labels.durationMin}:
                <input
                  name="durationMin"
                  type="number"
                  min={15}
                  step={15}
                  value={weeklyDurationMin}
                  onChange={(e) => setWeeklyDurationMin(e.target.value)}
                  style={{ marginLeft: 8 }}
                />
              </label>
              {classCapacity === 1 && weeklyStudentId ? (
                <StudentPackageBalanceCard
                  studentId={weeklyStudentId}
                  courseId={classCourseId}
                  startAt={weeklyPreviewStartAt}
                  durationMin={Number(weeklyDurationMin || 60)}
                  kind="oneOnOne"
                />
              ) : null}
              <label>
                {labels.weeks}:
                <input name="weeks" type="number" min={1} max={52} defaultValue={8} style={{ marginLeft: 8 }} />
              </label>
              <label>
                {labels.onConflict}:
                <select name="onConflict" defaultValue="reject" style={{ marginLeft: 8, minWidth: 220 }}>
                  <option value="reject">{labels.rejectImmediately}</option>
                  <option value="skip">{labels.skipConflicts}</option>
                </select>
              </label>
              <button type="submit">{labels.generate}</button>
            </form>
          )}
        </SimpleModal>
      </div>

      <h3>{labels.existing}</h3>
      {sessions.length === 0 ? (
        <div style={{ color: "#999" }}>{labels.none}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          {sessions.map((s) => (
            <div key={s.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, background: "#fff" }}>
              <div style={{ fontWeight: 700 }}>{fmtSessionRange(s.startAt, s.endAt)}</div>
              <div style={{ marginTop: 4 }}>
                <ClassTypeBadge capacity={classCapacity} compact />
              </div>
              {classCapacity === 1 && (
                <div style={{ marginTop: 4, color: s.studentId ? "#0f172a" : "#b91c1c", fontSize: 12 }}>
                  {labels.student}: {s.studentName ?? labels.notAssigned}
                </div>
              )}
              <div style={{ marginTop: 4, color: "#666", fontSize: 12 }}>
                {labels.teacher}: {s.teacherName ?? classTeacherName}
              </div>
              {s.teacherId && s.teacherId !== classTeacherId ? (
                <div style={{ color: "#b00", fontSize: 12, marginTop: 4 }}>{labels.replacedTag}</div>
              ) : null}

              <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
                <a href={`/admin/sessions/${s.id}/attendance`}>{labels.attendance}</a>
                <button type="button" onClick={() => del(s.id)}>
                  {labels.delete}
                </button>
              </div>

              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: "pointer" }}>{labels.replaceTeacher}</summary>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    replaceTeacher({
                      sessionId: s.id,
                      newTeacherId: String(fd.get("newTeacherId") ?? ""),
                      scope: String(fd.get("scope") ?? "single"),
                      reason: String(fd.get("reason") ?? ""),
                    });
                  }}
                  style={{ display: "grid", gap: 6, marginTop: 6 }}
                >
                  <label>
                    {labels.replaceTeacher}:
                    <select name="newTeacherId" defaultValue={s.teacherId ?? classTeacherId} style={{ marginLeft: 6, minWidth: 200 }}>
                      {eligibleTeachers.map((tch) => (
                        <option key={tch.id} value={tch.id}>
                          {tch.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {labels.scope}:
                    <select name="scope" defaultValue="single" style={{ marginLeft: 6 }}>
                      <option value="single">{labels.thisSessionOnly}</option>
                      <option value="future">{labels.futureSessions}</option>
                    </select>
                  </label>
                  <input name="reason" type="text" placeholder={labels.reasonOptional} style={{ minWidth: 200 }} />
                  <button type="submit">{labels.confirm}</button>
                </form>
              </details>

              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: "pointer" }}>{labels.reschedule}</summary>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    reschedule({
                      sessionId: s.id,
                      startAt: String(fd.get("startAt") ?? ""),
                      durationMin: Number(fd.get("durationMin") ?? durationMinutes(s.startAt, s.endAt)),
                      scope: String(fd.get("scope") ?? "single"),
                    });
                  }}
                  style={{ display: "grid", gap: 6, marginTop: 6 }}
                >
                  <label>
                    {labels.newStart}:
                    <DateTimeSplitInput
                      name="startAt"
                      defaultValue={toLocalDateTimeInput(s.startAt)}
                      required
                      wrapperStyle={{ marginLeft: 6 }}
                    />
                  </label>
                  <label>
                    {labels.rescheduleDurationMin}:
                    <input
                      name="durationMin"
                      type="number"
                      min={15}
                      step={15}
                      defaultValue={durationMinutes(s.startAt, s.endAt)}
                      style={{ marginLeft: 6, width: 120 }}
                    />
                  </label>
                  <label>
                    {labels.rescheduleScope}:
                    <select name="scope" defaultValue="single" style={{ marginLeft: 6 }}>
                      <option value="single">{labels.thisSessionOnly}</option>
                      <option value="future">{labels.futureSessions}</option>
                    </select>
                  </label>
                  <button type="submit">{labels.confirm}</button>
                </form>
              </details>

              {classCapacity === 1 && !s.studentId && enrollments.length > 0 && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: "pointer" }}>{labels.assignStudent}</summary>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      const studentId = String(fd.get("studentId") ?? "");
                      if (!studentId) return;
                      assignStudent({ sessionId: s.id, studentId });
                    }}
                    style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}
                  >
                    <select name="studentId" defaultValue="">
                      <option value="">{labels.selectStudent}</option>
                      {enrollments.map((e) => (
                        <option key={e.studentId} value={e.studentId}>
                          {e.studentName}
                        </option>
                      ))}
                    </select>
                    <button type="submit">{labels.confirm}</button>
                  </form>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
