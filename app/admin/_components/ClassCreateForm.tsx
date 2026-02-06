"use client";

import { useMemo, useState, useEffect } from "react";

type CourseOption = { id: string; name: string };
type SubjectOption = { id: string; name: string; courseId: string; courseName: string };
type LevelOption = { id: string; name: string; subjectId: string; courseName: string; subjectName: string };
type TeacherOption = { id: string; name: string };
type CampusOption = { id: string; name: string };
type RoomOption = { id: string; name: string; campusName: string };

export default function ClassCreateForm(props: {
  action: (formData: FormData) => void;
  courses: CourseOption[];
  subjects: SubjectOption[];
  levels: LevelOption[];
  teachers: TeacherOption[];
  campuses: CampusOption[];
  rooms: RoomOption[];
  labels: {
    course: string;
    subject: string;
    level: string;
    teacher: string;
    campus: string;
    roomOptional: string;
    capacity: string;
    create: string;
    none: string;
  };
}) {
  const { courses, subjects, levels, teachers, campuses, rooms, action, labels } = props;
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
  const filteredLevels = useMemo(
    () => levels.filter((l) => l.subjectId === subjectId),
    [levels, subjectId]
  );
  useEffect(() => {
    if (levelId && !filteredLevels.some((l) => l.id === levelId)) {
      setLevelId("");
    }
  }, [levelId, filteredLevels]);

  return (
    <form action={action} style={{ display: "grid", gap: 8, maxWidth: 860 }}>
      <label>
        {labels.course}:
        <select
          name="courseId"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          style={{ marginLeft: 8, minWidth: 360 }}
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
          name="subjectId"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          style={{ marginLeft: 8, minWidth: 360 }}
        >
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
          name="levelId"
          value={levelId}
          onChange={(e) => setLevelId(e.target.value)}
          style={{ marginLeft: 8, minWidth: 360 }}
        >
          <option value="">{labels.none}</option>
          {filteredLevels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.courseName} - {l.subjectName} - {l.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        {labels.teacher}:
        <select name="teacherId" defaultValue={teachers[0]?.id ?? ""} style={{ marginLeft: 8, minWidth: 320 }}>
          {teachers.map((tch) => (
            <option key={tch.id} value={tch.id}>
              {tch.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        {labels.campus}:
        <select name="campusId" defaultValue={campuses[0]?.id ?? ""} style={{ marginLeft: 8, minWidth: 320 }}>
          {campuses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        {labels.roomOptional}:
        <select name="roomId" defaultValue="" style={{ marginLeft: 8, minWidth: 420 }}>
          <option value="">{labels.none}</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} - {r.campusName}
            </option>
          ))}
        </select>
      </label>

      <label>
        {labels.capacity}:
        <input name="capacity" type="number" min={1} defaultValue={6} style={{ marginLeft: 8, width: 120 }} />
      </label>

      <button type="submit" disabled={subjects.length === 0 || teachers.length === 0 || campuses.length === 0}>
        {labels.create}
      </button>
    </form>
  );
}
