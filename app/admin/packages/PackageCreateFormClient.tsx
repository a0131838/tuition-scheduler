"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ConfirmSubmitButton from "../_components/ConfirmSubmitButton";
import StudentSearchSelect from "../_components/StudentSearchSelect";
import DateTimeSplitInput from "@/app/_components/DateTimeSplitInput";

type StudentOpt = {
  id: string;
  name: string;
  courseNames?: string[];
  courseIds?: string[];
  activePackageCount?: number;
};
type CourseOpt = { id: string; name: string };

function preserveRefresh(router: ReturnType<typeof useRouter>) {
  const y = window.scrollY;
  router.refresh();
  // Best-effort scroll restore (prevents jumping to top after refresh).
  requestAnimationFrame(() => window.scrollTo(0, y));
}

const STEP_TITLES = [
  { en: "Student and course", zh: "学生与课程" },
  { en: "Package balance and payment", zh: "课时与付款" },
  { en: "Validity and rules", zh: "有效期与规则" },
  { en: "Review and create", zh: "确认并创建" },
] as const;

function stepLabel(index: number) {
  const step = STEP_TITLES[index];
  return `Step ${index + 1} ${step.en} / 步骤${index + 1}${step.zh}`;
}

function typeSummaryLabel(type: string, labels: PackageCreateFormClientProps["labels"]) {
  if (type === "MONTHLY") return labels.typeMonthly;
  if (type === "GROUP_COUNT") return labels.typeGroupCountLegacy;
  if (type === "GROUP_MINUTES") return labels.typeGroupMinutes;
  return labels.typeHours;
}

function rowCardStyle(active: boolean) {
  return {
    border: active ? "2px solid #4f46e5" : "1px solid #dbe4f0",
    borderRadius: 14,
    padding: 12,
    background: active ? "#eef2ff" : "#f8fafc",
  } as const;
}

type PackageCreateFormClientProps = {
  students: StudentOpt[];
  courses: CourseOpt[];
  defaultMinutesByCourseId: Record<string, number>;
  defaultYmd: string;
  labels: {
    student: string;
    studentPlaceholder: string;
    course: string;
    type: string;
    typeHours: string;
    typeGroupMinutes: string;
    typeGroupCountLegacy: string;
    typeMonthly: string;
    totalMinutesOrCount: string;
    totalMinutesHint: string;
    validFrom: string;
    validToOptional: string;
    status: string;
    settlementMode?: string;
    settlementNone?: string;
    settlementOnline?: string;
    settlementOffline?: string;
    paid: string;
    paidAt: string;
    paidAmount: string;
    paidNote: string;
    sharedStudents: string;
    sharedCourses: string;
    note: string;
    create: string;
    confirmCreate: string;
    errorPrefix: string;
  };
  close?: () => void;
};

export default function PackageCreateFormClient({
  students,
  courses,
  defaultMinutesByCourseId,
  defaultYmd,
  labels,
  close,
}: PackageCreateFormClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id ?? "");
  const [typeValue, setTypeValue] = useState("HOURS");
  const [totalMinutesValue, setTotalMinutesValue] = useState("20");
  const [minutesTouched, setMinutesTouched] = useState(false);
  const [validFromValue, setValidFromValue] = useState(defaultYmd);
  const [validToValue, setValidToValue] = useState("");
  const [statusValue, setStatusValue] = useState("PAUSED");
  const [settlementModeValue, setSettlementModeValue] = useState("");
  const [paidValue, setPaidValue] = useState(false);
  const [paidAmountValue, setPaidAmountValue] = useState("");
  const [noteValue, setNoteValue] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const settlementModeLabel = labels.settlementMode ?? "Settlement Mode";
  const settlementNoneLabel = labels.settlementNone ?? "Not Included";
  const settlementOnlineLabel = labels.settlementOnline ?? "Online: Package End";
  const settlementOfflineLabel = labels.settlementOffline ?? "Offline: Monthly";
  const selectedStudent = students.find((s) => s.id === selectedStudentId) ?? null;
  const selectedCourse = courses.find((c) => c.id === selectedCourseId) ?? null;
  const isMonthly = typeValue === "MONTHLY";
  const totalMinutesNumber = Number(totalMinutesValue || 0);
  const sameCourseActive =
    selectedStudent && selectedCourseId
      ? (selectedStudent.courseIds ?? []).filter((id) => id === selectedCourseId).length
      : 0;
  const suggestedMinutes = defaultMinutesByCourseId[selectedCourseId] ?? 600;

  useEffect(() => {
    if (isMonthly) return;
    if (minutesTouched) return;
    setTotalMinutesValue(String(suggestedMinutes));
  }, [isMonthly, minutesTouched, suggestedMinutes, selectedCourseId, typeValue]);

  const summaryRows = useMemo(
    () => [
      { label: "Student / 学生", value: selectedStudent?.name || "Not selected / 未选择" },
      { label: "Course / 课程", value: selectedCourse?.name || "Not selected / 未选择" },
      { label: "Package type / 课包类型", value: typeSummaryLabel(typeValue, labels) },
      {
        label: isMonthly ? "Balance / 课包内容" : "Minutes or count / 分钟或次数",
        value: isMonthly
          ? "Monthly validity only / 按有效期使用"
          : totalMinutesNumber > 0
          ? String(totalMinutesNumber)
          : "Not set / 未填写",
      },
      { label: "Valid from / 生效日期", value: validFromValue || "Not set / 未填写" },
      { label: "Valid to / 失效日期", value: validToValue || "Open-ended / 不限" },
      { label: "Status / 状态", value: statusValue },
      {
        label: `${settlementModeLabel} / 结算模式`,
        value:
          settlementModeValue === "ONLINE_PACKAGE_END"
            ? settlementOnlineLabel
            : settlementModeValue === "OFFLINE_MONTHLY"
            ? settlementOfflineLabel
            : settlementNoneLabel,
      },
      {
        label: "Payment / 付款",
        value: paidValue
          ? `${labels.paid} · ${paidAmountValue || "Amount pending / 金额待补"}`
          : "Unpaid / 未付款",
      },
    ],
    [
      isMonthly,
      labels,
      paidAmountValue,
      paidValue,
      selectedCourse?.name,
      selectedStudent?.name,
      settlementModeLabel,
      settlementModeValue,
      settlementNoneLabel,
      settlementOfflineLabel,
      settlementOnlineLabel,
      statusValue,
      totalMinutesNumber,
      typeValue,
      validFromValue,
      validToValue,
    ]
  );

  function validateStep(index: number) {
    if (index === 0) {
      if (!selectedStudentId) return "Please choose one student before continuing. / 继续前请先明确选择学生。";
      if (!selectedCourseId) return "Please choose a course before continuing. / 继续前请先选择课程。";
    }
    if (index === 1 && !isMonthly && (!Number.isFinite(totalMinutesNumber) || totalMinutesNumber <= 0)) {
      return "Please enter a valid minutes/count value. / 请填写有效的分钟数或次数。";
    }
    if (index === 2 && !validFromValue) {
      return "Please set validFrom before continuing. / 继续前请先填写生效日期。";
    }
    return "";
  }

  function goNext() {
    const nextErr = validateStep(step);
    if (nextErr) {
      setErr(nextErr);
      return;
    }
    setErr("");
    setStep((s) => Math.min(s + 1, STEP_TITLES.length - 1));
  }

  return (
    <form
      style={{ display: "grid", gap: 16, maxWidth: 1100 }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        if (step < STEP_TITLES.length - 1) {
          setErr("Please review the package summary first. / 请先完成前面的步骤并确认摘要。");
          return;
        }
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
            settlementMode: String(fd.get("settlementMode") ?? ""),
            totalMinutes: Number(fd.get("totalMinutes") ?? 0),
            validFrom: String(fd.get("validFrom") ?? ""),
            validTo: String(fd.get("validTo") ?? ""),
            paid: String(fd.get("paid") ?? "") === "on",
            paidAt: String(fd.get("paidAt") ?? ""),
            paidAmount: String(fd.get("paidAmount") ?? ""),
            paidNote: String(fd.get("paidNote") ?? ""),
            sharedStudentIds: fd.getAll("sharedStudentIds").map((v) => String(v)),
            sharedCourseIds: fd.getAll("sharedCourseIds").map((v) => String(v)),
            note: String(fd.get("note") ?? ""),
          };
          if (!payload.studentId) {
            setErr("Please select a student explicitly.");
            return;
          }

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
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ fontSize: 13, color: "#475569" }}>
          Create packages step by step to reduce mistakes. / 按步骤创建课包，减少录入出错。
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          {STEP_TITLES.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                if (index > step) {
                  const nextErr = validateStep(step);
                  if (nextErr) {
                    setErr(nextErr);
                    return;
                  }
                }
                setErr("");
                setStep(index);
              }}
              style={rowCardStyle(step === index)}
            >
              <div style={{ fontWeight: 700, textAlign: "left" }}>{stepLabel(index)}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1.35fr) minmax(280px, 0.9fr)", alignItems: "start" }}>
        <div style={{ display: "grid", gap: 14 }}>
          <section
            style={{
              border: "1px solid #dbe4f0",
              borderRadius: 14,
              padding: 16,
              background: "#fff",
              display: step === 0 ? "block" : "none",
            }}
            aria-hidden={step !== 0}
          >
              <div style={{ fontWeight: 700, marginBottom: 12 }}>{stepLabel(0)}</div>
              <div style={{ display: "grid", gap: 14 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>{labels.student}</span>
                  <StudentSearchSelect
                    name="studentId"
                    placeholder={labels.studentPlaceholder}
                    students={students}
                    onChangeId={setSelectedStudentId}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span>{labels.course}</span>
                  <select
                    name="courseId"
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    style={{ minWidth: 320, minHeight: 40 }}
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span>{labels.type}</span>
                  <select
                    name="type"
                    value={typeValue}
                    onChange={(e) => setTypeValue(e.target.value)}
                    style={{ minWidth: 240, minHeight: 40 }}
                  >
                    <option value="HOURS">{labels.typeHours}</option>
                    <option value="GROUP_MINUTES">{labels.typeGroupMinutes}</option>
                    <option value="GROUP_COUNT">{labels.typeGroupCountLegacy}</option>
                    <option value="MONTHLY">{labels.typeMonthly}</option>
                  </select>
                </label>
                <div style={{ border: "1px solid #dbeafe", borderRadius: 10, padding: 12, background: "#eff6ff", color: "#1e3a8a" }}>
                  Default type now starts with `HOURS / 课时包` because that is the most common package. / 默认类型现在从 `HOURS / 课时包` 开始，更贴近日常录入。
                </div>
                {selectedStudent ? (
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, background: "#f8fafc" }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>
                      Active package reminder / 当前有效课包提醒
                    </div>
                    <div>
                      {selectedStudent.name} now has {selectedStudent.activePackageCount ?? 0} active package(s). / 当前共有{" "}
                      {selectedStudent.activePackageCount ?? 0} 个有效课包。
                    </div>
                    <div style={{ marginTop: 4 }}>
                      Same-course active packages: {sameCourseActive}. / 同课程有效课包：{sameCourseActive}。
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

          <section
            style={{
              border: "1px solid #dbe4f0",
              borderRadius: 14,
              padding: 16,
              background: "#fff",
              display: step === 1 ? "block" : "none",
            }}
            aria-hidden={step !== 1}
          >
              <div style={{ fontWeight: 700, marginBottom: 12 }}>{stepLabel(1)}</div>
              <div style={{ display: "grid", gap: 14 }}>
                {!isMonthly ? (
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>{labels.totalMinutesOrCount}</span>
                    <input
                      name="totalMinutes"
                      type="number"
                      min={1}
                      step={1}
                      value={totalMinutesValue}
                      onChange={(e) => {
                        setMinutesTouched(true);
                        setTotalMinutesValue(e.target.value);
                      }}
                      style={{ width: 220, minHeight: 40 }}
                    />
                    <span style={{ color: "#666", fontSize: 13 }}>{labels.totalMinutesHint}</span>
                    <div style={{ color: "#475569", fontSize: 13 }}>
                      Suggested for this course / 此课程推荐默认分钟数: <strong>{suggestedMinutes}</strong>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                      {[600, 900, 1200, 1800].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setMinutesTouched(true);
                            setTotalMinutesValue(String(preset));
                          }}
                          style={{
                            minHeight: 34,
                            padding: "0 12px",
                            borderRadius: 999,
                            border: totalMinutesValue === String(preset) ? "2px solid #2563eb" : "1px solid #cbd5e1",
                            background: totalMinutesValue === String(preset) ? "#dbeafe" : "#fff",
                          }}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </label>
                ) : (
                  <>
                    <input type="hidden" name="totalMinutes" value={totalMinutesValue} />
                    <div style={{ border: "1px dashed #cbd5e1", borderRadius: 10, padding: 12, color: "#475569" }}>
                      Monthly packages use validity dates instead of minutes. / 月卡按有效期使用，不按分钟扣减。
                    </div>
                  </>
                )}

                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    name="paid"
                    checked={paidValue}
                    onChange={(e) => setPaidValue(e.target.checked)}
                  />
                  <span>{labels.paid}</span>
                </label>

                {paidValue ? (
                  <div style={{ display: "grid", gap: 14, border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#f8fafc" }}>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span>{labels.paidAt}</span>
                      <DateTimeSplitInput name="paidAt" wrapperStyle={{ display: "flex", gap: 8, flexWrap: "wrap" }} />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                      <span>{labels.paidAmount}</span>
                      <input
                        name="paidAmount"
                        type="number"
                        min={0}
                        step={1}
                        value={paidAmountValue}
                        onChange={(e) => setPaidAmountValue(e.target.value)}
                        style={{ width: 220, minHeight: 40 }}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                      <span>{labels.paidNote}</span>
                      <input name="paidNote" type="text" style={{ width: "100%", minHeight: 40 }} />
                    </label>
                  </div>
                ) : null}
              </div>
            </section>

          <section
            style={{
              border: "1px solid #dbe4f0",
              borderRadius: 14,
              padding: 16,
              background: "#fff",
              display: step === 2 ? "block" : "none",
            }}
            aria-hidden={step !== 2}
          >
              <div style={{ fontWeight: 700, marginBottom: 12 }}>{stepLabel(2)}</div>
              <div style={{ display: "grid", gap: 14 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>{labels.validFrom}</span>
                  <input
                    name="validFrom"
                    type="date"
                    value={validFromValue}
                    onChange={(e) => setValidFromValue(e.target.value)}
                    style={{ width: 220, minHeight: 40 }}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span>{labels.validToOptional}</span>
                  <input
                    name="validTo"
                    type="date"
                    value={validToValue}
                    onChange={(e) => setValidToValue(e.target.value)}
                    style={{ width: 220, minHeight: 40 }}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span>{labels.status}</span>
                  <select
                    name="status"
                    value={statusValue}
                    onChange={(e) => setStatusValue(e.target.value)}
                    style={{ width: 220, minHeight: 40 }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PAUSED">PAUSED</option>
                    <option value="EXPIRED">EXPIRED</option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span>{settlementModeLabel}</span>
                  <select
                    name="settlementMode"
                    value={settlementModeValue}
                    onChange={(e) => setSettlementModeValue(e.target.value)}
                    style={{ width: 280, minHeight: 40 }}
                  >
                    <option value="">{settlementNoneLabel}</option>
                    <option value="ONLINE_PACKAGE_END">{settlementOnlineLabel}</option>
                    <option value="OFFLINE_MONTHLY">{settlementOfflineLabel}</option>
                  </select>
                </label>

                <details
                  open={showAdvanced}
                  onToggle={(e) => setShowAdvanced((e.currentTarget as HTMLDetailsElement).open)}
                  style={{ border: "1px dashed #cbd5e1", borderRadius: 12, padding: 12 }}
                >
                  <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                    Advanced sharing and notes / 高级共享与备注
                  </summary>
                  <div style={{ display: "grid", gap: 14, marginTop: 12 }}>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span>{labels.sharedStudents}</span>
                      <select name="sharedStudentIds" multiple size={6} style={{ minWidth: 320 }}>
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                      <span>{labels.sharedCourses}</span>
                      <select name="sharedCourseIds" multiple size={6} style={{ minWidth: 320 }}>
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                      <span>{labels.note}</span>
                      <input
                        name="note"
                        type="text"
                        value={noteValue}
                        onChange={(e) => setNoteValue(e.target.value)}
                        style={{ width: "100%", minHeight: 40 }}
                      />
                    </label>
                  </div>
                </details>
              </div>
            </section>

          <section
            style={{
              border: "1px solid #dbe4f0",
              borderRadius: 14,
              padding: 16,
              background: "#fff",
              display: step === 3 ? "block" : "none",
            }}
            aria-hidden={step !== 3}
          >
              <div style={{ fontWeight: 700, marginBottom: 12 }}>{stepLabel(3)}</div>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ color: "#475569", fontSize: 14 }}>
                  Review the package summary before creating it. / 创建前请确认右侧课包摘要，避免学生、课程、分钟数或有效期填错。
                </div>
                {sameCourseActive > 0 ? (
                  <div style={{ border: "1px solid #f59e0b", borderRadius: 12, padding: 12, background: "#fff7ed", color: "#9a3412" }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                      Same-course package warning / 同课程课包提醒
                    </div>
                    <div>
                      This student already has {sameCourseActive} active package(s) for the same course. Please confirm you really want to create another one. /
                      当前学生已有 {sameCourseActive} 个同课程有效课包，请确认这次确实需要再创建一个。
                    </div>
                  </div>
                ) : null}
                <div style={{ border: "1px dashed #cbd5e1", borderRadius: 12, padding: 12, background: "#f8fafc" }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Quick checks / 快速检查</div>
                  <div>1. Student and course match the intended learner. / 学生与课程是否对应正确。</div>
                  <div>2. Minutes or validity match the selling rule. / 分钟数或有效期是否符合销售规则。</div>
                  <div>3. Payment status and paid amount are correct. / 付款状态与金额是否正确。</div>
                  <div>4. Advanced sharing is only used when really needed. / 共享学生与共享课程仅在确有需要时使用。</div>
                </div>
              </div>
            </section>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                setErr("");
                setStep((s) => Math.max(0, s - 1));
              }}
              disabled={step === 0 || busy}
              style={{ minHeight: 40, padding: "0 16px" }}
            >
              Back / 上一步
            </button>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {step < STEP_TITLES.length - 1 ? (
                <button type="button" onClick={goNext} disabled={busy} style={{ minHeight: 40, padding: "0 16px" }}>
                  Next / 下一步
                </button>
              ) : (
                <ConfirmSubmitButton message={labels.confirmCreate}>
                  {busy ? `${labels.create}...` : `${labels.create} / 创建课包`}
                </ConfirmSubmitButton>
              )}
            </div>
          </div>
        </div>

        <aside style={{ border: "1px solid #dbe4f0", borderRadius: 14, padding: 16, background: "#f8fafc", position: "sticky", top: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Package summary / 课包摘要</div>
          <div style={{ color: "#475569", fontSize: 13, marginBottom: 12 }}>
            Keep this card in view while filling the form. / 录入时对照这张摘要卡，减少填错。
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {summaryRows.map((row) => (
              <div key={row.label} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{row.label}</div>
                <div style={{ fontWeight: 600 }}>{row.value}</div>
              </div>
            ))}
            {noteValue ? (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Note / 备注</div>
                <div style={{ fontWeight: 600 }}>{noteValue}</div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </form>
  );
}
