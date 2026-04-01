import { requireTeacherProfile } from "@/lib/auth";
import { areAllApproversConfirmed, getApprovalRoleConfig } from "@/lib/approval-flow";
import { getLang, t } from "@/lib/i18n";
import {
  confirmTeacherPayroll,
  formatComboLabel,
  formatMoneyCents,
  getTeacherPayrollPublishForTeacher,
  loadTeacherPayrollDetail,
  monthKey,
  parseMonth,
} from "@/lib/teacher-payroll";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formatBusinessDateTime } from "@/lib/date-only";
import TeacherWorkspaceHero from "../_components/TeacherWorkspaceHero";

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Shanghai",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const DATE_TIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Shanghai",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function pendingReasonLabel(lang: Awaited<ReturnType<typeof getLang>>, reason: string | null) {
  if (!reason) return "-";
  if (reason === "ATTENDANCE_MISSING") return t(lang, "No attendance record", "未点名");
  if (reason === "ATTENDANCE_UNMARKED") return t(lang, "Attendance not fully marked", "点名未完成");
  if (reason === "FEEDBACK_MISSING") return t(lang, "Teacher feedback missing", "未提交反馈");
  if (reason === "ATTENDANCE_AND_FEEDBACK_MISSING") return t(lang, "Attendance and feedback missing", "点名与反馈均未完成");
  return "-";
}

function formatDMY(day: number, month: number, year: number) {
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

function buildPayrollCycleInfo(monthKeyValue: string) {
  const parsed = parseMonth(monthKeyValue);
  if (!parsed) return null;
  const { year, month } = parsed;
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const salaryMonthZh = `${year}年${month}月`;
  return {
    salaryMonthZh,
    payoutDate: formatDMY(5, nextMonth, nextYear),
    periodStart: formatDMY(15, prevMonth, prevYear),
    periodEnd: formatDMY(14, month, year),
  };
}

function teacherPayrollStageLabel(
  lang: Awaited<ReturnType<typeof getLang>>,
  stage: "teacher" | "manager" | "financeConfirm" | "financePaid" | "done" | "financeRejected"
) {
  if (stage === "teacher") return t(lang, "Waiting for your confirmation / 等待你确认", "等待你确认 / Waiting for your confirmation");
  if (stage === "manager") return t(lang, "Waiting manager approval / 等待管理审批", "等待管理审批 / Waiting manager approval");
  if (stage === "financeConfirm") return t(lang, "Waiting finance confirmation / 等待财务确认", "等待财务确认 / Waiting finance confirmation");
  if (stage === "financePaid") return t(lang, "Waiting payout / 等待发薪", "等待发薪 / Waiting payout");
  if (stage === "financeRejected") return t(lang, "Finance sent it back / 财务已退回", "财务已退回 / Finance sent it back");
  return t(lang, "Paid / 已发薪", "已发薪 / Paid");
}

function approverSummary(emails: string[] | null | undefined) {
  if (!emails || emails.length === 0) return "-";
  return emails.join(", ");
}

function teacherPayrollOwnerLabel(
  lang: Awaited<ReturnType<typeof getLang>>,
  stage: "teacher" | "manager" | "financeConfirm" | "financePaid" | "done" | "financeRejected",
  managerApproverEmails: string[],
  financeApproverEmails: string[]
) {
  if (stage === "teacher") {
    return {
      owner: t(lang, "You / 你", "你 / You"),
      hint: t(lang, "Please review this payroll and confirm it on this page.", "请在本页核对并确认这张工资单。"),
    };
  }
  if (stage === "manager") {
    return {
      owner: t(lang, "Management approver / 管理审批人", "管理审批人 / Management approver"),
      hint: t(
        lang,
        `Next step owner: management (${approverSummary(managerApproverEmails)}).`,
        `下一步由管理审批处理（${approverSummary(managerApproverEmails)}）。`
      ),
    };
  }
  if (stage === "financeConfirm") {
    return {
      owner: t(lang, "Finance approver / 财务审批人", "财务审批人 / Finance approver"),
      hint: t(
        lang,
        `Next step owner: finance (${approverSummary(financeApproverEmails)}).`,
        `下一步由财务审批处理（${approverSummary(financeApproverEmails)}）。`
      ),
    };
  }
  if (stage === "financePaid") {
    return {
      owner: t(lang, "Finance payout / 财务发薪", "财务发薪 / Finance payout"),
      hint: t(
        lang,
        `Next step owner: finance payout (${approverSummary(financeApproverEmails)}).`,
        `下一步由财务发薪处理（${approverSummary(financeApproverEmails)}）。`
      ),
    };
  }
  if (stage === "financeRejected") {
    return {
      owner: t(lang, "Admin / Finance follow-up / 管理与财务跟进", "管理与财务跟进 / Admin and finance follow-up"),
      hint: t(
        lang,
        "Please check the finance note below and contact admin if a resend or correction is needed.",
        "请查看下方财务备注；如需重发或修正，请联系管理端。"
      ),
    };
  }
  return {
    owner: t(lang, "Done / 已完成", "已完成 / Done"),
    hint: t(lang, "No further action is needed on your side.", "你这边暂时不需要再操作。"),
  };
}

function teacherPayrollActionPrompt(
  lang: Awaited<ReturnType<typeof getLang>>,
  stage: "teacher" | "manager" | "financeConfirm" | "financePaid" | "done" | "financeRejected"
) {
  if (stage === "teacher") {
    return {
      tone: "#92400e",
      bg: "#fffbeb",
      border: "#fde68a",
      title: t(lang, "Action needed now / 现在需要你操作", "现在需要你操作 / Action needed now"),
      body: t(lang, "Please review this payroll and click Confirm Payroll below.", "请核对这张工资单，然后点击下方“确认工资单”。"),
    };
  }
  if (stage === "manager") {
    return {
      tone: "#1d4ed8",
      bg: "#eff6ff",
      border: "#bfdbfe",
      title: t(lang, "No action needed from you / 你这边暂时不用操作", "你这边暂时不用操作 / No action needed from you"),
      body: t(lang, "Your payroll is waiting for management approval.", "你的工资单正在等待管理审批。"),
    };
  }
  if (stage === "financeConfirm") {
    return {
      tone: "#1d4ed8",
      bg: "#eff6ff",
      border: "#bfdbfe",
      title: t(lang, "No action needed from you / 你这边暂时不用操作", "你这边暂时不用操作 / No action needed from you"),
      body: t(lang, "Your payroll has passed management approval and is waiting for finance confirmation.", "你的工资单已通过管理审批，正在等待财务确认。"),
    };
  }
  if (stage === "financePaid") {
    return {
      tone: "#1d4ed8",
      bg: "#eff6ff",
      border: "#bfdbfe",
      title: t(lang, "No action needed from you / 你这边暂时不用操作", "你这边暂时不用操作 / No action needed from you"),
      body: t(lang, "Finance has confirmed the payroll and payout is the next step.", "财务已经确认工资单，下一步是发薪。"),
    };
  }
  if (stage === "financeRejected") {
    return {
      tone: "#991b1b",
      bg: "#fef2f2",
      border: "#fecaca",
      title: t(lang, "Follow-up needed / 需要跟进", "需要跟进 / Follow-up needed"),
      body: t(lang, "Finance has returned this payroll. Please review the finance note and contact admin if a resend or correction is needed.", "财务已退回这张工资单。请查看财务备注，如需重发或修正，请联系管理端。"),
    };
  }
  return {
    tone: "#166534",
    bg: "#ecfdf5",
    border: "#bbf7d0",
    title: t(lang, "Done / 已完成", "已完成 / Done"),
    body: t(lang, "This payroll has been paid. No further action is needed.", "这张工资单已发薪，你这边无需继续操作。"),
  };
}

function statCard(bg: string, border: string) {
  return {
    padding: 14,
    borderRadius: 16,
    border: `1px solid ${border}`,
    background: bg,
  } as const;
}

async function confirmPayrollAction(formData: FormData) {
  "use server";
  const { teacher, user } = await requireTeacherProfile();
  if (!teacher) {
    redirect("/teacher/payroll?err=no-teacher");
  }

  const month = typeof formData.get("month") === "string" ? String(formData.get("month")) : monthKey(new Date());
  const scope = typeof formData.get("scope") === "string" && String(formData.get("scope")) === "completed" ? "completed" : "all";
  if (!parseMonth(month)) {
    redirect(`/teacher/payroll?err=month`);
  }

  const ok = await confirmTeacherPayroll({ teacherId: teacher.id, month, scope, actorEmail: user.email });
  if (!ok) {
    redirect(`/teacher/payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&err=not-sent`);
  }

  revalidatePath("/teacher/payroll");
  revalidatePath("/admin/reports/teacher-payroll");
  redirect(`/teacher/payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&msg=confirmed`);
}

export default async function TeacherPayrollSelfPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; scope?: string; msg?: string; err?: string }>;
}) {
  const lang = await getLang();
  const { teacher } = await requireTeacherProfile();

  if (!teacher) {
    return <div style={{ color: "#b00" }}>{t(lang, "Teacher profile not linked.", "老师资料未关联。")}</div>;
  }

  const sp = await searchParams;
  const month = sp?.month ?? monthKey(new Date());
  const scope = sp?.scope === "completed" ? "completed" : "all";
  const msg = sp?.msg ?? "";
  const err = sp?.err ?? "";

  if (!parseMonth(month)) {
    return (
      <div>
        <h2>{t(lang, "My Payroll", "我的工资单")}</h2>
        <div style={{ color: "#b00" }}>{t(lang, "Invalid month format. Use YYYY-MM.", "月份格式错误，请使用 YYYY-MM。")}</div>
      </div>
    );
  }

  const publish = await getTeacherPayrollPublishForTeacher({ teacherId: teacher.id, month, scope });
  const approvalCfg = publish ? await getApprovalRoleConfig() : null;
  const managerApproved =
    publish && approvalCfg
      ? areAllApproversConfirmed(publish.managerApprovedBy, approvalCfg.managerApproverEmails)
      : false;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <TeacherWorkspaceHero
        title={t(lang, "My Payroll", "我的工资单")}
        subtitle={t(lang, "Review the current payroll owner, confirmation timeline, and whether you need to act now. This page is now part of the teacher finance workspace.", "在这里查看当前处理方、确认时间线，以及你现在是否需要操作。这一页现在是老师财务工作区的一部分。")}
        actions={[
          { href: "/teacher", label: t(lang, "Back to dashboard", "返回工作台") },
          { href: "/teacher/expense-claims", label: t(lang, "Open expense claims", "打开报销") },
        ]}
      />
      {msg === "confirmed" ? <div style={{ marginBottom: 10, color: "#166534" }}>{t(lang, "Payroll confirmed.", "工资单已确认。")}</div> : null}
      {err === "not-sent" ? <div style={{ marginBottom: 10, color: "#b00" }}>{t(lang, "This payroll has not been sent by admin yet.", "该工资单尚未由管理端发送。")}</div> : null}
      {err === "month" ? <div style={{ marginBottom: 10, color: "#b00" }}>{t(lang, "Invalid month format.", "月份格式错误。")}</div> : null}

      <form method="GET" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <label>
          {t(lang, "Payroll Month", "工资月份")}:
          <input name="month" type="month" defaultValue={month} style={{ marginLeft: 6 }} />
        </label>
        <label>
          {t(lang, "Scope", "统计口径")}:
          <select name="scope" defaultValue={scope} style={{ marginLeft: 6 }}>
            <option value="all">{t(lang, "All Scheduled Sessions", "全部排课课次")}</option>
            <option value="completed">{t(lang, "Completed Only (Marked + Feedback)", "仅已完成(已点名+已反馈)")}</option>
          </select>
        </label>
        <button type="submit" data-apply-submit="1">{t(lang, "Apply", "应用")}</button>
      </form>

      {!publish ? (
        <div style={{ color: "#666" }}>{t(lang, "Admin has not sent this month's payroll yet.", "管理端尚未发送该月工资单。")}</div>
      ) : (
        <TeacherPayrollBody
          teacherId={teacher.id}
          month={month}
          scope={scope}
          sentAt={publish.sentAt}
          confirmedAt={publish.confirmedAt}
          managerApprovedAt={managerApproved ? publish.managerApprovedAt : null}
          financeConfirmedAt={publish.financeConfirmedAt}
          financePaidAt={publish.financePaidAt}
          financeRejectedAt={publish.financeRejectedAt}
          financeRejectReason={publish.financeRejectReason}
          managerApproverEmails={approvalCfg?.managerApproverEmails ?? []}
          financeApproverEmails={approvalCfg?.financeApproverEmails ?? []}
          lang={lang}
        />
      )}
    </div>
  );
}

async function TeacherPayrollBody({
  teacherId,
  month,
  scope,
  sentAt,
  confirmedAt,
  managerApprovedAt,
  financeConfirmedAt,
  financePaidAt,
  financeRejectedAt,
  financeRejectReason,
  managerApproverEmails,
  financeApproverEmails,
  lang,
}: {
  teacherId: string;
  month: string;
  scope: "all" | "completed";
  sentAt: string;
  confirmedAt: string | null;
  managerApprovedAt: string | null;
  financeConfirmedAt: string | null;
  financePaidAt: string | null;
  financeRejectedAt: string | null;
  financeRejectReason: string | null;
  managerApproverEmails: string[];
  financeApproverEmails: string[];
  lang: Awaited<ReturnType<typeof getLang>>;
}) {
  const data = await loadTeacherPayrollDetail(month, teacherId, scope);
  if (!data) {
    return <div style={{ color: "#b00" }}>{t(lang, "Payroll data not found.", "未找到工资数据。")}</div>;
  }
  const cycleInfo = buildPayrollCycleInfo(month);
  const stage: "teacher" | "manager" | "financeConfirm" | "financePaid" | "done" | "financeRejected" = financeRejectedAt
    ? "financeRejected"
    : !confirmedAt
      ? "teacher"
      : !managerApprovedAt
        ? "manager"
        : !financeConfirmedAt
          ? "financeConfirm"
          : !financePaidAt
            ? "financePaid"
            : "done";
  const stageOwner = teacherPayrollOwnerLabel(lang, stage, managerApproverEmails, financeApproverEmails);
  const actionPrompt = teacherPayrollActionPrompt(lang, stage);
  const timelineSteps = [
    { key: "sent", label: t(lang, "Sent / 已发送", "已发送 / Sent"), at: sentAt, done: true },
    { key: "teacher", label: t(lang, "Teacher confirmed / 老师确认", "老师确认 / Teacher confirmed"), at: confirmedAt, done: Boolean(confirmedAt) },
    { key: "manager", label: t(lang, "Manager approved / 管理审批", "管理审批 / Manager approved"), at: managerApprovedAt, done: Boolean(managerApprovedAt) },
    { key: "financeConfirm", label: t(lang, "Finance confirmed / 财务确认", "财务确认 / Finance confirmed"), at: financeConfirmedAt, done: Boolean(financeConfirmedAt) },
    { key: "paid", label: t(lang, "Paid / 已发薪", "已发薪 / Paid"), at: financePaidAt, done: Boolean(financePaidAt) },
  ];

  const periodText = `${DATE_FMT.format(data.range.start)} - ${DATE_FMT.format(new Date(data.range.end.getTime() - 1000))}`;
  const totalAmountLabel =
    data.totalCurrencyTotals.length === 0
      ? formatMoneyCents(0)
      : data.totalCurrencyTotals.map((item) => formatMoneyCents(item.amountCents, item.currencyCode)).join(" / ");

  return (
    <>
      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: 12 }}>
        <div style={statCard("#eff6ff", "#bfdbfe")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8" }}>{t(lang, "Current stage", "当前阶段")}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1d4ed8", marginTop: 8 }}>{teacherPayrollStageLabel(lang, stage)}</div>
          <div style={{ color: "#1e40af", marginTop: 4 }}>{stageOwner.owner}</div>
        </div>
        <div style={statCard("#f0fdf4", "#bbf7d0")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#166534" }}>{t(lang, "Total salary", "总工资")}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#166534", marginTop: 8 }}>{totalAmountLabel}</div>
          <div style={{ color: "#166534", marginTop: 4 }}>{t(lang, "Across all currencies in this payroll period.", "该工资周期内所有币种的合计。")}</div>
        </div>
        <div style={statCard("#fffbeb", "#fde68a")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#92400e" }}>{t(lang, "Sessions in cycle", "周期课次")}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#92400e", marginTop: 8 }}>{data.totalSessions}</div>
          <div style={{ color: "#92400e", marginTop: 4 }}>{t(lang, "All sessions included in this payroll range.", "当前工资统计周期内纳入的全部课次。")}</div>
        </div>
        <div style={statCard("#f8fafc", "#e2e8f0")}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>{t(lang, "Cycle window", "统计周期")}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#334155", marginTop: 8 }}>{periodText}</div>
          <div style={{ color: "#475569", marginTop: 4 }}>{t(lang, "The teaching period used for this payroll.", "这张工资单所使用的教学统计周期。")}</div>
        </div>
      </section>

      <div style={{ marginBottom: 12, padding: "8px 10px", border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 8, color: "#1e3a8a" }}>
        {t(lang, "Sent by admin", "管理端发送时间")}: {formatBusinessDateTime(new Date(sentAt))}
        <br />
        {confirmedAt
          ? `${t(lang, "Confirmed at", "确认时间")}: ${formatBusinessDateTime(new Date(confirmedAt))}`
          : t(lang, "Please review and confirm this payroll.", "请核对后确认此工资单。")}
      </div>
      <div style={{ marginBottom: 12, padding: "10px 12px", border: "1px solid #dbeafe", background: "#f8fbff", borderRadius: 8 }}>
        <div style={{ fontWeight: 700, color: "#1d4ed8", marginBottom: 6 }}>
          {t(lang, "Current payroll status / 当前工资状态", "当前工资状态 / Current payroll status")}
        </div>
        <div style={{ color: "#334155", marginBottom: 8 }}>
          {teacherPayrollStageLabel(lang, stage)}
        </div>
        <div
          style={{
            marginBottom: 8,
            padding: "8px 10px",
            borderRadius: 8,
            background: actionPrompt.bg,
            border: `1px solid ${actionPrompt.border}`,
            color: actionPrompt.tone,
          }}
        >
          <div style={{ fontWeight: 700 }}>{actionPrompt.title}</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>{actionPrompt.body}</div>
        </div>
        <div style={{ marginBottom: 8, padding: "8px 10px", borderRadius: 8, background: "#ffffff", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {t(lang, "Current owner / 当前处理方", "当前处理方 / Current owner")}
          </div>
          <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{stageOwner.owner}</div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>{stageOwner.hint}</div>
        </div>
        <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Timeline / 时间线", "时间线 / Timeline")}</div>
          <div style={{ display: "grid", gap: 6 }}>
            {timelineSteps.map((step) => (
              <div
                key={step.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: 8,
                  background: step.done ? "#eff6ff" : "#f8fafc",
                  border: `1px solid ${step.done ? "#bfdbfe" : "#e2e8f0"}`,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: step.done ? "#2563eb" : "#cbd5e1",
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{step.label}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{step.at ? formatBusinessDateTime(new Date(step.at)) : "-"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gap: 4, fontSize: 13, color: "#475569" }}>
          <div>{t(lang, "Sent / 已发送", "已发送 / Sent")}: {formatBusinessDateTime(new Date(sentAt))}</div>
          <div>{t(lang, "Teacher confirmed / 老师确认", "老师确认 / Teacher confirmed")}: {confirmedAt ? formatBusinessDateTime(new Date(confirmedAt)) : "-"}</div>
          <div>{t(lang, "Manager approved / 管理审批", "管理审批 / Manager approved")}: {managerApprovedAt ? formatBusinessDateTime(new Date(managerApprovedAt)) : "-"}</div>
          <div>{t(lang, "Finance confirmed / 财务确认", "财务确认 / Finance confirmed")}: {financeConfirmedAt ? formatBusinessDateTime(new Date(financeConfirmedAt)) : "-"}</div>
          <div>{t(lang, "Paid / 已发薪", "已发薪 / Paid")}: {financePaidAt ? formatBusinessDateTime(new Date(financePaidAt)) : "-"}</div>
          {financeRejectReason ? <div style={{ color: "#991b1b" }}>{t(lang, "Finance note / 财务备注", "财务备注 / Finance note")}: {financeRejectReason}</div> : null}
        </div>
      </div>
      {cycleInfo ? (
        <div style={{ marginBottom: 12, padding: "10px 12px", border: "1px solid #d1fae5", background: "#ecfdf5", borderRadius: 8, color: "#065f46" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{t(lang, "Payroll Cycle Notes", "工资周期说明")}</div>
          <div>{t(lang, "Pay Date", "发放日期")}: <b>{cycleInfo.payoutDate}</b></div>
          <div>{t(lang, "Salary Month", "对应工资月份")}: <b>{month}</b> ({cycleInfo.salaryMonthZh})</div>
          <div>{t(lang, "Hours Count Window", "课时统计周期")}: <b>{cycleInfo.periodStart} - {cycleInfo.periodEnd}</b></div>
          <div style={{ marginTop: 6, color: "#047857" }}>
            {t(
              lang,
              `Example: ${cycleInfo.payoutDate} pays ${month} salary, counting hours from ${cycleInfo.periodStart} to ${cycleInfo.periodEnd}.`,
              `示例：${cycleInfo.payoutDate} 发放 ${cycleInfo.salaryMonthZh} 工资，统计 ${cycleInfo.periodStart} - ${cycleInfo.periodEnd} 的上课课时。`
            )}
          </div>
        </div>
      ) : null}

      {!confirmedAt ? (
        <form action={confirmPayrollAction} style={{ marginBottom: 12 }}>
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="scope" value={scope} />
          <button type="submit">{t(lang, "Confirm Payroll", "确认工资单")}</button>
        </form>
      ) : null}

      <div style={{ marginBottom: 12 }}>
        <b>{t(lang, "Current Period", "当前周期")}</b>: {periodText}
      </div>

      <div style={{ marginBottom: 16, padding: 10, border: "1px solid #eee", borderRadius: 8, background: "#fafafa" }}>
        <div>
          <b>{t(lang, "Sessions", "课次数")}</b>: {data.totalSessions}
        </div>
        <div>
          <b>{t(lang, "Total Hours", "总课时")}</b>: {data.totalHours}
        </div>
        <div>
          <b>{t(lang, "Total Salary", "总工资")}</b>:{" "}
          {data.totalCurrencyTotals.length === 0
            ? formatMoneyCents(0)
            : data.totalCurrencyTotals.map((item) => (
                <div key={item.currencyCode}>{formatMoneyCents(item.amountCents, item.currencyCode)}</div>
              ))}
        </div>
      </div>

      <h3>{t(lang, "Combo Summary", "课程组合汇总")}</h3>
      {data.comboRows.length === 0 ? (
        <div style={{ color: "#999", marginBottom: 16 }}>{t(lang, "No data in this period.", "当前周期无数据。")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 20 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Course Combo", "课程组合")}</th>
              <th align="left">{t(lang, "Sessions", "课次数")}</th>
              <th align="left">{t(lang, "Hours", "课时")}</th>
              <th align="left">{t(lang, "Hourly Rate", "课时费")}</th>
              <th align="left">{t(lang, "Amount", "金额")}</th>
            </tr>
          </thead>
          <tbody>
            {data.comboRows.map((row) => (
              <tr key={`${row.courseId}-${row.subjectId ?? "-"}-${row.levelId ?? "-"}-${row.teachingMode}-${row.currencyCode}`} style={{ borderTop: "1px solid #eee" }}>
                <td>
                  <div>{formatComboLabel(row.courseName, row.subjectName, row.levelName, row.teachingMode)}</div>
                  {row.usedRateFallback ? (
                    <div style={{ color: "#92400e", fontSize: 12 }}>
                      {t(lang, "Using 1-on-1 fallback for group rate", "班课未配置专属费率，当前回退使用一对一费率")}
                    </div>
                  ) : null}
                </td>
                <td>{row.sessionCount}</td>
                <td>{row.totalHours}</td>
                <td>{formatMoneyCents(row.hourlyRateCents, row.currencyCode)}</td>
                <td>{formatMoneyCents(row.amountCents, row.currencyCode)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>{t(lang, "Session Details", "逐课次明细")}</h3>
      {data.sessionRows.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No session rows.", "暂无课次明细。")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Start", "开始时间")}</th>
              <th align="left">{t(lang, "End", "结束时间")}</th>
              <th align="left">{t(lang, "Student", "学生")}</th>
              <th align="left">{t(lang, "Student Sessions", "该学生课次数")}</th>
              <th align="left">{t(lang, "Course Combo", "课程组合")}</th>
              <th align="left">{t(lang, "Hours", "课时")}</th>
              <th align="left">{t(lang, "Hourly Rate", "课时费")}</th>
              <th align="left">{t(lang, "Status", "状态")}</th>
              <th align="left">{t(lang, "Pending Reason", "未完成原因")}</th>
              <th align="left">{t(lang, "Amount", "金额")}</th>
            </tr>
          </thead>
          <tbody>
            {data.sessionRows.map((row) => (
              <tr key={row.sessionId} style={{ borderTop: "1px solid #eee" }}>
                <td>{DATE_TIME_FMT.format(row.startAt)}</td>
                <td>{DATE_TIME_FMT.format(row.endAt)}</td>
                <td>{row.studentName}</td>
                <td>{row.studentSessionCount}</td>
                <td>
                  <div>{formatComboLabel(row.courseName, row.subjectName, row.levelName, row.teachingMode)}</div>
                  {row.usedRateFallback ? (
                    <div style={{ color: "#92400e", fontSize: 12 }}>
                      {t(lang, "Using 1-on-1 fallback for group rate", "班课未配置专属费率，当前回退使用一对一费率")}
                    </div>
                  ) : null}
                </td>
                <td>{row.totalHours}</td>
                <td>{formatMoneyCents(row.hourlyRateCents, row.currencyCode)}</td>
                <td>
                  <span style={{ color: row.isCompleted ? "#166534" : "#b91c1c", fontWeight: 700 }}>
                    {row.isCompleted ? t(lang, "Completed", "已完成") : t(lang, "Pending", "未完成")}
                  </span>
                </td>
                <td style={{ color: row.isCompleted ? "#64748b" : "#b45309", fontWeight: row.isCompleted ? 400 : 700 }}>
                  {row.isCompleted ? "-" : pendingReasonLabel(lang, row.pendingReason)}
                </td>
                <td>{formatMoneyCents(row.amountCents, row.currencyCode)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
