"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ClassEditForm from "../../_components/ClassEditForm";
import NoticeBanner from "../../_components/NoticeBanner";

type CourseOption = { id: string; name: string };
type SubjectOption = { id: string; name: string; courseId: string; courseName: string };
type LevelOption = { id: string; name: string; subjectId: string; courseName: string; subjectName: string };
type TeacherOption = { id: string; name: string; subjectCourseId?: string | null; subjectIds: string[] };
type CampusOption = { id: string; name: string };
type RoomOption = { id: string; name: string; campusName: string; campusId: string; capacity: number };

export default function ClassEditClient({
  classId,
  courses,
  subjects,
  levels,
  teachers,
  campuses,
  rooms,
  initial,
  labels,
}: {
  classId: string;
  courses: CourseOption[];
  subjects: SubjectOption[];
  levels: LevelOption[];
  teachers: TeacherOption[];
  campuses: CampusOption[];
  rooms: RoomOption[];
  initial: {
    courseId: string;
    subjectId: string;
    levelId: string | null;
    teacherId: string;
    campusId: string;
    roomId: string | null;
    capacity: number;
  };
  labels: {
    course: string;
    subject: string;
    level: string;
    teacher: string;
    campus: string;
    roomOptional: string;
    capacity: string;
    save: string;
    none: string;
    ok: string;
    error: string;
  };
}) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  return (
    <div>
      {err ? <NoticeBanner type="error" title={labels.error} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={labels.ok} message={msg} /> : null}

      <ClassEditForm
        courses={courses}
        subjects={subjects}
        levels={levels}
        teachers={teachers}
        campuses={campuses}
        rooms={rooms}
        initial={initial}
        labels={{
          course: labels.course,
          subject: labels.subject,
          level: labels.level,
          teacher: labels.teacher,
          campus: labels.campus,
          roomOptional: labels.roomOptional,
          capacity: labels.capacity,
          save: labels.save,
          none: labels.none,
        }}
        onSave={async (payload) => {
          setErr("");
          setMsg("");
          const res = await fetch(`/api/admin/classes/${encodeURIComponent(classId)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok || !data?.ok) {
            setErr(String(data?.message ?? "Save failed"));
            return;
          }
          setMsg("OK");
          router.refresh();
        }}
      />
    </div>
  );
}

