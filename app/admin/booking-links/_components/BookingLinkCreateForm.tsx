"use client";

import { useEffect, useMemo, useState } from "react";

type StudentOption = {
  id: string;
  name: string;
  courseIds: string[];
  courseNames: string[];
};

type TeacherOption = {
  id: string;
  name: string;
  courseIds: string[];
  courseNames: string[];
};

type Labels = {
  student: string;
  startDate: string;
  endDate: string;
  durationMin: string;
  slotStepMin: string;
  expiresAt: string;
  titleOptional: string;
  noteOptional: string;
  teacherHint: string;
  studentCoursePrefix: string;
  none: string;
  pickStudentFirst: string;
  searchTeacherOrCourse: string;
  selectFiltered: string;
  clearFiltered: string;
  candidateStats: string;
  matchedStats: string;
  selectedStats: string;
  timeMatchedStats: string;
  pleasePickStudent: string;
  noMatchedTeachers: string;
  noTeacherAvailableInWindow: string;
  loadingTeachers: string;
  createLink: string;
};

export default function BookingLinkCreateForm({
  students,
  teachers: _teachers,
  labels = {
    student: "Student",
    startDate: "Start Date",
    endDate: "End Date",
    durationMin: "Duration (min)",
    slotStepMin: "Slot Step (min)",
    expiresAt: "Expires At",
    titleOptional: "Title (optional)",
    noteOptional: "Note (optional)",
    teacherHint: "Teachers (matching purchased courses + available in selected date window)",
    studentCoursePrefix: "Student purchased courses",
    none: "None",
    pickStudentFirst: "Please select student first, then matching teachers will appear",
    searchTeacherOrCourse: "Search teacher or course",
    selectFiltered: "Select filtered",
    clearFiltered: "Clear filtered",
    candidateStats: "Available",
    matchedStats: "Matched",
    selectedStats: "Selected",
    timeMatchedStats: "Time matched",
    pleasePickStudent: "Please select student first",
    noMatchedTeachers: "No matched teachers",
    noTeacherAvailableInWindow: "No teacher available in selected schedule window",
    loadingTeachers: "Loading matching teachers...",
    createLink: "Create Link",
  },
}: {
  students: StudentOption[];
  teachers: TeacherOption[];
  labels?: Labels;
}) {
  const [studentId, setStudentId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [durationMin, setDurationMin] = useState(60);
  const [query, setQuery] = useState("");
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [candidateBusy, setCandidateBusy] = useState(false);
  const [candidateErr, setCandidateErr] = useState("");
  const [candidateTimeFiltered, setCandidateTimeFiltered] = useState(false);
  const [candidateTeachers, setCandidateTeachers] = useState<TeacherOption[]>([]);
  const [candidateStudentCourseNames, setCandidateStudentCourseNames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const selectedStudent = useMemo(() => students.find((s) => s.id === studentId), [studentId, students]);
  const selectedCourseLabel = useMemo(() => {
    if (candidateStudentCourseNames.length > 0) return candidateStudentCourseNames;
    return selectedStudent?.courseNames ?? [];
  }, [candidateStudentCourseNames, selectedStudent]);

  const eligibleTeachers = useMemo(() => candidateTeachers, [candidateTeachers]);

  const filteredTeachers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return eligibleTeachers;
    return eligibleTeachers.filter((t) => {
      const haystack = `${t.name} ${t.courseNames.join(" ")}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [eligibleTeachers, query]);

  useEffect(() => {
    const eligibleSet = new Set(eligibleTeachers.map((t) => t.id));
    setSelectedTeacherIds((prev) => prev.filter((id) => eligibleSet.has(id)));
  }, [eligibleTeachers]);

  useEffect(() => {
    let active = true;
    if (!studentId) {
      setCandidateTeachers([]);
      setCandidateStudentCourseNames([]);
      setCandidateErr("");
      setCandidateBusy(false);
      return () => {
        active = false;
      };
    }

    const timer = window.setTimeout(async () => {
      setCandidateBusy(true);
      setCandidateErr("");
      try {
        const q = new URLSearchParams();
        q.set("studentId", studentId);
        q.set("durationMin", String(durationMin));
        if (startDate) q.set("startDate", startDate);
        if (endDate) q.set("endDate", endDate);

        const res = await fetch(`/api/admin/booking-links/candidates?${q.toString()}`, { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as any;
        if (!res.ok || !data?.ok) {
          if (!active) return;
          setCandidateErr(String(data?.message ?? `Failed to load teachers (${res.status})`));
          setCandidateTeachers([]);
          setCandidateStudentCourseNames(selectedStudent?.courseNames ?? []);
          setCandidateTimeFiltered(Boolean(startDate && endDate));
          return;
        }
        if (!active) return;
        const list: TeacherOption[] = Array.isArray(data?.teachers) ? data.teachers : [];
        setCandidateTeachers(list);
        setCandidateStudentCourseNames(
          Array.isArray(data?.studentCourses) ? data.studentCourses.map((c: any) => String(c?.name ?? "")).filter(Boolean) : []
        );
        setCandidateTimeFiltered(Boolean(data?.timeFiltered));
      } finally {
        if (active) setCandidateBusy(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [studentId, startDate, endDate, durationMin, selectedStudent?.courseNames]);

  function toggleTeacher(teacherId: string, checked: boolean) {
    setSelectedTeacherIds((prev) => {
      if (checked) {
        if (prev.includes(teacherId)) return prev;
        return [...prev, teacherId];
      }
      return prev.filter((id) => id !== teacherId);
    });
  }

  function selectAllFiltered() {
    const ids = filteredTeachers.map((t) => t.id);
    setSelectedTeacherIds((prev) => Array.from(new Set([...prev, ...ids])));
  }

  function clearFiltered() {
    const removeSet = new Set(filteredTeachers.map((t) => t.id));
    setSelectedTeacherIds((prev) => prev.filter((id) => !removeSet.has(id)));
  }

  return (
    <form
      style={{ display: "grid", gap: 8, maxWidth: 960, marginBottom: 20 }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setErr("");
        setBusy(true);
        try {
          const fd = new FormData(e.currentTarget);
          const payload = {
            studentId: String(fd.get("studentId") ?? ""),
            startDate: String(fd.get("startDate") ?? ""),
            endDate: String(fd.get("endDate") ?? ""),
            durationMin: Number(String(fd.get("durationMin") ?? "60")),
            slotStepMin: Number(String(fd.get("slotStepMin") ?? "15")),
            title: String(fd.get("title") ?? ""),
            note: String(fd.get("note") ?? ""),
            expiresAt: String(fd.get("expiresAt") ?? ""),
            teacherIds: selectedTeacherIds,
          };

          const res = await fetch("/api/admin/booking-links", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = (await res.json().catch(() => null)) as any;
          if (!res.ok || !data?.ok) {
            setErr(String(data?.message ?? `Request failed (${res.status})`));
            return;
          }

          const formEl = e.currentTarget as HTMLFormElement;
          const dlg =
            formEl.closest("dialog") ??
            (formEl.ownerDocument?.querySelector("dialog[open]") as HTMLDialogElement | null);
          dlg?.close();
          window.location.assign(`/admin/booking-links?msg=${encodeURIComponent(`Link created: ${String(data.id ?? "")}`)}`);
        } finally {
          setBusy(false);
        }
      }}
    >
      {err ? <div style={{ color: "#b00" }}>{err}</div> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select name="studentId" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">{labels.student}</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <label>
          {labels.startDate}:
          <input type="date" name="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ marginLeft: 6 }} />
        </label>
        <label>
          {labels.endDate}:
          <input type="date" name="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ marginLeft: 6 }} />
        </label>
        <label>
          {labels.durationMin}:
          <input
            type="number"
            name="durationMin"
            min={15}
            step={15}
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value || 60))}
            style={{ marginLeft: 6, width: 90 }}
          />
        </label>
        <label>
          {labels.slotStepMin}:
          <input type="number" name="slotStepMin" min={5} step={5} defaultValue={15} style={{ marginLeft: 6, width: 90 }} />
        </label>
        <label>
          {labels.expiresAt}:
          <input type="datetime-local" name="expiresAt" style={{ marginLeft: 6 }} />
        </label>
      </div>

      <input name="title" placeholder={labels.titleOptional} />
      <textarea name="note" rows={3} placeholder={labels.noteOptional} />

      <div style={{ border: "1px solid #e8e8e8", borderRadius: 8, padding: 10 }}>
        <div style={{ marginBottom: 6, fontWeight: 600 }}>{labels.teacherHint}</div>
        <div style={{ fontSize: 12, color: "#334155", marginBottom: 8, lineHeight: 1.6 }}>
          {selectedStudent ? `${labels.studentCoursePrefix}: ${selectedCourseLabel.join(" / ") || labels.none}` : labels.pickStudentFirst}
        </div>
        {selectedStudent && selectedCourseLabel.length > 0 ? (
          <div style={{ marginBottom: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {selectedCourseLabel.map((name) => (
              <span
                key={name}
                style={{
                  fontSize: 12,
                  border: "1px solid #93c5fd",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  borderRadius: 999,
                  padding: "2px 8px",
                  fontWeight: 700,
                }}
              >
                {name}
              </span>
            ))}
          </div>
        ) : null}
        {candidateErr ? <div style={{ color: "#b00", marginBottom: 8 }}>{candidateErr}</div> : null}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.searchTeacherOrCourse}
            style={{ minWidth: 240 }}
            disabled={!selectedStudent}
          />
          <button type="button" onClick={selectAllFiltered} disabled={filteredTeachers.length === 0}>
            {labels.selectFiltered}
          </button>
          <button type="button" onClick={clearFiltered} disabled={filteredTeachers.length === 0}>
            {labels.clearFiltered}
          </button>
          <span style={{ fontSize: 12, color: "#666" }}>
            {labels.candidateStats} {filteredTeachers.length} / {labels.timeMatchedStats} {eligibleTeachers.length} / {labels.selectedStats} {selectedTeacherIds.length}
          </span>
        </div>

        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 6,
            maxHeight: 260,
            overflow: "auto",
            padding: 8,
            display: "grid",
            gap: 6,
            background: "#fff",
          }}
        >
          {!selectedStudent ? (
            <div style={{ color: "#999" }}>{labels.pleasePickStudent}</div>
          ) : candidateBusy ? (
            <div style={{ color: "#999" }}>{labels.loadingTeachers}</div>
          ) : filteredTeachers.length === 0 ? (
            <div style={{ color: "#999" }}>{candidateTimeFiltered ? labels.noTeacherAvailableInWindow : labels.noMatchedTeachers}</div>
          ) : (
            filteredTeachers.map((t) => (
              <label key={t.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <input
                  type="checkbox"
                  checked={selectedTeacherIds.includes(t.id)}
                  onChange={(e) => toggleTeacher(t.id, e.target.checked)}
                />
                <span>
                  <span>{t.name}</span>
                  <span style={{ color: "#777", marginLeft: 6, fontSize: 12 }}>{t.courseNames.join(", ")}</span>
                </span>
              </label>
            ))
          )}
        </div>
      </div>

      {selectedTeacherIds.map((id) => (
        <input key={id} type="hidden" name="teacherIds" value={id} />
      ))}

      <button type="submit" disabled={busy} style={{ width: 160 }}>
        {busy ? `${labels.createLink}...` : labels.createLink}
      </button>
    </form>
  );
}
