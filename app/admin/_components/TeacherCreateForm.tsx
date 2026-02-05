"use client";

import { useMemo, useState } from "react";

type SubjectOpt = {
  id: string;
  name: string;
  courseId: string;
  courseName: string;
};

type CourseOpt = {
  id: string;
  name: string;
};

export default function TeacherCreateForm({
  action,
  subjects,
  courses,
  labels,
}: {
  action: (formData: FormData) => Promise<void>;
  subjects: SubjectOpt[];
  courses: CourseOpt[];
  labels: {
    teacherName: string;
    nationality: string;
    almaMater: string;
    almaMaterRule: string;
    teacherIntro: string;
    subjectsMulti: string;
    subjectSearch: string;
    subjectCourseFilter: string;
    allCourses: string;
    yearsExp: string;
    teachingLanguage: string;
    chinese: string;
    english: string;
    bilingual: string;
    otherLang: string;
    otherLangInput: string;
    add: string;
  };
}) {
  const [courseId, setCourseId] = useState("");
  const [subjectQ, setSubjectQ] = useState("");
  const [lang, setLang] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  const shownSubjects = useMemo(() => {
    const q = subjectQ.trim().toLowerCase();
    return subjects.filter((s) => {
      if (courseId && s.courseId !== courseId) return false;
      if (!q) return true;
      return `${s.courseName} ${s.name}`.toLowerCase().includes(q);
    });
  }, [subjects, courseId, subjectQ]);

  const selectedSubjects = useMemo(() => {
    const set = new Set(selectedSubjectIds);
    return subjects.filter((s) => set.has(s.id));
  }, [subjects, selectedSubjectIds]);

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <form action={action} style={{ display: "grid", gap: 8, maxWidth: 860 }}>
      <input name="name" placeholder={labels.teacherName} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input name="nationality" placeholder={labels.nationality} />
        <input name="almaMater" placeholder={labels.almaMater} />
      </div>
      <div style={{ color: "#666", fontSize: 12 }}>{labels.almaMaterRule}</div>
      <textarea name="intro" rows={3} placeholder={labels.teacherIntro} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#666", fontSize: 12 }}>{labels.subjectCourseFilter}</span>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">{labels.allCourses}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#666", fontSize: 12 }}>{labels.subjectSearch}</span>
          <input value={subjectQ} onChange={(e) => setSubjectQ(e.target.value)} placeholder={labels.subjectSearch} />
        </label>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ minWidth: 420, maxWidth: 560, border: "1px solid #ddd", borderRadius: 8, padding: 8 }}>
          <div style={{ maxHeight: 220, overflow: "auto", display: "grid", gap: 6 }}>
            {shownSubjects.map((s) => (
              <label key={s.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={selectedSubjectIds.includes(s.id)}
                  onChange={() => toggleSubject(s.id)}
                />
                <span>{s.courseName} - {s.name}</span>
              </label>
            ))}
            {shownSubjects.length === 0 ? <div style={{ color: "#999" }}>No subjects</div> : null}
          </div>
        </div>
        <span style={{ color: "#666" }}>{labels.subjectsMulti}</span>

        <input
          name="yearsExperience"
          type="number"
          min={0}
          placeholder={labels.yearsExp}
          style={{ width: 220 }}
        />

        <select
          name="teachingLanguage"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
        >
          <option value="">{labels.teachingLanguage}</option>
          <option value="CHINESE">{labels.chinese}</option>
          <option value="ENGLISH">{labels.english}</option>
          <option value="BILINGUAL">{labels.bilingual}</option>
          <option value="OTHER">{labels.otherLang}</option>
        </select>
      </div>

      {selectedSubjects.length > 0 ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {selectedSubjects.map((s) => (
            <span
              key={s.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                border: "1px solid #ddd",
                borderRadius: 999,
                padding: "4px 10px",
                background: "#fafafa",
              }}
            >
              {s.courseName} - {s.name}
              <button type="button" onClick={() => toggleSubject(s.id)} style={{ border: 0, background: "transparent", cursor: "pointer" }}>
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {selectedSubjectIds.map((id) => (
        <input key={id} type="hidden" name="subjectIds" value={id} />
      ))}

      {lang === "OTHER" ? (
        <input name="teachingLanguageOther" placeholder={labels.otherLangInput} />
      ) : null}

      <button type="submit">{labels.add}</button>
    </form>
  );
}
