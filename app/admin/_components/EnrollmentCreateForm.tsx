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
  action,
  classes,
  students,
  labels,
}: {
  action: (formData: FormData) => Promise<void>;
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
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");

  const selectedClass = useMemo(() => classes.find((c) => c.id === classId), [classes, classId]);
  const selectedStudent = useMemo(() => students.find((s) => s.id === studentId), [students, studentId]);
  const hasCourse =
    selectedClass && selectedStudent
      ? selectedStudent.courseIds.includes(selectedClass.courseId)
      : true;

  return (
    <form action={action} style={{ display: "grid", gap: 10, maxWidth: 900 }}>
      <label>
        {labels.classLabel}:
        <select
          name="classId"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          style={{ marginLeft: 8, minWidth: 680 }}
        >
          {classes.map((c) => (
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
            students={students}
          />
          {!hasCourse ? (
            <div style={{ marginTop: 6, fontSize: 12, color: "#b00" }}>{labels.mismatchWarn}</div>
          ) : null}
        </div>
      </label>

      <button type="submit">{labels.confirm}</button>
    </form>
  );
}

