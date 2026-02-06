"use client";

import { useEffect, useMemo, useState } from "react";

type CourseOption = { id: string; name: string };
type SubjectOption = { id: string; name: string; courseId: string; courseName: string };

export default function TeacherFilterForm({
  courses,
  subjects,
  initial,
  labels,
}: {
  courses: CourseOption[];
  subjects: SubjectOption[];
  initial: {
    q: string;
    courseId: string;
    subjectId: string;
    teachingLanguage: string;
    offlineMode: string;
    linked: string;
    groupBy: string;
  };
  labels: {
    title: string;
    searchPlaceholder: string;
    courseAll: string;
    subjectAll: string;
    languageAll: string;
    offlineAll: string;
    linkedAll: string;
    groupNone: string;
    groupCourse: string;
    groupSubject: string;
    groupLanguage: string;
    groupLinked: string;
    apply: string;
    reset: string;
    chinese: string;
    english: string;
    bilingual: string;
    other: string;
    onlineOnly: string;
    offlineSh: string;
    offlineSg: string;
    offlineBoth: string;
    offlineAny: string;
    linked: string;
    unlinked: string;
  };
}) {
  const [courseId, setCourseId] = useState(initial.courseId);
  const [subjectId, setSubjectId] = useState(initial.subjectId);

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
    <form method="get" style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, marginBottom: 14 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{labels.title}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          name="q"
          defaultValue={initial.q}
          placeholder={labels.searchPlaceholder}
          style={{ minWidth: 280 }}
        />
        <select name="courseId" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">{labels.courseAll}</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="subjectId" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">{labels.subjectAll}</option>
          {subjectOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.courseName} - {s.name}
            </option>
          ))}
        </select>
        <select name="teachingLanguage" defaultValue={initial.teachingLanguage}>
          <option value="">{labels.languageAll}</option>
          <option value="CHINESE">{labels.chinese}</option>
          <option value="ENGLISH">{labels.english}</option>
          <option value="BILINGUAL">{labels.bilingual}</option>
          <option value="OTHER">{labels.other}</option>
        </select>
        <select name="offlineMode" defaultValue={initial.offlineMode}>
          <option value="">{labels.offlineAll}</option>
          <option value="ONLINE_ONLY">{labels.onlineOnly}</option>
          <option value="OFFLINE_SH">{labels.offlineSh}</option>
          <option value="OFFLINE_SG">{labels.offlineSg}</option>
          <option value="OFFLINE_BOTH">{labels.offlineBoth}</option>
          <option value="OFFLINE_ANY">{labels.offlineAny}</option>
        </select>
        <select name="linked" defaultValue={initial.linked}>
          <option value="">{labels.linkedAll}</option>
          <option value="linked">{labels.linked}</option>
          <option value="unlinked">{labels.unlinked}</option>
        </select>
        <select name="groupBy" defaultValue={initial.groupBy}>
          <option value="">{labels.groupNone}</option>
          <option value="course">{labels.groupCourse}</option>
          <option value="subject">{labels.groupSubject}</option>
          <option value="language">{labels.groupLanguage}</option>
          <option value="linked">{labels.groupLinked}</option>
        </select>
        <button type="submit">{labels.apply}</button>
        <a href="/admin/teachers">{labels.reset}</a>
      </div>
    </form>
  );
}
