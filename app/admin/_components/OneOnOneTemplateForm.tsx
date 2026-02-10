"use client";

import { useEffect, useMemo, useState } from "react";
import BlurTimeInput from "@/app/_components/BlurTimeInput";
import { useRouter } from "next/navigation";

type CourseOption = { id: string; name: string };
type SubjectOption = { id: string; name: string; courseId: string; courseName: string };
type LevelOption = { id: string; name: string; subjectId: string; courseName: string; subjectName: string };
type StudentOption = { id: string; name: string };
type CampusOption = { id: string; name: string };
type RoomOption = { id: string; name: string; campusName: string; campusId: string };

export default function OneOnOneTemplateForm(props: {
  teacherId: string;
  courses: CourseOption[];
  subjects: SubjectOption[];
  levels: LevelOption[];
  students: StudentOption[];
  campuses: CampusOption[];
  rooms: RoomOption[];
  labels: {
    student: string;
    course: string;
    subject: string;
    levelOptional: string;
    campus: string;
    roomOptional: string;
    weekday: string;
    startTime: string;
    durationMin: string;
    add: string;
    none: string;
  };
  weekdays: string[];
}) {
  const { courses, subjects, levels, students, campuses, rooms, labels, weekdays, teacherId } = props;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState(
    subjects.find((s) => s.courseId === (courses[0]?.id ?? ""))?.id ?? subjects[0]?.id ?? ""
  );
  const [levelId, setLevelId] = useState("");
  const [campusId, setCampusId] = useState(campuses[0]?.id ?? "");
  const [roomId, setRoomId] = useState("");

  useEffect(() => {
    if (!courseId) return;
    const first = subjects.find((s) => s.courseId === courseId);
    if (first && first.id !== subjectId) setSubjectId(first.id);
    if (!first) setSubjectId("");
  }, [courseId, subjects, subjectId]);

  const filteredLevels = useMemo(() => {
    if (!subjectId) return [];
    return levels.filter((l) => l.subjectId === subjectId);
  }, [levels, subjectId]);

  useEffect(() => {
    if (levelId && !filteredLevels.some((l) => l.id === levelId)) {
      setLevelId("");
    }
  }, [filteredLevels, levelId]);
  const filteredRooms = useMemo(() => {
    if (!campusId) return rooms;
    return rooms.filter((r) => r.campusId === campusId);
  }, [rooms, campusId]);
  useEffect(() => {
    if (roomId && !filteredRooms.some((r) => r.id === roomId)) {
      setRoomId("");
    }
  }, [roomId, filteredRooms]);

  return (
    <form
      style={{ display: "grid", gap: 8, maxWidth: 900 }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setErr("");
        setBusy(true);
        try {
          const fd = new FormData(e.currentTarget);
          const payload = {
            studentId: String(fd.get("studentId") ?? ""),
            subjectId: String(fd.get("subjectId") ?? ""),
            levelId: String(fd.get("levelId") ?? ""),
            campusId: String(fd.get("campusId") ?? ""),
            roomId: String(fd.get("roomId") ?? ""),
            weekday: String(fd.get("weekday") ?? ""),
            startTime: String(fd.get("startTime") ?? ""),
            durationMin: String(fd.get("durationMin") ?? ""),
          };

          const res = await fetch(`/api/admin/teachers/${encodeURIComponent(teacherId)}/one-on-one-templates`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = (await res.json().catch(() => null)) as any;
          if (!res.ok || !data?.ok) {
            setErr(String(data?.message ?? `Request failed (${res.status})`));
            return;
          }

          (e.currentTarget as HTMLFormElement).reset();
          const y = window.scrollY;
          router.refresh();
          requestAnimationFrame(() => window.scrollTo(0, y));
        } finally {
          setBusy(false);
        }
      }}
    >
      {err ? <div style={{ color: "#b00" }}>{err}</div> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select name="studentId" defaultValue="">
          <option value="">{labels.student}</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="courseId" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="subjectId" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          {subjects
            .filter((s) => !courseId || s.courseId === courseId)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.courseName} - {s.name}
              </option>
            ))}
        </select>
        <select name="levelId" value={levelId} onChange={(e) => setLevelId(e.target.value)}>
          <option value="">{labels.levelOptional}</option>
          {filteredLevels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.courseName} - {l.subjectName} - {l.name}
            </option>
          ))}
        </select>
        <select name="campusId" value={campusId} onChange={(e) => setCampusId(e.target.value)}>
          <option value="">{labels.campus}</option>
          {campuses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="roomId" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          <option value="">{labels.roomOptional}</option>
          {filteredRooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.campusName})
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select name="weekday" defaultValue="1">
          {weekdays.map((w, i) => (
            <option key={w} value={i}>
              {w}
            </option>
          ))}
        </select>
        <BlurTimeInput name="startTime" defaultValue="16:00" />
        <input name="durationMin" type="number" min={15} step={15} defaultValue={60} style={{ width: 120 }} />
        <span style={{ color: "#666" }}>{labels.durationMin}</span>
        <button type="submit" disabled={busy}>
          {busy ? `${labels.add}...` : labels.add}
        </button>
      </div>
    </form>
  );
}
