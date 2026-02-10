"use client";

import { useMemo, useState } from "react";

type LevelRow = { id: string; name: string };
type SubjectRow = { id: string; name: string; levels: LevelRow[] };
type CourseRow = { id: string; name: string; subjects: SubjectRow[] };

type SubjectDraft = Record<string, string>; // courseId -> raw names
type LevelDraft = Record<string, string>; // subjectId -> raw names

export default function AdminCoursesClient({
  initialCourses,
  q,
  labels,
}: {
  initialCourses: CourseRow[];
  q: string;
  labels: {
    courseCategory: string;
    addCourse: string;
    addCoursePlaceholder: string;
    subjects: string;
    levels: string;
    delete: string;
    addSubject: string;
    addSubjectPlaceholder: string;
    addLevel: string;
    addLevelPlaceholder: string;
    noSubjects: string;
    noLevels: string;
    errorPrefix: string;
    errCourseHasClasses: string;
    errCourseHasSubjects: string;
    errSubjectHasClasses: string;
    errLevelHasClasses: string;
  };
}) {
  const [courses, setCourses] = useState<CourseRow[]>(initialCourses);
  const [newCourseName, setNewCourseName] = useState("");
  const [subjectDraft, setSubjectDraft] = useState<SubjectDraft>({});
  const [levelDraft, setLevelDraft] = useState<LevelDraft>({});
  const [busyKey, setBusyKey] = useState<string>(""); // action lock

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return courses;
    return courses.reduce<CourseRow[]>((acc, c) => {
      const subjects = c.subjects.filter((s) => {
        if (s.name.toLowerCase().includes(qq)) return true;
        return s.levels.some((l) => l.name.toLowerCase().includes(qq));
      });
      if (c.name.toLowerCase().includes(qq)) acc.push({ ...c, subjects: c.subjects });
      else if (subjects.length > 0) acc.push({ ...c, subjects });
      return acc;
    }, []);
  }, [courses, q]);

  async function createCourse() {
    const name = newCourseName.trim();
    if (!name || busyKey) return;
    setBusyKey("course:create");
    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Create failed"));
      setCourses((prev) => [...prev, data.course as CourseRow].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCourseName("");
    } catch (e: any) {
      alert(`${labels.errorPrefix}: ${e?.message ?? "Create failed"}`);
    } finally {
      setBusyKey("");
    }
  }

  async function deleteCourse(id: string) {
    if (busyKey) return;
    setBusyKey(`course:delete:${id}`);
    try {
      const res = await fetch("/api/admin/courses", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) {
        const msg = String(data?.message ?? "Delete failed");
        if (msg === "Course has classes") throw new Error(labels.errCourseHasClasses);
        if (msg === "Course has subjects") throw new Error(labels.errCourseHasSubjects);
        throw new Error(msg);
      }
      setCourses((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      alert(`${labels.errorPrefix}: ${e?.message ?? "Delete failed"}`);
    } finally {
      setBusyKey("");
    }
  }

  async function createSubject(courseId: string) {
    const raw = (subjectDraft[courseId] ?? "").trim();
    if (!raw || busyKey) return;
    setBusyKey(`subject:create:${courseId}`);
    try {
      const res = await fetch("/api/admin/subjects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ courseId, name: raw }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Create failed"));
      setCourses((prev) => prev.map((c) => (c.id === courseId ? { ...c, subjects: data.subjects as SubjectRow[] } : c)));
      setSubjectDraft((prev) => ({ ...prev, [courseId]: "" }));
    } catch (e: any) {
      alert(`${labels.errorPrefix}: ${e?.message ?? "Create failed"}`);
    } finally {
      setBusyKey("");
    }
  }

  async function deleteSubject(courseId: string, subjectId: string) {
    if (busyKey) return;
    setBusyKey(`subject:delete:${subjectId}`);
    try {
      const res = await fetch("/api/admin/subjects", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: subjectId }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) {
        const msg = String(data?.message ?? "Delete failed");
        if (msg === "Subject has classes") throw new Error(labels.errSubjectHasClasses);
        throw new Error(msg);
      }
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, subjects: c.subjects.filter((s) => s.id !== subjectId) } : c))
      );
    } catch (e: any) {
      alert(`${labels.errorPrefix}: ${e?.message ?? "Delete failed"}`);
    } finally {
      setBusyKey("");
    }
  }

  async function createLevel(courseId: string, subjectId: string) {
    const raw = (levelDraft[subjectId] ?? "").trim();
    if (!raw || busyKey) return;
    setBusyKey(`level:create:${subjectId}`);
    try {
      const res = await fetch("/api/admin/levels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subjectId, name: raw }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Create failed"));
      setCourses((prev) =>
        prev.map((c) => {
          if (c.id !== courseId) return c;
          return {
            ...c,
            subjects: c.subjects.map((s) => (s.id === subjectId ? { ...s, levels: data.levels as LevelRow[] } : s)),
          };
        })
      );
      setLevelDraft((prev) => ({ ...prev, [subjectId]: "" }));
    } catch (e: any) {
      alert(`${labels.errorPrefix}: ${e?.message ?? "Create failed"}`);
    } finally {
      setBusyKey("");
    }
  }

  async function deleteLevel(courseId: string, subjectId: string, levelId: string) {
    if (busyKey) return;
    setBusyKey(`level:delete:${levelId}`);
    try {
      const res = await fetch("/api/admin/levels", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: levelId }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) {
        const msg = String(data?.message ?? "Delete failed");
        if (msg === "Level has classes") throw new Error(labels.errLevelHasClasses);
        throw new Error(msg);
      }
      setCourses((prev) =>
        prev.map((c) => {
          if (c.id !== courseId) return c;
          return {
            ...c,
            subjects: c.subjects.map((s) =>
              s.id === subjectId ? { ...s, levels: s.levels.filter((l) => l.id !== levelId) } : s
            ),
          };
        })
      );
    } catch (e: any) {
      alert(`${labels.errorPrefix}: ${e?.message ?? "Delete failed"}`);
    } finally {
      setBusyKey("");
    }
  }

  return (
    <>
      <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, background: "#fafafa", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
            placeholder={labels.addCoursePlaceholder}
          />
          <button type="button" onClick={createCourse} disabled={!!busyKey}>
            {labels.addCourse}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ color: "#999" }}>-</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((c) => (
            <details
              key={c.id}
              open={!!q || (filtered.length === 1 && c.subjects.length > 0)}
              style={{ border: "1px solid #e8e8e8", borderRadius: 10, padding: 10, background: "#fafafa" }}
            >
              <summary style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <b>{c.name}</b>
                  <span style={{ color: "#666", fontSize: 12 }}>
                    {labels.subjects}: {c.subjects.length}
                  </span>
                </div>
                <button type="button" onClick={() => deleteCourse(c.id)} disabled={!!busyKey}>
                  {labels.delete}
                </button>
              </summary>

              <div style={{ marginTop: 10, paddingLeft: 8 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <input
                    value={subjectDraft[c.id] ?? ""}
                    onChange={(e) => setSubjectDraft((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    placeholder={labels.addSubjectPlaceholder}
                  />
                  <button type="button" onClick={() => createSubject(c.id)} disabled={!!busyKey}>
                    {labels.addSubject}
                  </button>
                </div>

                {c.subjects.length === 0 ? (
                  <div style={{ color: "#999" }}>{labels.noSubjects}</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {c.subjects.map((s) => (
                      <details key={s.id} style={{ border: "1px dashed #e2e2e2", borderRadius: 8, padding: 8, background: "#fff" }}>
                        <summary style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <b>{s.name}</b>
                            <span style={{ color: "#666", fontSize: 12 }}>
                              {labels.levels}: {s.levels.length}
                            </span>
                          </div>
                          <button type="button" onClick={() => deleteSubject(c.id, s.id)} disabled={!!busyKey}>
                            {labels.delete}
                          </button>
                        </summary>

                        <div style={{ marginTop: 8 }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {s.levels.length === 0 ? (
                              <span style={{ color: "#999" }}>{labels.noLevels}</span>
                            ) : (
                              s.levels.map((l) => (
                                <span
                                  key={l.id}
                                  style={{
                                    display: "inline-flex",
                                    gap: 6,
                                    alignItems: "center",
                                    border: "1px solid #eee",
                                    borderRadius: 999,
                                    padding: "4px 10px",
                                  }}
                                >
                                  {l.name}
                                  <button type="button" onClick={() => deleteLevel(c.id, s.id, l.id)} disabled={!!busyKey} style={{ fontSize: 12 }}>
                                    {labels.delete}
                                  </button>
                                </span>
                              ))
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                            <input
                              value={levelDraft[s.id] ?? ""}
                              onChange={(e) => setLevelDraft((prev) => ({ ...prev, [s.id]: e.target.value }))}
                              placeholder={labels.addLevelPlaceholder}
                            />
                            <button type="button" onClick={() => createLevel(c.id, s.id)} disabled={!!busyKey}>
                              {labels.addLevel}
                            </button>
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </>
  );
}

