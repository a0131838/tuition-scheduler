"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import NoticeBanner from "@/app/admin/_components/NoticeBanner";
import { campusRequiresRoom } from "@/lib/campus";
import DateTimeSplitInput from "@/app/_components/DateTimeSplitInput";

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
  requiresRoom: boolean;
};

type RoomOption = {
  id: string;
  name: string;
  campusId: string;
};

type Labels = {
  title: string;
  open: string;
  mode: string;
  modeCreate: string;
  modeReschedule: string;
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
  preview: string;
  previewTitle: string;
  repeatWeeks: string;
  onConflict: string;
  rejectImmediately: string;
  skipConflicts: string;
  noTeachers: string;
  chooseHint: string;
  schedule: string;
  roomRequiredOffline: string;
  targetSession: string;
  targetScope: string;
  newStart: string;
  newDuration: string;
  thisSessionOnly: string;
  futureSessions: string;
};

type SessionOption = {
  id: string;
  classId: string;
  label: string;
  startAt: string;
  durationMin: number;
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
  sessionOptions,
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
  sessionOptions: SessionOption[];
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
  const [mode, setMode] = useState<"create" | "reschedule">("create");
  const [repeatWeeks, setRepeatWeeks] = useState("1");
  const [onConflict, setOnConflict] = useState<"reject" | "skip">("reject");
  const [previewRows, setPreviewRows] = useState<Array<{ index: number; startAt: string; endAt: string; ok: boolean; reason?: string }>>([]);
  const [selectedSessionId, setSelectedSessionId] = useState(sessionOptions[0]?.id ?? "");
  const [rescheduleScope, setRescheduleScope] = useState<"single" | "future">("single");
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
    setRepeatWeeks("1");
    setOnConflict("reject");
    setPreviewRows([]);
    setMode("create");
    setSelectedSessionId(sessionOptions[0]?.id ?? "");
    setRescheduleScope("single");
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
    setPreviewRows([]);
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
            mode: "create",
            repeatWeeks: Number(repeatWeeks),
            onConflict,
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
        setScheduleMsg(`OK (${data?.created ?? 0}/${data?.total ?? Number(repeatWeeks)})`);
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

  function previewWithTeacher(teacherId: string) {
    if (!canSchedule) return;
    setScheduleErr("");
    setScheduleMsg("");
    setPreviewRows([]);
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
            mode: "preview",
            repeatWeeks: Number(repeatWeeks),
            onConflict,
          }),
        });
        const data = (await res.json().catch(() => null)) as any;
        if (!res.ok || !data?.ok) {
          setScheduleErr(String(data?.message ?? `Preview failed (HTTP ${res.status})`));
          return;
        }
        setPreviewRows(Array.isArray(data?.rows) ? data.rows : []);
        setScheduleMsg("");
      } catch {
        setScheduleErr("Preview failed: network or server error");
      } finally {
        setIsScheduling(false);
      }
    })();
  }

  async function rescheduleSession() {
    if (!selectedSessionId || !startAt || !durationMin) return;
    const selected = sessionOptions.find((x) => x.id === selectedSessionId);
    if (!selected) return;
    setScheduleErr("");
    setScheduleMsg("");
    setIsScheduling(true);
    try {
      const res = await fetch(`/api/admin/classes/${encodeURIComponent(selected.classId)}/sessions/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          startAt,
          durationMin: Number(durationMin),
          scope: rescheduleScope,
        }),
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok || !data?.ok) {
        setScheduleErr(String(data?.message ?? `Reschedule failed (HTTP ${res.status})`));
        return;
      }
      setScheduleMsg(`OK (${data?.rescheduled ?? 0})`);
      dialogRef.current?.close();
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("msg", "Rescheduled");
      const target = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(target, { scroll: false });
      router.refresh();
    } catch {
      setScheduleErr("Reschedule failed: network or server error");
    } finally {
      setIsScheduling(false);
    }
  }
  const selectedCampus = useMemo(() => {
    if (!campusId) return null;
    return campuses.find((c) => c.id === campusId) ?? null;
  }, [campusId, campuses]);
  const roomRequired = useMemo(() => campusRequiresRoom(selectedCampus), [selectedCampus]);

  const canSchedule = useMemo(() => {
    return Boolean(subjectId && campusId && (roomId || !roomRequired) && startAt && durationMin);
  }, [subjectId, campusId, roomId, roomRequired, startAt, durationMin]);

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
    if (sessionOptions.length === 0) {
      setSelectedSessionId("");
      return;
    }
    if (!sessionOptions.some((s) => s.id === selectedSessionId)) {
      setSelectedSessionId(sessionOptions[0]!.id);
    }
  }, [sessionOptions, selectedSessionId]);

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
    if (campusId && roomRequired && !roomId) {
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
            {labels.mode}:
            <select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value === "reschedule" ? "reschedule" : "create");
                setScheduleErr("");
                setScheduleMsg("");
                setPreviewRows([]);
              }}
              style={{ marginLeft: 6, minWidth: 220 }}
            >
              <option value="create">{labels.modeCreate}</option>
              <option value="reschedule">{labels.modeReschedule}</option>
            </select>
          </label>
          {mode === "create" ? (
            <>
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
                  <option value="">{roomRequired ? labels.room : `${labels.room} (${labels.roomOptional})`}</option>
                  {roomOptions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <label>
              {labels.targetSession}:
              <select value={selectedSessionId} onChange={(e) => setSelectedSessionId(e.target.value)} style={{ marginLeft: 6, minWidth: 420 }}>
                {sessionOptions.length === 0 ? (
                  <option value="">-</option>
                ) : (
                  sessionOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))
                )}
              </select>
            </label>
          )}
          <label>
            {mode === "create" ? labels.start : labels.newStart}:
            <DateTimeSplitInput
              value={startAt}
              onChange={setStartAt}
              wrapperStyle={{ marginLeft: 6 }}
            />
          </label>
          <label>
            {mode === "create" ? labels.duration : labels.newDuration}:
            <input
              type="number"
              min={15}
              step={15}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              style={{ marginLeft: 6, width: 120 }}
            />
          </label>
          {mode === "create" ? (
            <>
              <label>
                {labels.repeatWeeks}:
                <input type="number" min={1} max={16} value={repeatWeeks} onChange={(e) => setRepeatWeeks(e.target.value)} style={{ marginLeft: 6, width: 120 }} />
              </label>
              <label>
                {labels.onConflict}:
                <select value={onConflict} onChange={(e) => setOnConflict(e.target.value === "skip" ? "skip" : "reject")} style={{ marginLeft: 6, minWidth: 220 }}>
                  <option value="reject">{labels.rejectImmediately}</option>
                  <option value="skip">{labels.skipConflicts}</option>
                </select>
              </label>
            </>
          ) : (
            <label>
              {labels.targetScope}:
              <select value={rescheduleScope} onChange={(e) => setRescheduleScope(e.target.value === "future" ? "future" : "single")} style={{ marginLeft: 6, minWidth: 220 }}>
                <option value="single">{labels.thisSessionOnly}</option>
                <option value="future">{labels.futureSessions}</option>
              </select>
            </label>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => {
                closeAndClear();
              }}
            >
              {labels.close}
            </button>
            {mode === "create" ? (
              <button type="submit" disabled={isFinding}>
                {isFinding ? `${labels.find}...` : labels.find}
              </button>
            ) : (
              <button type="button" disabled={isScheduling || !selectedSessionId || !startAt} onClick={rescheduleSession}>
                {isScheduling ? `${labels.modeReschedule}...` : labels.modeReschedule}
              </button>
            )}
          </div>
        </form>
        <div style={{ marginTop: 12 }}>
          {warning ? <NoticeBanner type="warn" title={labels.status} message={warning} /> : null}
          {!warning && formWarn ? <NoticeBanner type="warn" title={labels.status} message={formWarn} /> : null}
          {!warning && !formWarn && scheduleErr ? <NoticeBanner type="error" title={labels.status} message={scheduleErr} /> : null}
          {!warning && !formWarn && !scheduleErr && scheduleMsg ? (
            <NoticeBanner type="success" title={labels.status} message={scheduleMsg} />
          ) : null}

          {mode === "create" && previewRows.length > 0 ? (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{labels.previewTitle}</div>
              <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr style={{ background: "#f5f5f5" }}>
                    <th align="left">#</th>
                    <th align="left">{labels.start}</th>
                    <th align="left">{labels.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r) => (
                    <tr key={r.index} style={{ borderTop: "1px solid #eee" }}>
                      <td>{r.index}</td>
                      <td>{new Date(r.startAt).toLocaleString()}</td>
                      <td style={{ color: r.ok ? "#0a7" : "#b00" }}>{r.ok ? labels.available : r.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {mode === "create" && subjectId && campusId && (roomId || !roomRequired) && startAt ? (
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
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button type="button" onClick={() => previewWithTeacher(c.id)} disabled={isScheduling}>
                              {isScheduling ? `${labels.preview}...` : labels.preview}
                            </button>
                            <button type="button" onClick={() => scheduleWithTeacher(c.id)} disabled={isScheduling}>
                              {isScheduling ? `${labels.schedule}...` : labels.schedule}
                            </button>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : mode === "create" ? (
            <div style={{ color: "#999" }}>{labels.chooseHint}</div>
          ) : null}
        </div>
      </dialog>
    </div>
  );
}
