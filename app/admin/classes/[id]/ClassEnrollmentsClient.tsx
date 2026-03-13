"use client";

import { useEffect, useMemo, useState } from "react";
import NoticeBanner from "../../_components/NoticeBanner";

type StudentOption = {
  id: string;
  name: string;
  grade: string | null;
  hasEligiblePackage: boolean;
};

type EnrollmentRow = {
  id: string;
  studentId: string;
  studentName: string;
  studentGrade: string | null;
};

type EnrollmentPreview = {
  canEnroll: boolean;
  studentName: string;
  studentGrade: string | null;
  reasonCode: "OK" | "ALREADY_ENROLLED" | "COURSE_CONFLICT" | "NO_ACTIVE_PACKAGE";
  reasonText: string;
  detail: string | null;
};

function humanizeEnrollmentError(data: any) {
  const code = String(data?.code ?? "");
  if (code === "ALREADY_ENROLLED") {
    return "该学生已经在当前班级，无需重复添加。";
  }
  if (code === "COURSE_CONFLICT") {
    const detail = String(data?.detail ?? "").trim();
    return detail ? `该学生已报名同老师冲突班级：${detail}` : "该学生已报名同老师的同课程/同科目班级。";
  }
  if (code === "NO_ACTIVE_PACKAGE") {
    return "该学生当前没有这个课程的有效课包，暂时不能加入班级。";
  }
  return String(data?.message ?? "Add enrollment failed");
}

export default function ClassEnrollmentsClient({
  classId,
  initialStudents,
  initialEnrollments,
  labels,
}: {
  classId: string;
  initialStudents: StudentOption[];
  initialEnrollments: EnrollmentRow[];
  labels: {
    enrollments: string;
    selectStudent: string;
    add: string;
    remove: string;
    noEnrollments: string;
    ok: string;
    error: string;
  };
}) {
  const [students, setStudents] = useState<StudentOption[]>(initialStudents);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>(initialEnrollments);
  const [search, setSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [preview, setPreview] = useState<EnrollmentPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const enrollmentMap = useMemo(() => new Map(enrollments.map((e) => [e.studentId, e])), [enrollments]);
  const selectedStudent = useMemo(() => students.find((s) => s.id === selectedStudentId) ?? null, [selectedStudentId, students]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? students.filter((s) => s.name.toLowerCase().includes(q))
      : students;
    return list.slice(0, 8);
  }, [search, students]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedStudentId) {
      setPreview(null);
      return;
    }

    const existing = enrollmentMap.get(selectedStudentId);
    if (existing) {
      setPreview({
        canEnroll: false,
        studentName: existing.studentName,
        studentGrade: existing.studentGrade,
        reasonCode: "ALREADY_ENROLLED",
        reasonText: "该学生已经在当前班级，无需重复添加。",
        detail: null,
      });
      return;
    }

    setPreviewLoading(true);
    setPreview(null);

    fetch(`/api/admin/classes/${classId}/enrollment-preview?studentId=${encodeURIComponent(selectedStudentId)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !data?.ok) {
          setPreview({
            canEnroll: false,
            studentName: selectedStudent?.name ?? selectedStudentId,
            studentGrade: selectedStudent?.grade ?? null,
            reasonCode: "NO_ACTIVE_PACKAGE",
            reasonText: String(data?.message ?? "预检查失败"),
            detail: null,
          });
          return;
        }
        setPreview(data.preview as EnrollmentPreview);
      })
      .catch(() => {
        if (cancelled) return;
        setPreview({
          canEnroll: false,
          studentName: selectedStudent?.name ?? selectedStudentId,
          studentGrade: selectedStudent?.grade ?? null,
          reasonCode: "NO_ACTIVE_PACKAGE",
          reasonText: "预检查失败，请稍后重试。",
          detail: null,
        });
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [classId, enrollmentMap, selectedStudent?.grade, selectedStudent?.name, selectedStudentId]);

  async function add() {
    setErr("");
    setMsg("");
    const studentId = selectedStudentId;
    if (!studentId) return;

    const res = await fetch("/api/admin/enrollments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, studentId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setErr(humanizeEnrollmentError(data));
      return;
    }

    const row = students.find((s) => s.id === studentId);
    setEnrollments((prev) => [
      { id: data.enrollment.id, studentId, studentName: row?.name ?? studentId, studentGrade: row?.grade ?? null },
      ...prev,
    ]);
    setSelectedStudentId("");
    setSearch("");
    setPreview(null);
    setMsg("报名已添加。");
  }

  async function remove(studentId: string) {
    setErr("");
    setMsg("");

    const res = await fetch("/api/admin/enrollments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, studentId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setErr(String(data?.message ?? "Remove enrollment failed"));
      return;
    }

    setEnrollments((prev) => prev.filter((e) => e.studentId !== studentId));
    setMsg("报名已移除。");
  }

  return (
    <div>
      <h3>{labels.enrollments}</h3>
      {err ? <NoticeBanner type="error" title={labels.error} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={labels.ok} message={msg} /> : null}

      <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 10, background: "#fafafa", marginBottom: 8 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedStudentId("");
              setPreview(null);
            }}
            placeholder={labels.selectStudent}
            style={{ maxWidth: 320 }}
          />
          {search.trim().length >= 1 ? (
            <div style={{ display: "grid", gap: 6 }}>
              {filteredStudents.length === 0 ? (
                <div style={{ color: "#777", fontSize: 13 }}>未找到匹配学生。</div>
              ) : (
                filteredStudents.map((s) => {
                  const enrolled = enrollmentMap.has(s.id);
                  const selected = selectedStudentId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedStudentId(s.id)}
                      style={{
                        textAlign: "left",
                        border: selected ? "1px solid #6b8cff" : "1px solid #e5e7eb",
                        background: selected ? "#eef3ff" : "#fff",
                        borderRadius: 8,
                        padding: "8px 10px",
                        cursor: "pointer",
                        maxWidth: 420,
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: "#555" }}>
                        年级：{s.grade ?? "-"} | {enrolled ? "已在当前班级" : s.hasEligiblePackage ? "有可用课包" : "暂无可用课包"}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ) : null}

          {selectedStudent ? (
            <div style={{ border: "1px solid #dbe4ff", background: "#f7f9ff", borderRadius: 8, padding: 10, maxWidth: 520 }}>
              <div style={{ fontWeight: 700 }}>报名前预检查</div>
              <div>学生：{preview?.studentName ?? selectedStudent.name}</div>
              <div>年级：{preview?.studentGrade ?? selectedStudent.grade ?? "-"}</div>
              {previewLoading ? <div style={{ color: "#666" }}>正在检查课包和冲突...</div> : null}
              {preview ? (
                <>
                  <div style={{ color: preview.canEnroll ? "#0a7a33" : "#b42318", fontWeight: 600 }}>
                    {preview.canEnroll ? "可报名" : preview.reasonText}
                  </div>
                  {preview.detail ? <div style={{ fontSize: 12, color: "#555" }}>详情：{preview.detail}</div> : null}
                </>
              ) : null}
            </div>
          ) : null}

          <div>
            <button type="button" onClick={add} disabled={!selectedStudentId || previewLoading || !preview?.canEnroll}>
              {labels.add}
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {enrollments.length === 0 ? (
          <div style={{ color: "#999" }}>{labels.noEnrollments}</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
            {enrollments.map((e) => (
              <div key={e.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10, background: "#fff" }}>
                <div style={{ fontWeight: 700 }}>{e.studentName}</div>
                <div style={{ fontSize: 12, color: "#555" }}>年级：{e.studentGrade ?? "-"}</div>
                <div style={{ marginTop: 6 }}>
                  <button type="button" onClick={() => remove(e.studentId)}>
                    {labels.remove}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
