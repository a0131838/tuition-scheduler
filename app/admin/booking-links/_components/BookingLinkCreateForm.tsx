"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function BookingLinkCreateForm({
  students,
  teachers,
  labels = {
    student: "Student / 学生",
    startDate: "Start Date / 开始日期",
    endDate: "End Date / 结束日期",
    durationMin: "Duration (min) / 时长(分钟)",
    slotStepMin: "Slot Step (min) / 起始间隔(分钟)",
    expiresAt: "Expires At / 失效时间",
    titleOptional: "Title (optional) / 标题(可选)",
    noteOptional: "Note (optional) / 备注(可选)",
    teacherHint: "Teachers (only those matching student's purchased courses) / 老师（仅显示可教该学生已购课程）",
    studentCoursePrefix: "Student purchased courses / 学生已购课程",
    none: "None / 无",
    pickStudentFirst: "Please select student first, then matching teachers will appear / 先选择学生，再显示可匹配老师",
    searchTeacherOrCourse: "Search teacher or course / 搜索老师或课程",
    selectFiltered: "Select filtered / 勾选当前筛选",
    clearFiltered: "Clear filtered / 取消当前筛选",
    candidateStats: "Available",
    matchedStats: "Matched",
    selectedStats: "Selected",
    pleasePickStudent: "Please select student first / 请先选择学生",
    noMatchedTeachers: "No matched teachers / 没有可匹配老师",
    createLink: "Create Link / 创建链接",
  },
}: {
  students: StudentOption[];
  teachers: TeacherOption[];
  labels?: {
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
    pleasePickStudent: string;
    noMatchedTeachers: string;
    createLink: string;
  };
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [query, setQuery] = useState("");
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const selectedStudent = studentMap.get(studentId);
  const selectedCourseIds = selectedStudent?.courseIds ?? [];
  const selectedCourseSet = useMemo(() => new Set(selectedCourseIds), [selectedCourseIds]);

  const eligibleTeachers = useMemo(() => {
    if (!studentId || selectedCourseSet.size === 0) return [];
    return teachers.filter((t) => t.courseIds.some((courseId) => selectedCourseSet.has(courseId)));
  }, [studentId, selectedCourseSet, teachers]);

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

          (e.currentTarget as HTMLFormElement).closest("dialog")?.close();
          router.push(`/admin/booking-links/${encodeURIComponent(String(data.id))}?msg=Link+created`);
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
          <input type="date" name="startDate" style={{ marginLeft: 6 }} />
        </label>
        <label>
          {labels.endDate}:
          <input type="date" name="endDate" style={{ marginLeft: 6 }} />
        </label>
        <label>
          {labels.durationMin}:
          <input type="number" name="durationMin" min={15} step={15} defaultValue={60} style={{ marginLeft: 6, width: 90 }} />
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
        <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
          {selectedStudent
            ? `${labels.studentCoursePrefix}: ${selectedStudent.courseNames.join(", ") || labels.none}`
            : labels.pickStudentFirst}
        </div>
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
            {labels.candidateStats} {filteredTeachers.length} / {labels.matchedStats} {eligibleTeachers.length} / {labels.selectedStats} {selectedTeacherIds.length}
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
          ) : filteredTeachers.length === 0 ? (
            <div style={{ color: "#999" }}>{labels.noMatchedTeachers}</div>
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
