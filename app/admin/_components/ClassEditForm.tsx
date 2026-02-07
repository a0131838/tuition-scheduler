"use client";

import { useMemo, useState, useEffect } from "react";

type CourseOption = { id: string; name: string };
type SubjectOption = { id: string; name: string; courseId: string; courseName: string };
type LevelOption = { id: string; name: string; subjectId: string; courseName: string; subjectName: string };
type TeacherOption = { id: string; name: string; subjectCourseId?: string | null; subjectIds: string[] };
type CampusOption = { id: string; name: string };
type RoomOption = { id: string; name: string; campusName: string; campusId: string; capacity: number };

export default function ClassEditForm(props: {
  action: (formData: FormData) => void;
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
  };
}) {
  const { courses, subjects, levels, teachers, campuses, rooms, action, labels, initial } = props;
  const [courseId, setCourseId] = useState(initial.courseId || courses[0]?.id || "");
  const [subjectId, setSubjectId] = useState(initial.subjectId || subjects[0]?.id || "");
  const [levelId, setLevelId] = useState(initial.levelId ?? "");
  const eligibleTeachers = useMemo(() => {
    if (!subjectId) return teachers;
    return teachers.filter((t) => t.subjectCourseId === subjectId || t.subjectIds.includes(subjectId));
  }, [teachers, subjectId]);
  const [teacherId, setTeacherId] = useState(initial.teacherId || eligibleTeachers[0]?.id || "");
  const [campusId, setCampusId] = useState(initial.campusId || campuses[0]?.id || "");
  const [roomId, setRoomId] = useState(initial.roomId ?? "");
  const [capacity, setCapacity] = useState(String(initial.capacity));
  useEffect(() => {
    if (!courseId) return;
    const currentInCourse = subjects.some((s) => s.courseId === courseId && s.id === subjectId);
    if (currentInCourse) return;
    const first = subjects.find((s) => s.courseId === courseId);
    setSubjectId(first?.id ?? "");
  }, [courseId, subjects]);
  const filteredLevels = useMemo(
    () => levels.filter((l) => l.subjectId === subjectId),
    [levels, subjectId]
  );
  useEffect(() => {
    if (levelId && !filteredLevels.some((l) => l.id === levelId)) {
      setLevelId("");
    }
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
    if (roomId && !filteredRooms.some((r) => r.id === roomId)) {
      setRoomId("");
    }
  }, [roomId, filteredRooms]);
  const selectedRoom = useMemo(() => filteredRooms.find((r) => r.id === roomId) ?? null, [filteredRooms, roomId]);
  const capacityNum = Number(capacity);
  const overCapacity =
    Boolean(selectedRoom) && Number.isFinite(capacityNum) && capacityNum > 0 && capacityNum > (selectedRoom?.capacity ?? 0);

  return (
    <form action={action} style={{ display: "grid", gap: 8, maxWidth: 860, marginBottom: 16 }}>
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
          Room capacity limit / 教室容量上限: {selectedRoom.capacity}
          {overCapacity ? " (Current class capacity exceeds room limit / 当前班级容量超出教室上限)" : ""}
        </div>
      ) : null}

      <button type="submit" disabled={eligibleTeachers.length === 0 || overCapacity}>{labels.save}</button>
      {eligibleTeachers.length === 0 ? (
        <div style={{ color: "#b00", fontSize: 12 }}>
          No eligible teachers for selected subject / 当前科目没有可授课老师
        </div>
      ) : null}
    </form>
  );
}
