"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type TransferLesson = {
  id: string; studentId: string; subjectId: string; levelId: string; teacherId: string;
  campusId: string; roomId: string; startAt: string; durationMin: number;
};

export default function TransferCancelledLesson({ lesson }: { lesson: TransferLesson }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const [students, setStudents] = useState<Array<{ id: string; name: string; grade: string | null }>>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <>
    <button type="button" onClick={() => dialog.current?.showModal()}>Transfer / 转给其他学生</button>
    <dialog ref={dialog} style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: 16, width: 420, maxWidth: "calc(100vw - 32px)", boxSizing: "border-box", maxHeight: "90vh", overflow: "auto" }}>
      <form onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setError(""); setSelected(""); setStudents([]);
        try {
          const res = await fetch(`/api/admin/students?q=${encodeURIComponent(q)}`);
          if (!res.ok) throw new Error();
          const data = await res.json();
          const options = data.students.filter((s: { id: string }) => s.id !== lesson.studentId);
          setStudents(options);
          if (!options.length) setError("No matching students / 没有匹配的学生");
        } catch { setError("Search failed / 查询失败"); } finally { setBusy(false); }
      }} style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6, minWidth: 0 }}>Student / 学生<input required value={q} onChange={(e) => { setQ(e.target.value); setSelected(""); setStudents([]); }} style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }} /></label>
        <button disabled={busy} type="submit">Search / 查询</button>
        <select aria-label="Target student / 接课学生" value={selected} onChange={(e) => setSelected(e.target.value)} style={{ width: "100%", minWidth: 0 }}>
          <option value="">Select student / 请选择学生</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name} {s.grade ?? ""} · {s.id.slice(-6)}</option>)}
        </select>
        {error ? <div role="alert">{error}</div> : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "end" }}>
          <button type="button" onClick={() => dialog.current?.close()}>Close / 关闭</button>
          <button type="button" disabled={!selected || busy} onClick={() => {
            const p = new URLSearchParams({ quickOpen: "1", focus: "quick-schedule", quickMode: "create", transferSourceSessionId: lesson.id,
              quickSubjectId: lesson.subjectId, quickLevelId: lesson.levelId, quickTeacherId: lesson.teacherId,
              quickCampusId: lesson.campusId, quickRoomId: lesson.roomId, quickStartAt: lesson.startAt,
              quickDurationMin: String(lesson.durationMin), month: lesson.startAt.slice(0, 7) });
            router.push(`/admin/students/${encodeURIComponent(selected)}?${p}`);
          }}>Review schedule / 核对排课</button>
        </div>
      </form>
    </dialog>
  </>;
}
