"use client";

import { useMemo, useState } from "react";
import StudentSearchSelect from "./StudentSearchSelect";

type ClassOption = {
  id: string;
  courseId: string;
  courseName: string;
  subjectName?: string | null;
  levelName?: string | null;
  teacherName: string;
  campusName: string;
  roomName?: string | null;
};

type StudentOption = {
  id: string;
  name: string;
  courseNames: string[];
  courseIds: string[];
};

export default function EnrollmentCreateForm({
  classes,
  students,
  labels,
}: {
  classes: ClassOption[];
  students: StudentOption[];
  labels: {
    classLabel: string;
    studentLabel: string;
    searchStudent: string;
    noActivePackage: string;
    mismatchWarn: string;
    confirm: string;
  };
}) {
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [studentId, setStudentId] = useState("");
  const [classQuery, setClassQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ classId: string; studentId: string } | null>(null);

  const filteredClasses = useMemo(() => {
    const q = classQuery.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((c) => {
      const hay = [
        c.courseName,
        c.subjectName ?? "",
        c.levelName ?? "",
        c.teacherName,
        c.campusName,
        c.roomName ?? "",
        c.id,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [classes, classQuery]);

  const effectiveClassId = useMemo(() => {
    if (filteredClasses.some((c) => c.id === classId)) return classId;
    return filteredClasses[0]?.id ?? "";
  }, [filteredClasses, classId]);

  const selectedClass = useMemo(() => classes.find((c) => c.id === effectiveClassId), [classes, effectiveClassId]);
  const selectableStudents = useMemo(() => {
    if (!selectedClass) return students;
    return students.filter((s) => s.courseIds.includes(selectedClass.courseId));
  }, [students, selectedClass]);
  const selectedStudent = useMemo(() => students.find((s) => s.id === studentId), [students, studentId]);
  const hasCourse =
    selectedClass && selectedStudent
      ? selectedStudent.courseIds.includes(selectedClass.courseId)
      : true;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        setError("");
        setCreated(null);
        try {
          const res = await fetch("/api/admin/enrollments", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ classId: effectiveClassId, studentId }),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok || !data?.ok) {
            setError(String(data?.message ?? "Enroll failed"));
            return;
          }
          setCreated({ classId: effectiveClassId, studentId });
        } catch (err: any) {
          setError(String(err?.message ?? "Enroll failed"));
        } finally {
          setSubmitting(false);
        }
      }}
      style={{ display: "grid", gap: 10, maxWidth: 900 }}
    >
      <label>
        {labels.classLabel}:
        <div style={{ margin: "6px 0 6px 8px", color: "#666", fontSize: 12 }}>
          {filteredClasses.length}/{classes.length}
        </div>
        <input
          type="text"
          value={classQuery}
          onChange={(e) => setClassQuery(e.target.value)}
          placeholder="Search class/course/teacher/campus..."
          style={{ marginLeft: 8, minWidth: 680, marginBottom: 6 }}
        />
        <select
          name="classId"
          value={effectiveClassId}
          onChange={(e) => setClassId(e.target.value)}
          style={{ marginLeft: 8, minWidth: 680 }}
        >
          {filteredClasses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.courseName} / {c.subjectName ?? "-"} / {c.levelName ?? "-"} | {c.teacherName} |{" "}
              {c.campusName} / {c.roomName ?? "(none)"}
            </option>
          ))}
        </select>
      </label>

      <label>
        {labels.studentLabel}:
        <div style={{ marginLeft: 8 }}>
          <StudentSearchSelect
            name="studentId"
            placeholder={labels.searchStudent}
            emptyCourseLabel={labels.noActivePackage}
            showEmptyWarning
            onChangeId={setStudentId}
            students={selectableStudents}
          />
          {selectableStudents.length === 0 ? (
            <div style={{ marginTop: 6, fontSize: 12, color: "#b00" }}>{labels.noActivePackage}</div>
          ) : !hasCourse ? (
            <div style={{ marginTop: 6, fontSize: 12, color: "#b00" }}>{labels.mismatchWarn}</div>
          ) : null}
        </div>
      </label>

      <button type="submit" disabled={selectableStudents.length === 0 || submitting}>
        {submitting ? "..." : labels.confirm}
      </button>
      {error ? <div style={{ color: "#b00", fontSize: 12 }}>{error}</div> : null}
      {created ? (
        <div style={{ fontSize: 12, color: "#166534" }}>
          Enrolled: <a href={`/admin/classes/${created.classId}`}>{created.classId}</a> /{" "}
          <a href={`/admin/students/${created.studentId}`}>{created.studentId}</a>
        </div>
      ) : null}
    </form>
  );
}

