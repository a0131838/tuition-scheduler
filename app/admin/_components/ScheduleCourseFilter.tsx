"use client";

import { useEffect, useMemo, useState } from "react";

type CourseOption = { id: string; name: string };
type SubjectOption = { id: string; name: string; courseId: string; courseName: string };

export default function ScheduleCourseFilter({
  courses,
  subjects,
  initialCourseId,
  initialSubjectId,
  labels,
}: {
  courses: CourseOption[];
  subjects: SubjectOption[];
  initialCourseId: string;
  initialSubjectId: string;
  labels: {
    courseAll: string;
    subjectAll: string;
    course: string;
    subject: string;
  };
}) {
  const [courseId, setCourseId] = useState(initialCourseId);
  const [subjectId, setSubjectId] = useState(initialSubjectId);

  const subjectOptions = useMemo(() => {
    if (!courseId) return subjects;
    return subjects.filter((s) => s.courseId === courseId);
  }, [courseId, subjects]);

  useEffect(() => {
    if (courseId && subjectId && !subjects.some((s) => s.id === subjectId && s.courseId === courseId)) {
      setSubjectId("");
    }
  }, [courseId, subjectId, subjects]);

  return (
    <>
      <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ color: "#666" }}>{labels.course}</span>
        <select name="courseId" value={courseId} onChange={(e) => setCourseId(e.target.value)} style={{ minWidth: 200 }}>
          <option value="">{labels.courseAll}</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ color: "#666" }}>{labels.subject}</span>
        <select name="subjectId" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} style={{ minWidth: 220 }}>
          <option value="">{labels.subjectAll}</option>
          {subjectOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.courseName} - {s.name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
