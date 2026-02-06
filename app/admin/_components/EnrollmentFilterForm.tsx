"use client";

import { useEffect, useMemo, useState } from "react";

type CourseOption = { id: string; name: string };
type SubjectOption = { id: string; name: string; courseId: string; courseName: string };
type LevelOption = { id: string; name: string; subjectId: string; subjectName: string; courseName: string };
type TeacherOption = { id: string; name: string };
type CampusOption = { id: string; name: string };

export default function EnrollmentFilterForm({
  courses,
  subjects,
  levels,
  teachers,
  campuses,
  initial,
  labels,
}: {
  courses: CourseOption[];
  subjects: SubjectOption[];
  levels: LevelOption[];
  teachers: TeacherOption[];
  campuses: CampusOption[];
  initial: {
    q: string;
    courseId: string;
    subjectId: string;
    levelId: string;
    teacherId: string;
    campusId: string;
    classType: string;
  };
  labels: {
    searchPlaceholder: string;
    courseAll: string;
    subjectAll: string;
    levelAll: string;
    teacherAll: string;
    campusAll: string;
    classTypeAll: string;
    classTypeOne: string;
    classTypeGroup: string;
    apply: string;
    clear: string;
    exportPdf: string;
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

  const exportHref = `/admin/enrollments/export/pdf?${new URLSearchParams({
    q: initial.q,
    courseId,
    subjectId,
    levelId,
    teacherId: initial.teacherId,
    campusId: initial.campusId,
    classType: initial.classType,
  }).toString()}`;

  return (
    <form method="GET" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
      <input
        name="q"
        defaultValue={initial.q}
        placeholder={labels.searchPlaceholder}
        style={{ minWidth: 260 }}
      />
      <select name="courseId" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
        <option value="">{labels.courseAll}</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
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
      >
        <option value="">{labels.subjectAll}</option>
        {subjectOptions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.courseName} - {s.name}
          </option>
        ))}
      </select>
      <select name="levelId" value={levelId} onChange={(e) => setLevelId(e.target.value)}>
        <option value="">{labels.levelAll}</option>
        {levelOptions.map((l) => (
          <option key={l.id} value={l.id}>
            {l.courseName} - {l.subjectName} - {l.name}
          </option>
        ))}
      </select>
      <select name="teacherId" defaultValue={initial.teacherId}>
        <option value="">{labels.teacherAll}</option>
        {teachers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <select name="campusId" defaultValue={initial.campusId}>
        <option value="">{labels.campusAll}</option>
        {campuses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select name="classType" defaultValue={initial.classType}>
        <option value="">{labels.classTypeAll}</option>
        <option value="one">{labels.classTypeOne}</option>
        <option value="group">{labels.classTypeGroup}</option>
      </select>
      <button type="submit">{labels.apply}</button>
      <a href="/admin/enrollments">{labels.clear}</a>
      <a href={exportHref}>{labels.exportPdf}</a>
    </form>
  );
}
