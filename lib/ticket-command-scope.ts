import { explicitLessonCount } from "./ticket-result-evidence";

type Action = { actionType: string; status: string; sourceSessionId?: string | null; notes?: string | null };
export function ticketCommandScopeError(actions: Action[], commands: { commandType: string; sessionId?: string | null; targetId?: string | null; weeks?: number }[]) {
  const open = actions.filter((row) => !["APPLIED", "CANCELLED"].includes(row.status));
  const sourceTypes = ["CANCEL_SESSION", "RESCHEDULE_SESSION", "REPLACE_TEACHER", "CHANGE_SESSION_LOCATION"];
  for (const command of commands) {
    if (!sourceTypes.includes(command.commandType)) continue;
    const id = command.sessionId ?? command.targetId;
    if (!id || !open.some((row) => row.sourceSessionId === id && (row.actionType === command.commandType || command.commandType === "CHANGE_SESSION_LOCATION" && row.actionType === "RESCHEDULE_SESSION"))) {
      return "AI涉及的原课程超出已确认工单范围。请先核对原课次，不能自动扩展到其他日期。";
    }
  }
  const creates = commands.filter((row) => row.commandType === "CREATE_SESSION");
  if (creates.length && open.some((row) => row.actionType === "CREATE_SESSION")) {
    const allowed = open.filter((row) => row.actionType === "CREATE_SESSION").reduce((sum, row) => sum + explicitLessonCount(row.notes), 0);
    if (creates.reduce((sum, row) => sum + (row.weeks ?? 1), 0) > allowed) return "AI排课节数超过工单明确范围，请确认节数后再执行。";
  }
  return null;
}
