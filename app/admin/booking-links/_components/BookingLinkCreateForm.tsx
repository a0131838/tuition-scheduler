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

export default function BookingLinkCreateForm({
  action,
  students,
  teachers,
}: {
  action: (formData: FormData) => Promise<void>;
  students: StudentOption[];
  teachers: TeacherOption[];
}) {
  const [studentId, setStudentId] = useState("");
  const [query, setQuery] = useState("");
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

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
    <form action={action} style={{ display: "grid", gap: 8, maxWidth: 960, marginBottom: 20 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select name="studentId" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">学生</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <label>
          开始日期:
          <input type="date" name="startDate" style={{ marginLeft: 6 }} />
        </label>
        <label>
          结束日期:
          <input type="date" name="endDate" style={{ marginLeft: 6 }} />
        </label>
        <label>
          时长(分钟):
          <input type="number" name="durationMin" min={15} step={15} defaultValue={60} style={{ marginLeft: 6, width: 90 }} />
        </label>
        <label>
          起始间隔(分钟):
          <input type="number" name="slotStepMin" min={5} step={5} defaultValue={15} style={{ marginLeft: 6, width: 90 }} />
        </label>
        <label>
          失效时间:
          <input type="datetime-local" name="expiresAt" style={{ marginLeft: 6 }} />
        </label>
      </div>

      <input name="title" placeholder="标题（可选）" />
      <textarea name="note" rows={3} placeholder="备注（可选）" />

      <div style={{ border: "1px solid #e8e8e8", borderRadius: 8, padding: 10 }}>
        <div style={{ marginBottom: 6, fontWeight: 600 }}>老师（仅显示可教该学生已购课程）</div>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
          {selectedStudent
            ? `学生已购课程：${selectedStudent.courseNames.join(", ") || "无"}`
            : "先选择学生，再显示可匹配老师"}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索老师或课程"
            style={{ minWidth: 240 }}
            disabled={!selectedStudent}
          />
          <button type="button" onClick={selectAllFiltered} disabled={filteredTeachers.length === 0}>
            勾选当前筛选
          </button>
          <button type="button" onClick={clearFiltered} disabled={filteredTeachers.length === 0}>
            取消当前筛选
          </button>
          <span style={{ fontSize: 12, color: "#666" }}>
            可选 {filteredTeachers.length} / 匹配 {eligibleTeachers.length} / 已选 {selectedTeacherIds.length}
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
            <div style={{ color: "#999" }}>请先选择学生</div>
          ) : filteredTeachers.length === 0 ? (
            <div style={{ color: "#999" }}>没有可匹配老师</div>
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

      <button type="submit" style={{ width: 160 }}>
        创建链接
      </button>
    </form>
  );
}

