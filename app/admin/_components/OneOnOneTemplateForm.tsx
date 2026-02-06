"use client";

import { useEffect, useMemo, useState } from "react";

type CourseOption = { id: string; name: string };
type SubjectOption = { id: string; name: string; courseId: string; courseName: string };
type LevelOption = { id: string; name: string; subjectId: string; courseName: string; subjectName: string };
type StudentOption = { id: string; name: string };
type CampusOption = { id: string; name: string };
type RoomOption = { id: string; name: string; campusName: string };

export default function OneOnOneTemplateForm(props: {
  action: (formData: FormData) => void;
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
  const { courses, subjects, levels, students, campuses, rooms, labels, weekdays, action } = props;
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState(
    subjects.find((s) => s.courseId === (courses[0]?.id ?? ""))?.id ?? subjects[0]?.id ?? ""
  );
  const [levelId, setLevelId] = useState("");

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

  return (
    <form action={action} style={{ display: "grid", gap: 8, maxWidth: 900 }}>
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
        <select name="campusId" defaultValue="">
          <option value="">{labels.campus}</option>
          {campuses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="roomId" defaultValue="">
          <option value="">{labels.roomOptional}</option>
          {rooms.map((r) => (
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
        <input name="startTime" type="time" defaultValue="16:00" />
        <input name="durationMin" type="number" min={15} step={15} defaultValue={60} style={{ width: 120 }} />
        <span style={{ color: "#666" }}>{labels.durationMin}</span>
        <button type="submit">{labels.add}</button>
      </div>
    </form>
  );
}
