import type { TicketSchedulingAction } from "@prisma/client";
import { t, type Lang } from "@/lib/i18n";
import { explicitLessonCount } from "@/lib/ticket-result-evidence";
import { schedulingActionDefinition } from "@/lib/ticket-scheduling-actions";
import { formatBusinessDateTime } from "@/lib/date-only";
import TicketLessonPicker from "./TicketLessonPicker";
import ResultSubmitButton from "./ResultSubmitButton";

export default function TicketResultVerification({ ticketId, back, action, index, lang, sourceLabel, sourceCancelled, submit }: {
  ticketId: string; back: string; action: TicketSchedulingAction & { requestedTeacher?: { name: string } | null };
  index: number; lang: Lang; sourceLabel: string | null; sourceCancelled: boolean;
  submit: (data: FormData) => Promise<void>;
}) {
  const supported = ["CREATE_SESSION", "CANCEL_SESSION", "RESCHEDULE_SESSION", "REPLACE_TEACHER"].includes(action.actionType);
  const missingSource = action.actionType !== "CREATE_SESSION" && !sourceLabel;
  const needsTarget = action.actionType === "RESCHEDULE_SESSION" && !action.requestedStartAt || action.actionType === "REPLACE_TEACHER" && !action.requestedTeacherId;
  return <div style={{ borderTop: "1px solid #d6e8e5", paddingTop: 12, minWidth: 0, display: "grid", gap: 8 }}>
    <strong>{index}. {schedulingActionDefinition(action.actionType)?.label ?? action.actionType}</strong>
    {action.requestedStartAt ? <div>{t(lang, "Requested time", "要求时间")}：{formatBusinessDateTime(action.requestedStartAt)}</div> : null}
    {action.requestedTeacher ? <div>{t(lang, "Requested teacher", "要求老师")}：{action.requestedTeacher.name}</div> : null}
    {action.courseLabel ? <div>{t(lang, "Requested course", "要求课程")}：{action.courseLabel}</div> : null}
    {sourceLabel ? <div>{t(lang, "Current original lesson", "原课程当前结果")}：{sourceLabel} · {sourceCancelled ? t(lang, "Cancelled / leave recorded", "已取消／已登记请假") : t(lang, "Active lesson", "未取消")}</div> : null}
    {!supported || missingSource || needsTarget ? <div>
      {t(lang, "Complete the original lesson or target details before verifying this action.", "请先补齐此动作的原课程或目标资料，再核验结果。")}
      <a href="#scheduling-actions">{t(lang, "Complete details / continue processing", "补充资料／继续处理")} →</a>
    </div> : <form action={submit} style={{ display: "grid", gap: 9 }}>
      <input type="hidden" name="id" value={ticketId} /><input type="hidden" name="actionId" value={action.id} /><input type="hidden" name="back" value={back} />
      {action.actionType === "CREATE_SESSION" ? <>
        <div>{t(lang, "Expected lessons / already linked", "要求节数／已关联")}：{explicitLessonCount(action.notes)} / {action.resultSessionIds.length}</div>
        <TicketLessonPicker ticketId={ticketId} actionId={action.id} name="existingResultSessionId" multiple lang={lang}
          resultAction={{ ...action, requestedStartAt: action.requestedStartAt?.toISOString() ?? null }} />
      </> : <div>{action.actionType === "CANCEL_SESSION"
        ? t(lang, "Verify this original lesson directly. The server checks leave, charges and the net ledger; do not restore it first.", "直接核验这节原课程。系统检查请假、收费及实际课时流水，无需先恢复课程。")
        : t(lang, "Check the current lesson against the requested change. The server verifies the original lesson and target.", "核对当前课程是否符合改课／换老师要求，系统会检查原课程与目标。")}</div>}
      <details><summary>{t(lang, "Arrangements changed? Record confirmation", "实际安排有变更？填写确认依据")}</summary>
        <label style={{ display: "block", marginTop: 8 }}><input type="checkbox" name="existingResultChanged" value="1" /> {t(lang, "The parent confirmed the change", "家长已确认这项变更")}</label>
        <textarea name="existingResultNote" rows={2} aria-label={t(lang, "Confirmation evidence", "变更确认依据")}
          placeholder={t(lang, "Who confirmed the changed date, teacher, count or duration, and when?", "谁在何时确认了日期、老师、节数或时长变更？")}
          style={{ width: "100%", boxSizing: "border-box", marginTop: 8 }} />
      </details>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 8 }}><input type="checkbox" name="existingResultVerified" value="1" required />
        <span>{t(lang, "I checked the actual result against this request.", "我已核对实际结果符合这项需求。")}</span>
      </label>
      <ResultSubmitButton action={submit} lang={lang} />
    </form>}
  </div>;
}
