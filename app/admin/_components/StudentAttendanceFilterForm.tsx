"use client";

import { useEffect, useMemo, useState } from "react";

type CourseOption = { id: string; name: string };
type SubjectOption = { id: string; name: string; courseId: string; courseName: string };
type LevelOption = { id: string; name: string; subjectId: string; subjectName: string; courseName: string };
type TeacherOption = { id: string; name: string };

export default function StudentAttendanceFilterForm({
  studentId,
  courses,
  subjects,
  levels,
  teachers,
  initial,
  labels,
}: {
  studentId: string;
  courses: CourseOption[];
  subjects: SubjectOption[];
  levels: LevelOption[];
  teachers: TeacherOption[];
  initial: {
    courseId: string;
    subjectId: string;
    levelId: string;
    teacherId: string;
    status: string;
    days: string;
    limit: string;
  };
  labels: {
    course: string;
    subject: string;
    level: string;
    courseAll: string;
    subjectAll: string;
    levelAll: string;
    teacher: string;
    teacherAll: string;
    status: string;
    statusAll: string;
    recentDays: string;
    limit: string;
    apply: string;
    clear: string;
  };
}) {
  const [courseId, setCourseId] = useState(initial.courseId);
  const [subjectId, setSubjectId] = useState(initial.subjectId);
  const [levelId, setLevelId] = useState(initial.levelId);

  const subjectOptions = useMemo(() => {
    if (!courseId) return subjects;
    return subjects.filter((s) => s.courseId === courseId);
  }, [courseId, subjects]);

  const levelOptions = useMemo(() => {
    if (!subjectId) return levels;
    return levels.filter((l) => l.subjectId === subjectId);
  }, [levels, subjectId]);

  useEffect(() => {
    if (courseId && subjectId && !subjects.some((s) => s.id === subjectId && s.courseId === courseId)) {
      setSubjectId("");
    }
  }, [courseId, subjectId, subjects]);

  useEffect(() => {
    if (levelId && !levelOptions.some((l) => l.id === levelId)) {
      setLevelId("");
    }
  }, [levelId, levelOptions]);

  return (
    <form method="GET" style={{ display: "grid", gap: 8, maxWidth: 820, marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <label>
          {labels.course}:
          <select name="courseId" value={courseId} onChange={(e) => setCourseId(e.target.value)} style={{ marginLeft: 6, minWidth: 200 }}>
            <option value="">{labels.courseAll}</option>
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
            onChange={(e) => {
              const next = e.target.value;
              setSubjectId(next);
              if (levelId && !levels.some((l) => l.id === levelId && l.subjectId === next)) {
                setLevelId("");
              }
            }}
            style={{ marginLeft: 6, minWidth: 220 }}
          >
            <option value="">{labels.subjectAll}</option>
            {subjectOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.courseName} - {s.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          {labels.level}:
          <select name="levelId" value={levelId} onChange={(e) => setLevelId(e.target.value)} style={{ marginLeft: 6, minWidth: 200 }}>
            <option value="">{labels.levelAll}</option>
            {levelOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.courseName} - {l.subjectName} - {l.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          {labels.teacher}:
          <select name="teacherId" defaultValue={initial.teacherId} style={{ marginLeft: 6, minWidth: 180 }}>
            <option value="">{labels.teacherAll}</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          {labels.status}:
          <select name="status" defaultValue={initial.status} style={{ marginLeft: 6 }}>
            <option value="">{labels.statusAll}</option>
            <option value="UNMARKED">UNMARKED</option>
            <option value="PRESENT">PRESENT</option>
            <option value="ABSENT">ABSENT</option>
            <option value="LATE">LATE</option>
            <option value="EXCUSED">EXCUSED</option>
          </select>
        </label>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <label>
          {labels.recentDays}:
          <input name="days" type="number" min={0} defaultValue={initial.days} placeholder="e.g. 30" style={{ marginLeft: 6, width: 120 }} />
        </label>
        <label>
          {labels.limit}:
          <input name="limit" type="number" min={1} max={500} defaultValue={initial.limit} style={{ marginLeft: 6, width: 120 }} />
        </label>
        <button type="submit">{labels.apply}</button>
        <a href={`/admin/students/${studentId}`}>{labels.clear}</a>
      </div>
    </form>
  );
}
