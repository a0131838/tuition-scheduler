"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import NoticeBanner from "@/app/admin/_components/NoticeBanner";

type CourseOption = { id: string; name: string };

type SubjectOption = {
  id: string;
  name: string;
  courseName: string;
  courseId: string;
};

type LevelOption = {
  id: string;
  name: string;
  subjectId: string;
  subjectName: string;
  courseName: string;
};

type CampusOption = {
  id: string;
  name: string;
  isOnline: boolean;
};

type RoomOption = {
  id: string;
  name: string;
  campusId: string;
};

type Labels = {
  title: string;
  open: string;
  course: string;
  subject: string;
  level: string;
  campus: string;
  room: string;
  roomOptional: string;
  start: string;
  duration: string;
  find: string;
  close: string;
  teacher: string;
  status: string;
  action: string;
  available: string;
  noTeachers: string;
  chooseHint: string;
  schedule: string;
  roomRequiredOffline: string;
};

export default function QuickScheduleModal({
  studentId,
  month,
  quickSubjectId,
  quickLevelId,
  quickStartAt,
  quickDurationMin,
  quickCampusId,
  quickRoomId,
  subjects,
  levels,
  campuses,
  rooms,
  candidates,
  scheduleUrl,
  labels,
  openOnLoad,
  warning,
}: {
  studentId: string;
  month: string;
  quickSubjectId: string;
  quickLevelId: string;
  quickStartAt: string;
  quickDurationMin: number;
  quickCampusId: string;
  quickRoomId: string;
  subjects: SubjectOption[];
  levels: LevelOption[];
  campuses: CampusOption[];
  rooms: RoomOption[];
  candidates: { id: string; name: string; ok: boolean; reason?: string }[];
  scheduleUrl: string;
  labels: Labels;
  openOnLoad: boolean;
  warning?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isFinding, startFinding] = useTransition();
  const [isScheduling, setIsScheduling] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [scheduleErr, setScheduleErr] = useState("");
  const [scheduleMsg, setScheduleMsg] = useState("");
  const [formWarn, setFormWarn] = useState("");
  const courses = useMemo<CourseOption[]>(() => {
    const map = new Map<string, string>();
    for (const s of subjects) map.set(s.courseId, s.courseName);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [subjects]);
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState(quickSubjectId || "");
  const [levelId, setLevelId] = useState(quickLevelId || "");
  const [campusId, setCampusId] = useState(quickCampusId || "");
  const [roomId, setRoomId] = useState(quickRoomId || "");
  const [startAt, setStartAt] = useState(quickStartAt || "");
  const [durationMin, setDurationMin] = useState(String(quickDurationMin || 60));
  const baseHref = useMemo(() => {
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    const q = params.toString();
    return q ? `/admin/students/${studentId}?${q}` : `/admin/students/${studentId}`;
  }, [studentId, month]);
  const resetFormState = () => {
    const firstCourseId = courses[0]?.id ?? "";
    const firstSubjectId = subjects.find((s) => !firstCourseId || s.courseId === firstCourseId)?.id ?? "";
    setCourseId(firstCourseId);
    setSubjectId(firstSubjectId);
    setLevelId("");
    setCampusId("");
    setRoomId("");
    setStartAt("");
    setDurationMin("60");
  };
  const closeAndClear = () => {
    dialogRef.current?.close();
    resetFormState();
    setScheduleErr("");
    setScheduleMsg("");
    startFinding(() => {
      router.replace(baseHref);
    });
  };

  function scheduleWithTeacher(teacherId: string) {
    if (!canSchedule) return;
    setScheduleErr("");
    setScheduleMsg("");
    setIsScheduling(true);
    (async () => {
      try {
        const res = await fetch(scheduleUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacherId,
            subjectId,
            levelId,
            campusId,
            roomId,
            startAt,
            durationMin: Number(durationMin),
          }),
        });
        const raw = await res.text();
        let data: any = null;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch {
          data = null;
        }
        if (!res.ok || !data?.ok) {
          const detail = String(data?.detail ?? "").trim();
          const message =
            String(data?.message ?? "").trim() ||
            (raw ? raw.slice(0, 240) : "") ||
            `Schedule failed (HTTP ${res.status})`;
          setScheduleErr(detail ? `${message}: ${detail}` : message);
          return;
        }
        setScheduleMsg("OK");
        dialogRef.current?.close();
        const params = new URLSearchParams(searchParams?.toString() ?? "");
        params.delete("err");
        params.delete("quickOpen");
        params.delete("quickCourseId");
        params.delete("quickSubjectId");
        params.delete("quickLevelId");
        params.delete("quickCampusId");
        params.delete("quickRoomId");
        params.delete("quickStartAt");
        params.delete("quickDurationMin");
        params.set("msg", "Scheduled");
        const target = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        router.replace(target, { scroll: false });
        // Refresh the student page so the newly scheduled session appears.
        router.refresh();
      } catch {
        setScheduleErr("Schedule failed: network or server error");
      } finally {
        setIsScheduling(false);
      }
    })();
  }
  const campusIsOnline = useMemo(() => {
    if (!campusId) return false;
    return campuses.find((c) => c.id === campusId)?.isOnline ?? false;
  }, [campusId, campuses]);

  const canSchedule = useMemo(() => {
    return Boolean(subjectId && campusId && (roomId || campusIsOnline) && startAt && durationMin);
  }, [subjectId, campusId, roomId, campusIsOnline, startAt, durationMin]);

  const levelOptions = useMemo(() => {
    if (!subjectId) return levels;
    return levels.filter((l) => l.subjectId === subjectId);
  }, [levels, subjectId]);

  const roomOptions = useMemo(() => {
    if (!campusId) return rooms;
    return rooms.filter((r) => r.campusId === campusId);
  }, [rooms, campusId]);

  useEffect(() => {
    if (openOnLoad) {
      dialogRef.current?.showModal();
    }
  }, [openOnLoad]);

  useEffect(() => {
    if (!courseId) return;
    const options = subjects.filter((s) => s.courseId === courseId);
    if (options.length === 0) {
      setSubjectId("");
      return;
    }
    const existsInCourse = options.some((s) => s.id === subjectId);
    if (!existsInCourse) {
      setSubjectId(options[0]!.id);
    }
  }, [courseId, subjects, subjectId]);

  useEffect(() => {
    if (levelId && !levelOptions.some((l) => l.id === levelId)) {
      setLevelId("");
    }
  }, [levelId, levelOptions]);

  useEffect(() => {
    setSubjectId(quickSubjectId || "");
    setLevelId(quickLevelId || "");
    setCampusId(quickCampusId || "");
    setRoomId(quickRoomId || "");
    setStartAt(quickStartAt || "");
    setDurationMin(String(quickDurationMin || 60));
    const quickCourseId = subjects.find((s) => s.id === quickSubjectId)?.courseId;
    const first = subjects.find((s) => s.courseId === (quickCourseId ?? courses[0]?.id ?? ""));
    setCourseId(first?.courseId ?? quickCourseId ?? courses[0]?.id ?? "");
  }, [quickSubjectId, quickLevelId, quickCampusId, quickRoomId, quickStartAt, quickDurationMin, subjects, courses]);

  function submitFind(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormWarn("");
    if (campusId && !campusIsOnline && !roomId) {
      setFormWarn(labels.roomRequiredOffline);
      return;
    }
    const params = new URLSearchParams();
    params.set("month", month);
    params.set("quickOpen", "1");
    if (courseId) params.set("quickCourseId", courseId);
    if (subjectId) params.set("quickSubjectId", subjectId);
    if (levelId) params.set("quickLevelId", levelId);
    if (campusId) params.set("quickCampusId", campusId);
    if (roomId) params.set("quickRoomId", roomId);
    if (startAt) params.set("quickStartAt", startAt);
    if (durationMin) params.set("quickDurationMin", durationMin);
    startFinding(() => {
      router.replace(`/admin/students/${studentId}?${params.toString()}`);
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <button type="button" onClick={() => dialogRef.current?.showModal()}>
        {labels.open}
      </button>
      <dialog
        ref={dialogRef}
        style={{ padding: 16, borderRadius: 8, border: "1px solid #ddd" }}
        onClose={() => {
          setScheduleErr("");
          setScheduleMsg("");
          setFormWarn("");
          resetFormState();
        }}
      >
        <h3 style={{ marginTop: 0 }}>{labels.title}</h3>
        <form onSubmit={submitFind} style={{ display: "grid", gap: 10 }}>
          <label>
            {labels.course}:
            <select
              name="quickCourseId"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              style={{ marginLeft: 6, minWidth: 260 }}
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
              name="quickSubjectId"
              value={subjectId}
              onChange={(e) => {
                const next = e.target.value;
                setSubjectId(next);
                if (levelId && !levels.some((l) => l.id === levelId && l.subjectId === next)) {
                  setLevelId("");
                }
              }}
              style={{ marginLeft: 6, minWidth: 260 }}
            >
              <option value="">{labels.subject}</option>
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
              name="quickLevelId"
              value={levelId}
              onChange={(e) => setLevelId(e.target.value)}
              style={{ marginLeft: 6, minWidth: 260 }}
            >
              <option value="">{labels.level}</option>
              {levelOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.courseName} - {l.subjectName} - {l.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {labels.campus}:
            <select
              name="quickCampusId"
              value={campusId}
              onChange={(e) => {
                const next = e.target.value;
                setCampusId(next);
                setFormWarn("");
                if (next && roomId && !rooms.some((r) => r.id === roomId && r.campusId === next)) {
                  setRoomId("");
                }
              }}
              style={{ marginLeft: 6, minWidth: 220 }}
            >
              <option value="">{labels.campus}</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {labels.room}:
            <select
              name="quickRoomId"
              value={roomId}
              onChange={(e) => {
                setRoomId(e.target.value);
                setFormWarn("");
              }}
              style={{ marginLeft: 6, minWidth: 220 }}
            >
              <option value="">{campusIsOnline ? `${labels.room} (${labels.roomOptional})` : labels.room}</option>
              {roomOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {labels.start}:
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              style={{ marginLeft: 6 }}
            />
          </label>
          <label>
            {labels.duration}:
            <input
              type="number"
              min={15}
              step={15}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              style={{ marginLeft: 6, width: 120 }}
            />
          </label>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => {
                closeAndClear();
              }}
            >
              {labels.close}
            </button>
            <button type="submit" disabled={isFinding}>
              {isFinding ? `${labels.find}...` : labels.find}
            </button>
          </div>
        </form>
        <div style={{ marginTop: 12 }}>
          {warning ? (
            <NoticeBanner type="warn" title={labels.status} message={warning} />
          ) : formWarn ? (
            <NoticeBanner type="warn" title={labels.status} message={formWarn} />
          ) : scheduleErr ? (
            <NoticeBanner type="error" title={labels.status} message={scheduleErr} />
          ) : scheduleMsg ? (
            <NoticeBanner type="success" title={labels.status} message={scheduleMsg} />
          ) : subjectId && campusId && (roomId || campusIsOnline) && startAt ? (
            candidates.length === 0 ? (
              <div style={{ color: "#999" }}>{labels.noTeachers}</div>
            ) : (
              <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr style={{ background: "#f5f5f5" }}>
                    <th align="left">{labels.teacher}</th>
                    <th align="left">{labels.status}</th>
                    <th align="left">{labels.action}</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
                      <td>{c.name}</td>
                      <td style={{ color: c.ok ? "#0a7" : "#b00", fontWeight: c.ok ? 600 : 400 }}>
                        {c.ok ? labels.available : c.reason}
                      </td>
                      <td>
                        {c.ok ? (
                          <button type="button" onClick={() => scheduleWithTeacher(c.id)} disabled={isScheduling}>
                            {isScheduling ? `${labels.schedule}...` : labels.schedule}
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            <div style={{ color: "#999" }}>{labels.chooseHint}</div>
          )}
        </div>
      </dialog>
    </div>
  );
}
