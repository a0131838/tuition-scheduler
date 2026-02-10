"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  subjects,
  courses,
  labels,
  initial,
  teacherId,
  onDone,
}: {
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
    noSubjects: string;
    yearsExp: string;
    teachingLanguage: string;
    chinese: string;
    english: string;
    bilingual: string;
    otherLang: string;
    otherLangInput: string;
    offlineTeaching: string;
    offlineShanghai: string;
    offlineSingapore: string;
    add: string;
  };
  initial?: {
    name?: string;
    nationality?: string;
    almaMater?: string;
    intro?: string;
    yearsExperience?: number | null;
    teachingLanguage?: string | null;
    teachingLanguageOther?: string | null;
    subjectIds?: string[];
    offlineShanghai?: boolean | null;
    offlineSingapore?: boolean | null;
  };
  teacherId?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState("");
  const [subjectQ, setSubjectQ] = useState("");
  const [lang, setLang] = useState(initial?.teachingLanguageOther ? "OTHER" : initial?.teachingLanguage ?? "");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(
    initial?.subjectIds ? Array.from(new Set(initial.subjectIds)) : []
  );
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

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
    <form
      style={{ display: "grid", gap: 8, maxWidth: 860 }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setErr("");
        setBusy(true);
        try {
          const fd = new FormData(e.currentTarget);
          const payload = {
            name: String(fd.get("name") ?? ""),
            nationality: String(fd.get("nationality") ?? ""),
            almaMater: String(fd.get("almaMater") ?? ""),
            intro: String(fd.get("intro") ?? ""),
            yearsExperience: String(fd.get("yearsExperience") ?? ""),
            teachingLanguage: String(fd.get("teachingLanguage") ?? ""),
            teachingLanguageOther: String(fd.get("teachingLanguageOther") ?? ""),
            offlineShanghai: String(fd.get("offlineShanghai") ?? "") === "on",
            offlineSingapore: String(fd.get("offlineSingapore") ?? "") === "on",
            subjectIds: selectedSubjectIds,
          };

          const url = teacherId ? `/api/admin/teachers/${encodeURIComponent(teacherId)}` : "/api/admin/teachers";
          const method = teacherId ? "PATCH" : "POST";
          const res = await fetch(url, {
            method,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = (await res.json().catch(() => null)) as any;
          if (!res.ok || !data?.ok) {
            setErr(String(data?.message ?? `Request failed (${res.status})`));
            return;
          }

          if (onDone) onDone();
          else (e.currentTarget as HTMLFormElement).closest("dialog")?.close();
          const y = window.scrollY;
          router.refresh();
          requestAnimationFrame(() => window.scrollTo(0, y));
        } finally {
          setBusy(false);
        }
      }}
    >
      {err ? <div style={{ color: "#b00" }}>{err}</div> : null}
      <input name="name" placeholder={labels.teacherName} defaultValue={initial?.name ?? ""} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input name="nationality" placeholder={labels.nationality} defaultValue={initial?.nationality ?? ""} />
        <input name="almaMater" placeholder={labels.almaMater} defaultValue={initial?.almaMater ?? ""} />
      </div>
      <div style={{ color: "#666", fontSize: 12 }}>{labels.almaMaterRule}</div>
      <textarea name="intro" rows={3} placeholder={labels.teacherIntro} defaultValue={initial?.intro ?? ""} />

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
                <span>
                  {s.courseName} - {s.name}
                </span>
              </label>
            ))}
            {shownSubjects.length === 0 ? <div style={{ color: "#999" }}>{labels.noSubjects}</div> : null}
          </div>
        </div>
        <span style={{ color: "#666" }}>{labels.subjectsMulti}</span>

        <input
          name="yearsExperience"
          type="number"
          min={0}
          placeholder={labels.yearsExp}
          defaultValue={initial?.yearsExperience ?? ""}
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

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ color: "#666", fontSize: 12 }}>{labels.offlineTeaching}</span>
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" name="offlineShanghai" defaultChecked={!!initial?.offlineShanghai} />
          {labels.offlineShanghai}
        </label>
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" name="offlineSingapore" defaultChecked={!!initial?.offlineSingapore} />
          {labels.offlineSingapore}
        </label>
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
              <button
                type="button"
                aria-label="Remove subject"
                onClick={() => toggleSubject(s.id)}
                style={{ border: 0, background: "transparent", cursor: "pointer" }}
              >
                x
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {selectedSubjectIds.map((id) => (
        <input key={id} type="hidden" name="subjectIds" value={id} />
      ))}

      {lang === "OTHER" ? (
        <input
          name="teachingLanguageOther"
          placeholder={labels.otherLangInput}
          defaultValue={initial?.teachingLanguageOther ?? ""}
          required
        />
      ) : null}

      <button type="submit" disabled={busy}>
        {busy ? `${labels.add}...` : labels.add}
      </button>
    </form>
  );
}

