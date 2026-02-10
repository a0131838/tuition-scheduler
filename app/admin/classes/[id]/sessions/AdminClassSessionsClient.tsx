"use client";

import { useEffect, useMemo, useState } from "react";
import SimpleModal from "../../../_components/SimpleModal";
import NoticeBanner from "../../../_components/NoticeBanner";
import BlurTimeInput from "@/app/_components/BlurTimeInput";
import ClassTypeBadge from "@/app/_components/ClassTypeBadge";

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

export default function AdminClassSessionsClient({
  classId,
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

  const defaultStartDate = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);
  const weekdayDefault = useMemo(() => {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 7 : jsDay;
  }, []);

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
                  <select name="studentId" defaultValue="" style={{ marginLeft: 8, minWidth: 240 }}>
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
                <input name="startAt" type="datetime-local" required style={{ marginLeft: 8 }} />
              </label>
              <label>
                {labels.durationMin}:
                <input name="durationMin" type="number" min={15} step={15} defaultValue={60} style={{ marginLeft: 8 }} />
              </label>
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
                  <select name="studentId" defaultValue="" style={{ marginLeft: 8, minWidth: 240 }}>
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
                <input name="startDate" type="date" defaultValue={defaultStartDate} style={{ marginLeft: 8 }} />
              </label>
              <label>
                {labels.weekday}:
                <select name="weekday" defaultValue={weekdayDefault} style={{ marginLeft: 8, minWidth: 200 }}>
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
                <BlurTimeInput name="time" defaultValue="19:00" style={{ marginLeft: 8 }} />
              </label>
              <label>
                {labels.durationMin}:
                <input name="durationMin" type="number" min={15} step={15} defaultValue={60} style={{ marginLeft: 8 }} />
              </label>
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

