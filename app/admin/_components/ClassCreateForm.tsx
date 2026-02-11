"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type CourseOption = { id: string; name: string };
type SubjectOption = { id: string; name: string; courseId: string; courseName: string };
type LevelOption = { id: string; name: string; subjectId: string; courseName: string; subjectName: string };
type TeacherOption = { id: string; name: string; subjectCourseId?: string | null; subjectIds: string[] };
type CampusOption = { id: string; name: string };
type RoomOption = { id: string; name: string; campusName: string; campusId: string; capacity: number };

export default function ClassCreateForm(props: {
  courses: CourseOption[];
  subjects: SubjectOption[];
  levels: LevelOption[];
  teachers: TeacherOption[];
  campuses: CampusOption[];
  rooms: RoomOption[];
  labels: {
    course: string;
    subject: string;
    level: string;
    teacher: string;
    campus: string;
    roomOptional: string;
    capacity: string;
    create: string;
    none: string;
  };
}) {
  const { courses, subjects, levels, teachers, campuses, rooms, labels } = props;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState(
    subjects.find((s) => s.courseId === (courses[0]?.id ?? ""))?.id ?? subjects[0]?.id ?? ""
  );
  const [levelId, setLevelId] = useState("");

  const eligibleTeachers = useMemo(() => {
    if (!subjectId) return teachers;
    return teachers.filter((t) => t.subjectCourseId === subjectId || t.subjectIds.includes(subjectId));
  }, [teachers, subjectId]);
  const [teacherId, setTeacherId] = useState(eligibleTeachers[0]?.id ?? "");

  const [campusId, setCampusId] = useState(campuses[0]?.id ?? "");
  const [roomId, setRoomId] = useState("");
  const [capacity, setCapacity] = useState("6");

  useEffect(() => {
    if (!courseId) return;
    const currentInCourse = subjects.some((s) => s.courseId === courseId && s.id === subjectId);
    if (currentInCourse) return;
    const first = subjects.find((s) => s.courseId === courseId);
    setSubjectId(first?.id ?? "");
  }, [courseId, subjects, subjectId]);

  const filteredLevels = useMemo(() => levels.filter((l) => l.subjectId === subjectId), [levels, subjectId]);
  useEffect(() => {
    if (levelId && !filteredLevels.some((l) => l.id === levelId)) setLevelId("");
  }, [levelId, filteredLevels]);

  useEffect(() => {
    if (teacherId && eligibleTeachers.some((t) => t.id === teacherId)) return;
    setTeacherId(eligibleTeachers[0]?.id ?? "");
  }, [eligibleTeachers, teacherId]);

  const filteredRooms = useMemo(() => {
    if (!campusId) return rooms;
    return rooms.filter((r) => r.campusId === campusId);
  }, [rooms, campusId]);
  useEffect(() => {
    if (roomId && !filteredRooms.some((r) => r.id === roomId)) setRoomId("");
  }, [roomId, filteredRooms]);

  const selectedRoom = useMemo(() => filteredRooms.find((r) => r.id === roomId) ?? null, [filteredRooms, roomId]);
  const capacityNum = Number(capacity);
  const overCapacity =
    Boolean(selectedRoom) &&
    Number.isFinite(capacityNum) &&
    capacityNum > 0 &&
    capacityNum > (selectedRoom?.capacity ?? 0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (submitting) return;
        const formEl = e.currentTarget as HTMLFormElement;
        setSubmitting(true);
        setError("");
        setCreatedId("");
        try {
          const res = await fetch("/api/admin/classes", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              subjectId,
              levelId: levelId || null,
              teacherId,
              campusId,
              roomId: roomId || null,
              capacity: Number(capacity),
            }),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok || !data?.ok) {
            setError(String(data?.message ?? "Create failed"));
            return;
          }
          setCreatedId(String(data.classId ?? ""));
          const dlg =
            formEl.closest("dialog") ??
            (formEl.ownerDocument?.querySelector("dialog[open]") as HTMLDialogElement | null);
          dlg?.close();
          const params = new URLSearchParams(searchParams?.toString() ?? "");
          params.delete("err");
          params.set("msg", `Class created: ${String(data.classId ?? "")}`);
          const target = params.toString() ? `${pathname}?${params.toString()}` : pathname;
          router.push(target, { scroll: false });
          router.refresh();
        } catch (err: any) {
          setError(String(err?.message ?? "Create failed"));
        } finally {
          setSubmitting(false);
        }
      }}
      style={{ display: "grid", gap: 8, maxWidth: 860 }}
    >
      <label>
        {labels.course}:
        <select
          name="courseId"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          style={{ marginLeft: 8, minWidth: 360 }}
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        {labels.subject}:
        <select
          name="subjectId"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          style={{ marginLeft: 8, minWidth: 360 }}
        >
          {subjects
            .filter((s) => !courseId || s.courseId === courseId)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.courseName} - {s.name}
              </option>
            ))}
        </select>
      </label>

      <label>
        {labels.level}:
        <select
          name="levelId"
          value={levelId}
          onChange={(e) => setLevelId(e.target.value)}
          style={{ marginLeft: 8, minWidth: 360 }}
        >
          <option value="">{labels.none}</option>
          {filteredLevels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.courseName} - {l.subjectName} - {l.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        {labels.teacher}:
        <select
          name="teacherId"
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          style={{ marginLeft: 8, minWidth: 320 }}
        >
          {eligibleTeachers.map((tch) => (
            <option key={tch.id} value={tch.id}>
              {tch.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        {labels.campus}:
        <select
          name="campusId"
          value={campusId}
          onChange={(e) => setCampusId(e.target.value)}
          style={{ marginLeft: 8, minWidth: 320 }}
        >
          {campuses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        {labels.roomOptional}:
        <select
          name="roomId"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          style={{ marginLeft: 8, minWidth: 420 }}
        >
          <option value="">{labels.none}</option>
          {filteredRooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} - {r.campusName}
            </option>
          ))}
        </select>
      </label>

      <label>
        {labels.capacity}:
        <input
          name="capacity"
          type="number"
          min={1}
          max={selectedRoom?.capacity}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          style={{ marginLeft: 8, width: 120 }}
        />
      </label>

      {selectedRoom ? (
        <div style={{ fontSize: 12, color: overCapacity ? "#b00" : "#666" }}>
          Room capacity limit: {selectedRoom.capacity}
          {overCapacity ? " (Current class capacity exceeds room limit)" : ""}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={
          subjects.length === 0 ||
          teachers.length === 0 ||
          campuses.length === 0 ||
          eligibleTeachers.length === 0 ||
          overCapacity ||
          submitting
        }
      >
        {submitting ? "..." : labels.create}
      </button>

      {error ? <div style={{ color: "#b00", fontSize: 12 }}>{error}</div> : null}
      {createdId ? (
        <div style={{ fontSize: 12, color: "#166534" }}>
          Created: <a href={`/admin/classes/${createdId}`}>{createdId}</a>
        </div>
      ) : null}

      {eligibleTeachers.length === 0 ? (
        <div style={{ color: "#b00", fontSize: 12 }}>No eligible teachers for selected subject</div>
      ) : null}
    </form>
  );
}
