"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ConfirmSubmitButton from "../_components/ConfirmSubmitButton";
import StudentSearchSelect from "../_components/StudentSearchSelect";

type StudentOpt = { id: string; name: string };
type CourseOpt = { id: string; name: string };

function preserveRefresh(router: ReturnType<typeof useRouter>) {
  const y = window.scrollY;
  router.refresh();
  // Best-effort scroll restore (prevents jumping to top after refresh).
  requestAnimationFrame(() => window.scrollTo(0, y));
}

export default function PackageCreateFormClient({
  students,
  courses,
  defaultYmd,
  labels,
  close,
}: {
  students: StudentOpt[];
  courses: CourseOpt[];
  defaultYmd: string;
  labels: {
    student: string;
    studentPlaceholder: string;
    course: string;
    type: string;
    typeHours: string;
    typeGroup: string;
    typeMonthly: string;
    totalMinutesOrCount: string;
    totalMinutesHint: string;
    validFrom: string;
    validToOptional: string;
    status: string;
    paid: string;
    paidAt: string;
    paidAmount: string;
    paidNote: string;
    sharedStudents: string;
    note: string;
    create: string;
    confirmCreate: string;
    errorPrefix: string;
  };
  close?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      style={{ display: "grid", gap: 10, maxWidth: 760 }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const formEl = e.currentTarget as HTMLFormElement;
        setErr("");
        setBusy(true);
        try {
          const fd = new FormData(formEl);
          const payload = {
            studentId: String(fd.get("studentId") ?? ""),
            courseId: String(fd.get("courseId") ?? ""),
            type: String(fd.get("type") ?? "HOURS"),
            status: String(fd.get("status") ?? "PAUSED"),
            totalMinutes: Number(fd.get("totalMinutes") ?? 0),
            validFrom: String(fd.get("validFrom") ?? ""),
            validTo: String(fd.get("validTo") ?? ""),
            paid: String(fd.get("paid") ?? "") === "on",
            paidAt: String(fd.get("paidAt") ?? ""),
            paidAmount: String(fd.get("paidAmount") ?? ""),
            paidNote: String(fd.get("paidNote") ?? ""),
            sharedStudentIds: fd.getAll("sharedStudentIds").map((v) => String(v)),
            note: String(fd.get("note") ?? ""),
          };

          const res = await fetch("/api/admin/packages", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = (await res.json().catch(() => null)) as any;
          if (!res.ok || !data?.ok) {
            setErr(String(data?.message ?? `Request failed (${res.status})`));
            return;
          }

          if (close) {
            close();
          } else {
            const dlg =
              formEl.closest("dialog") ??
              (formEl.ownerDocument?.querySelector("dialog[open]") as HTMLDialogElement | null);
            dlg?.close();
          }
          const params = new URLSearchParams(searchParams?.toString() ?? "");
          params.delete("err");
          params.set("msg", "Package created");
          const target = params.toString() ? `${pathname}?${params.toString()}` : pathname;
          router.replace(target, { scroll: false });
          preserveRefresh(router);
        } finally {
          setBusy(false);
        }
      }}
    >
      {err ? (
        <div style={{ color: "#b00" }}>
          {labels.errorPrefix}: {err}
        </div>
      ) : null}

      <label>
        {labels.student}:
        <div style={{ marginLeft: 8 }}>
          <StudentSearchSelect
            name="studentId"
            placeholder={labels.studentPlaceholder}
            students={students}
          />
        </div>
      </label>

      <label>
        {labels.course}:
        <select name="courseId" defaultValue={courses[0]?.id ?? ""} style={{ marginLeft: 8, minWidth: 520 }}>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        {labels.type}:
        <select name="type" defaultValue="HOURS" style={{ marginLeft: 8, minWidth: 220 }}>
          <option value="HOURS">{labels.typeHours}</option>
          <option value="GROUP_COUNT">{labels.typeGroup}</option>
          <option value="MONTHLY">{labels.typeMonthly}</option>
        </select>
      </label>

      <label>
        {labels.totalMinutesOrCount}:
        <input name="totalMinutes" type="number" min={1} step={1} defaultValue={20} style={{ marginLeft: 8 }} />
        <span style={{ color: "#666", marginLeft: 8 }}>{labels.totalMinutesHint}</span>
      </label>

      <label>
        {labels.validFrom}:
        <input name="validFrom" type="date" defaultValue={defaultYmd} style={{ marginLeft: 8 }} />
      </label>

      <label>
        {labels.validToOptional}:
        <input name="validTo" type="date" style={{ marginLeft: 8 }} />
      </label>

      <label>
        {labels.status}:
        <select name="status" defaultValue="PAUSED" style={{ marginLeft: 8, minWidth: 220 }}>
          <option value="ACTIVE">ACTIVE</option>
          <option value="PAUSED">PAUSED</option>
          <option value="EXPIRED">EXPIRED</option>
        </select>
      </label>

      <label>
        {labels.paid}:
        <input type="checkbox" name="paid" style={{ marginLeft: 8 }} />
      </label>

      <label>
        {labels.paidAt}:
        <input name="paidAt" type="datetime-local" style={{ marginLeft: 8 }} />
      </label>

      <label>
        {labels.paidAmount}:
        <input name="paidAmount" type="number" min={0} step={1} style={{ marginLeft: 8, width: 180 }} />
      </label>

      <label>
        {labels.paidNote}:
        <input name="paidNote" type="text" style={{ marginLeft: 8, width: 520 }} />
      </label>

      <label>
        {labels.sharedStudents}:
        <select name="sharedStudentIds" multiple size={6} style={{ marginLeft: 8, minWidth: 520 }}>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        {labels.note}:
        <input name="note" type="text" style={{ marginLeft: 8, width: 520 }} />
      </label>

      <ConfirmSubmitButton message={labels.confirmCreate}>
        {busy ? `${labels.create}...` : labels.create}
      </ConfirmSubmitButton>
    </form>
  );
}
