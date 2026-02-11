"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import SimpleModal from "../_components/SimpleModal";
import NoticeBanner from "../_components/NoticeBanner";

type SourceOption = { id: string; name: string };
type TypeOption = { id: string; name: string };

type StudentRow = {
  id: string;
  name: string;
  school: string | null;
  birthDate: string | null;
  grade: string | null;
  sourceName: string | null;
  typeName: string | null;
  note: string | null;
  targetSchool: string | null;
  currentMajor: string | null;
  coachingContent: string | null;
  unpaidCount: number;
};

export default function AdminStudentsClient({
  initialStudents,
  sources,
  types,
  gradeOptions,
  labels,
}: {
  initialStudents: StudentRow[];
  sources: SourceOption[];
  types: TypeOption[];
  gradeOptions: string[];
  labels: {
    add: string;
    addStudent: string;
    name: string;
    school: string;
    birth: string;
    grade: string;
    source: string;
    type: string;
    unpaid: string;
    notes: string;
    targetSchool: string;
    currentMajor: string;
    coachingContent: string;
    id: string;
    action: string;
    edit: string;
    delete: string;
    deleteConfirm: string;
    ok: string;
    error: string;
    created: string;
    noStudents: string;
  };
}) {
  const router = useRouter();
  const [students, setStudents] = useState<StudentRow[]>(initialStudents);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [creating, startCreating] = useTransition();

  const formatId = useMemo(
    () => (prefix: string, id: string) => `${prefix}-${id.length > 10 ? `${id.slice(0, 4)}...${id.slice(-4)}` : id}`,
    []
  );

  async function createStudent(close: () => void, payload: any) {
    setErr("");
    setMsg("");
    startCreating(() => {
      (async () => {
        const res = await fetch("/api/admin/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          setErr(String(data?.message ?? "Create failed"));
          return;
        }
        const createdId = String(data?.studentId ?? "");
        const sourceName = payload.sourceChannelId
          ? (sources.find((s) => s.id === payload.sourceChannelId)?.name ?? null)
          : null;
        const typeName = payload.studentTypeId
          ? (types.find((t) => t.id === payload.studentTypeId)?.name ?? null)
          : null;
        const createdRow: StudentRow = {
          id: createdId,
          name: String(payload.name ?? "").trim(),
          school: String(payload.school ?? "").trim() || null,
          birthDate: String(payload.birthDate ?? "").trim() || null,
          grade: String(payload.grade ?? "").trim() || null,
          sourceName,
          typeName,
          note: String(payload.note ?? "").trim() || null,
          targetSchool: String(payload.targetSchool ?? "").trim() || null,
          currentMajor: String(payload.currentMajor ?? "").trim() || null,
          coachingContent: String(payload.coachingContent ?? "").trim() || null,
          unpaidCount: 0,
        };
        setStudents((prev) => [...prev, createdRow].sort((a, b) => a.name.localeCompare(b.name)));
        setMsg(labels.created);
        close();
        router.refresh();
      })();
    });
  }

  async function deleteStudent(id: string) {
    if (!confirm(labels.deleteConfirm)) return;
    setErr("");
    setMsg("");
    const res = await fetch(`/api/admin/students/${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setErr(String(data?.message ?? "Delete failed"));
      return;
    }
    setStudents((prev) => prev.filter((s) => s.id !== id));
    setMsg(labels.ok);
  }

  return (
    <div>
      {err ? <NoticeBanner type="error" title={labels.error} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={labels.ok} message={msg} /> : null}

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <SimpleModal buttonLabel={labels.add} title={labels.addStudent}>
          {({ close }) => (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                createStudent(close, {
                  name: String(fd.get("name") ?? ""),
                  school: String(fd.get("school") ?? ""),
                  birthDate: String(fd.get("birthDate") ?? ""),
                  grade: String(fd.get("grade") ?? ""),
                  sourceChannelId: String(fd.get("sourceChannelId") ?? ""),
                  studentTypeId: String(fd.get("studentTypeId") ?? ""),
                  note: String(fd.get("note") ?? ""),
                  targetSchool: String(fd.get("targetSchool") ?? ""),
                  currentMajor: String(fd.get("currentMajor") ?? ""),
                  coachingContent: String(fd.get("coachingContent") ?? ""),
                });
              }}
              style={{ display: "grid", gap: 8, maxWidth: 720 }}
            >
              <input name="name" placeholder={labels.name} />
              <input name="school" placeholder={labels.school} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input name="birthDate" type="date" />
                <select name="grade" defaultValue="">
                  <option value="">{labels.grade}</option>
                  {gradeOptions.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select name="sourceChannelId" defaultValue="">
                  <option value="">{labels.source}</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select name="studentTypeId" defaultValue="">
                  <option value="">{labels.type}</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <input name="targetSchool" placeholder={labels.targetSchool} />
              <input name="currentMajor" placeholder={labels.currentMajor} />
              <input name="coachingContent" placeholder={labels.coachingContent} />
              <textarea name="note" placeholder={labels.notes} rows={3} />
              <button type="submit" disabled={creating}>
                {creating ? "..." : labels.add}
              </button>
            </form>
          )}
        </SimpleModal>
      </div>

      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th align="left">{labels.name}</th>
            <th align="left">{labels.school}</th>
            <th align="left">{labels.birth}</th>
            <th align="left">{labels.grade}</th>
            <th align="left">{labels.source}</th>
            <th align="left">{labels.type}</th>
            <th align="left">{labels.unpaid}</th>
            <th align="left">{labels.targetSchool}</th>
            <th align="left">{labels.currentMajor}</th>
            <th align="left">{labels.coachingContent}</th>
            <th align="left">{labels.notes}</th>
            <th align="left">{labels.id}</th>
            <th align="left">{labels.action}</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} style={{ borderTop: "1px solid #eee" }}>
              <td>
                <a href={`/admin/students/${s.id}`}>{s.name}</a>
              </td>
              <td>{s.school ?? "-"}</td>
              <td>{s.birthDate ? new Date(s.birthDate).toLocaleDateString() : "-"}</td>
              <td>{s.grade ?? "-"}</td>
              <td>{s.sourceName ?? "-"}</td>
              <td>{s.typeName ?? "-"}</td>
              <td>{s.unpaidCount ? <span style={{ color: "#b00", fontWeight: 700 }}>{s.unpaidCount}</span> : "-"}</td>
              <td>{s.targetSchool ?? "-"}</td>
              <td>{s.currentMajor ?? "-"}</td>
              <td>{s.coachingContent ?? "-"}</td>
              <td>{s.note ?? "-"}</td>
              <td
                style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  color: "#475569",
                  maxWidth: 120,
                  whiteSpace: "nowrap",
                }}
                title={s.id}
              >
                {formatId("STU", s.id)}
              </td>
              <td>
                <a href={`/admin/students/${s.id}`}>{labels.edit}</a>{" "}
                <button type="button" onClick={() => deleteStudent(s.id)} style={{ marginLeft: 6 }}>
                  {labels.delete}
                </button>
              </td>
            </tr>
          ))}
          {students.length === 0 && (
            <tr>
              <td colSpan={13}>{labels.noStudents}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
