"use client";

import { useEffect, useMemo, useState } from "react";
import NoticeBanner from "@/app/admin/_components/NoticeBanner";

type CourseOption = { id: string; label: string };
type SubjectOption = { id: string; label: string; courseId: string };
type LevelOption = { id: string; label: string; subjectId: string };

export default function TeacherCardExportForm({
  actionUrl,
  courses,
  subjects,
  levels,
  labels,
}: {
  actionUrl: string;
  courses: CourseOption[];
  subjects: SubjectOption[];
  levels: LevelOption[];
  labels: {
    courseOptional: string;
    subjectOptional: string;
    levelOptional: string;
    languageOptional: string;
    chinese: string;
    english: string;
    bilingual: string;
    other: string;
    offlineOptional: string;
    offlineOnlineOnly: string;
    offlineShanghai: string;
    offlineSingapore: string;
    offlineBoth: string;
    offlineAny: string;
    exportByFilter: string;
    exportAll: string;
    emptyResult: string;
  };
}) {
  const [busy, setBusy] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [notice, setNotice] = useState<{ type: "error" | "success" | "info" | "warn"; message: string } | null>(null);

  useEffect(() => {
    if (!courseId) return;
    const first = subjects.find((s) => s.courseId === courseId);
    if (first && first.id !== subjectId) setSubjectId(first.id);
    if (!first) setSubjectId("");
  }, [courseId, subjects, subjectId]);

  const subjectOptions = useMemo(() => {
    if (!courseId) return subjects;
    return subjects.filter((s) => s.courseId === courseId);
  }, [courseId, subjects]);

  const levelOptions = useMemo(() => {
    if (!subjectId) return levels;
    return levels.filter((l) => l.subjectId === subjectId);
  }, [levels, subjectId]);

  useEffect(() => {
    if (levelId && !levelOptions.some((l) => l.id === levelId)) {
      setLevelId("");
    }
  }, [levelId, levelOptions]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const form = e.currentTarget;
      const params = new URLSearchParams(new FormData(form) as any);
      const url = `${actionUrl}?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        const msg = await res.text();
        setNotice({ type: "warn", message: msg || labels.emptyResult });
        return;
      }
      const blob = await res.blob();
      const dispo = res.headers.get("content-disposition") || "";
      const match = dispo.match(/filename\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/i);
      const fileName = match?.[1] ? decodeURIComponent(match[1]) : match?.[2] || "teacher-cards.pdf";
      const a = document.createElement("a");
      const href = URL.createObjectURL(blob);
      a.href = href;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {notice ? <NoticeBanner type={notice.type} title="Notice" message={notice.message} /> : null}
      <form onSubmit={onSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select name="courseId" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">{labels.courseOptional}</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
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
          <option value="">{labels.subjectOptional}</option>
          {subjectOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <select name="levelId" value={levelId} onChange={(e) => setLevelId(e.target.value)}>
          <option value="">{labels.levelOptional}</option>
          {levelOptions.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        <select name="teachingLanguage" defaultValue="">
          <option value="">{labels.languageOptional}</option>
          <option value="CHINESE">{labels.chinese}</option>
          <option value="ENGLISH">{labels.english}</option>
          <option value="BILINGUAL">{labels.bilingual}</option>
          <option value="OTHER">{labels.other}</option>
        </select>
        <select name="offlineMode" defaultValue="">
          <option value="">{labels.offlineOptional}</option>
          <option value="ONLINE_ONLY">{labels.offlineOnlineOnly}</option>
          <option value="OFFLINE_SH">{labels.offlineShanghai}</option>
          <option value="OFFLINE_SG">{labels.offlineSingapore}</option>
          <option value="OFFLINE_BOTH">{labels.offlineBoth}</option>
          <option value="OFFLINE_ANY">{labels.offlineAny}</option>
        </select>
        <button type="submit" disabled={busy}>
          {busy ? "..." : labels.exportByFilter}
        </button>
        <a href={actionUrl}>{labels.exportAll}</a>
      </form>
    </div>
  );
}
