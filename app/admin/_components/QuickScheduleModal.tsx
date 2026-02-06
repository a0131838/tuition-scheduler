"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NoticeBanner from "@/app/admin/_components/NoticeBanner";

type CourseOption = { id: string; name: string };

type SubjectOption = {
  id: string;
  name: string;
  courseName: string;
  courseId: string;
};

type LevelOption = {
  id: string;
  name: string;
  subjectId: string;
  subjectName: string;
  courseName: string;
};

type CampusOption = {
  id: string;
  name: string;
  isOnline: boolean;
};

type RoomOption = {
  id: string;
  name: string;
  campusId: string;
};

type Labels = {
  title: string;
  open: string;
  course: string;
  subject: string;
  level: string;
  campus: string;
  room: string;
  roomOptional: string;
  start: string;
  duration: string;
  find: string;
  close: string;
  teacher: string;
  status: string;
  action: string;
  available: string;
  noTeachers: string;
  chooseHint: string;
  schedule: string;
};

export default function QuickScheduleModal({
  studentId,
  month,
  quickSubjectId,
  quickLevelId,
  quickStartAt,
  quickDurationMin,
  quickCampusId,
  quickRoomId,
  subjects,
  levels,
  campuses,
  rooms,
  candidates,
  onSchedule,
  labels,
  openOnLoad,
  warning,
}: {
  studentId: string;
  month: string;
  quickSubjectId: string;
  quickLevelId: string;
  quickStartAt: string;
  quickDurationMin: number;
  quickCampusId: string;
  quickRoomId: string;
  subjects: SubjectOption[];
  levels: LevelOption[];
  campuses: CampusOption[];
  rooms: RoomOption[];
  candidates: { id: string; name: string; ok: boolean; reason?: string }[];
  onSchedule: (formData: FormData) => void;
  labels: Labels;
  openOnLoad: boolean;
  warning?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const courses = useMemo<CourseOption[]>(() => {
    const map = new Map<string, string>();
    for (const s of subjects) map.set(s.courseId, s.courseName);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [subjects]);
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState(quickSubjectId || "");
  const [levelId, setLevelId] = useState(quickLevelId || "");
  const [campusId, setCampusId] = useState(quickCampusId || "");
  const [roomId, setRoomId] = useState(quickRoomId || "");
  const campusIsOnline = useMemo(() => {
    if (!campusId) return false;
    return campuses.find((c) => c.id === campusId)?.isOnline ?? false;
  }, [campusId, campuses]);

  const levelOptions = useMemo(() => {
    if (!subjectId) return levels;
    return levels.filter((l) => l.subjectId === subjectId);
  }, [levels, subjectId]);

  const roomOptions = useMemo(() => {
    if (!campusId) return rooms;
    return rooms.filter((r) => r.campusId === campusId);
  }, [rooms, campusId]);

  useEffect(() => {
    if (openOnLoad) {
      dialogRef.current?.showModal();
    }
  }, [openOnLoad]);

  useEffect(() => {
    if (!courseId) return;
    const first = subjects.find((s) => s.courseId === courseId);
    if (first && first.id !== subjectId) setSubjectId(first.id);
    if (!first) setSubjectId("");
  }, [courseId, subjects, subjectId]);

  useEffect(() => {
    if (levelId && !levelOptions.some((l) => l.id === levelId)) {
      setLevelId("");
    }
  }, [levelId, levelOptions]);

  useEffect(() => {
    setSubjectId(quickSubjectId || "");
    setLevelId(quickLevelId || "");
    setCampusId(quickCampusId || "");
    setRoomId(quickRoomId || "");
    const quickCourseId = subjects.find((s) => s.id === quickSubjectId)?.courseId;
    const first = subjects.find((s) => s.courseId === (quickCourseId ?? courses[0]?.id ?? ""));
    setCourseId(first?.courseId ?? quickCourseId ?? courses[0]?.id ?? "");
  }, [quickSubjectId, quickLevelId, quickCampusId, quickRoomId, subjects, courses]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <button type="button" onClick={() => dialogRef.current?.showModal()}>
        {labels.open}
      </button>
      <dialog ref={dialogRef} style={{ padding: 16, borderRadius: 8, border: "1px solid #ddd" }}>
        <h3 style={{ marginTop: 0 }}>{labels.title}</h3>
        <form method="GET" action={`/admin/students/${studentId}`} style={{ display: "grid", gap: 10 }}>
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="quickOpen" value="1" />
          <label>
            {labels.course}:
            <select
              name="quickCourseId"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              style={{ marginLeft: 6, minWidth: 260 }}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {labels.subject}:
            <select
              name="quickSubjectId"
              value={subjectId}
              onChange={(e) => {
                const next = e.target.value;
                setSubjectId(next);
                if (levelId && !levels.some((l) => l.id === levelId && l.subjectId === next)) {
                  setLevelId("");
                }
              }}
              style={{ marginLeft: 6, minWidth: 260 }}
            >
              <option value="">{labels.subject}</option>
              {subjects
                .filter((s) => !courseId || s.courseId === courseId)
                .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.courseName} - {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {labels.level}:
            <select
              name="quickLevelId"
              value={levelId}
              onChange={(e) => setLevelId(e.target.value)}
              style={{ marginLeft: 6, minWidth: 260 }}
            >
              <option value="">{labels.level}</option>
              {levelOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.courseName} - {l.subjectName} - {l.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {labels.campus}:
            <select
              name="quickCampusId"
              value={campusId}
              onChange={(e) => {
                const next = e.target.value;
                setCampusId(next);
                if (next && roomId && !rooms.some((r) => r.id === roomId && r.campusId === next)) {
                  setRoomId("");
                }
              }}
              style={{ marginLeft: 6, minWidth: 220 }}
            >
              <option value="">{labels.campus}</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {labels.room}:
            <select
              name="quickRoomId"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              style={{ marginLeft: 6, minWidth: 220 }}
            >
              <option value="">{campusIsOnline ? `${labels.room} (${labels.roomOptional})` : labels.room}</option>
              {roomOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {labels.start}:
            <input
              name="quickStartAt"
              type="datetime-local"
              defaultValue={quickStartAt}
              style={{ marginLeft: 6 }}
            />
          </label>
          <label>
            {labels.duration}:
            <input
              name="quickDurationMin"
              type="number"
              min={15}
              step={15}
              defaultValue={String(quickDurationMin)}
              style={{ marginLeft: 6, width: 120 }}
            />
          </label>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => {
                dialogRef.current?.close();
              }}
            >
              {labels.close}
            </button>
            <button type="submit">{labels.find}</button>
          </div>
        </form>
        <div style={{ marginTop: 12 }}>
          {warning ? (
            <NoticeBanner type="warn" title={labels.status} message={warning} />
          ) : subjectId && campusId && (roomId || campusIsOnline) && quickStartAt ? (
            candidates.length === 0 ? (
              <div style={{ color: "#999" }}>{labels.noTeachers}</div>
            ) : (
              <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr style={{ background: "#f5f5f5" }}>
                    <th align="left">{labels.teacher}</th>
                    <th align="left">{labels.status}</th>
                    <th align="left">{labels.action}</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
                      <td>{c.name}</td>
                      <td style={{ color: c.ok ? "#0a7" : "#b00", fontWeight: c.ok ? 600 : 400 }}>
                        {c.ok ? labels.available : c.reason}
                      </td>
                      <td>
                        {c.ok ? (
                          <form action={onSchedule} style={{ display: "inline" }}>
                            <input type="hidden" name="month" value={month} />
                            <input type="hidden" name="quickOpen" value="1" />
                            <input type="hidden" name="teacherId" value={c.id} />
                            <input type="hidden" name="subjectId" value={subjectId} />
                            <input type="hidden" name="levelId" value={levelId} />
                            <input type="hidden" name="campusId" value={campusId} />
                            <input type="hidden" name="roomId" value={roomId} />
                            <input type="hidden" name="startAt" value={quickStartAt} />
                            <input type="hidden" name="durationMin" value={String(quickDurationMin)} />
                            <button type="submit">{labels.schedule}</button>
                          </form>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            <div style={{ color: "#999" }}>{labels.chooseHint}</div>
          )}
        </div>
      </dialog>
    </div>
  );
}
