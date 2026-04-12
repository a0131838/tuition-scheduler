import { listBookingSlotsForMonth, monthKey, type BookingSlot } from "@/lib/booking";
import {
  deriveParentAvailabilitySearchWindow,
  type ParentAvailabilityPayload,
} from "@/lib/parent-availability";

type EnrollmentLike = {
  class: {
    subjectId: string | null;
    levelId: string | null;
    teacherId: string;
    subject?: { name: string } | null;
    level?: { name: string } | null;
    teacher?: { name: string } | null;
  };
};

type TeacherLike = {
  id: string;
  name: string;
  subjectCourseId?: string | null;
  subjects?: Array<{ id: string; name: string }>;
};

export type SchedulingCoordinationTeacherOption = {
  teacherId: string;
  teacherName: string;
  subjectId?: string;
  subjectLabel?: string;
  levelId?: string;
  levelLabel?: string;
  assigned: boolean;
};

export type SchedulingCoordinationPhaseKey =
  | "waiting_parent_submission"
  | "availability_options_ready"
  | "waiting_parent_choice"
  | "teacher_exception_needed"
  | "waiting_teacher_exception"
  | "manual_review_after_resubmission"
  | "ready_to_schedule"
  | "closed";

export type SchedulingCoordinationPhase = {
  key: SchedulingCoordinationPhaseKey;
  title: string;
  badge: string;
  description: string;
  nextStep: string;
};

export function normalizeSchedulingCoordinationCourseKey(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function schedulingCoordinationCourseLabelsMatch(
  left: string | null | undefined,
  right: string | null | undefined
) {
  const normalizedLeft = normalizeSchedulingCoordinationCourseKey(left);
  const normalizedRight = normalizeSchedulingCoordinationCourseKey(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function bilingualCoordinationText(zh: string, en: string) {
  return `${zh} / ${en}`;
}

const SCHEDULING_COORDINATION_EXACT_TEXT_MAP = new Map<string, string>([
  [
    "Need to coordinate lesson times with the parent using the teacher's submitted availability as the default scheduling source.",
    bilingualCoordinationText("当前需要基于老师 availability 协调家长上课时间，并以老师已提交的 availability 作为默认排课依据。", "Need to coordinate lesson times with the parent using the teacher's submitted availability as the default scheduling source."),
  ],
  [
    "Send availability-based slot options to the parent, record any special time request, and only return to the teacher if the requested time falls outside submitted availability.",
    bilingualCoordinationText("先把基于 availability 的候选时间发给家长，记录特殊时间要求；只有当家长要求时间不在已提交 availability 内时，才回到老师确认。", "Send availability-based slot options to the parent, record any special time request, and only return to the teacher if the requested time falls outside submitted availability."),
  ],
  [
    "Send or resend the parent availability form, wait for the family to submit preferred times, then continue from teacher availability.",
    bilingualCoordinationText("发送或重发家长可上课时间表单，等待家长提交偏好时间，再继续按老师 availability 往下推进。", "Send or resend the parent availability form, wait for the family to submit preferred times, then continue from teacher availability."),
  ],
  [
    "Parent availability form sent / waiting for response",
    bilingualCoordinationText("家长可上课时间表单已发送，等待回复", "Parent availability form sent / waiting for response"),
  ],
  [
    "Availability-backed slot options have been sent to the parent. Wait for the family to choose one before scheduling.",
    bilingualCoordinationText("基于 availability 的候选时间已发给家长，等待家长选定后再排课。", "Availability-backed slot options have been sent to the parent. Wait for the family to choose one before scheduling."),
  ],
  [
    "Parent preferences do not match current availability. Ask the teacher to confirm this exception or suggest another time.",
    bilingualCoordinationText("家长偏好与当前 availability 不匹配，需要老师确认是否接受这个例外，或提供其他时间。", "Parent preferences do not match current availability. Ask the teacher to confirm this exception or suggest another time."),
  ],
  [
    "A new parent availability submission arrived after the ticket had already been confirmed. Review it manually before changing the final lesson plan.",
    bilingualCoordinationText("这张工单已确认后，家长又提交了新的可上课时间；调整最终课表前请先人工复核。", "A new parent availability submission arrived after the ticket had already been confirmed. Review it manually before changing the final lesson plan."),
  ],
  [
    "Parent availability already matches current teacher availability. Review the matched slots, send the availability-backed options to the family, and then move the ticket to waiting for the parent choice.",
    bilingualCoordinationText("家长提交的时间已经命中当前老师 availability。请先查看命中的时间，发给家长确认，再把工单推进到等待家长选择。", "Parent availability already matches current teacher availability. Review the matched slots, send the availability-backed options to the family, and then move the ticket to waiting for the parent choice."),
  ],
  [
    "Parent availability was submitted but no current teacher availability matches yet. Review nearby alternatives first, then ask for a teacher exception only if the family insists on the unavailable timing.",
    bilingualCoordinationText("家长已提交时间，但当前没有老师 availability 命中。请先看邻近替代时间，只有家长坚持该时间时才转老师做例外确认。", "Parent availability was submitted but no current teacher availability matches yet. Review nearby alternatives first, then ask for a teacher exception only if the family insists on the unavailable timing."),
  ],
  [
    "Ops sent availability-backed slot options to the parent and is now waiting for the family's choice.",
    bilingualCoordinationText("教务已把基于 availability 的候选时间发给家长，当前等待家长选择。", "Ops sent availability-backed slot options to the parent and is now waiting for the family's choice."),
  ],
  [
    "Ops escalated the parent's requested timing to the teacher because it falls outside current availability.",
    bilingualCoordinationText("由于家长要求的时间不在当前 availability 内，教务已把这个请求转给老师做例外确认。", "Ops escalated the parent's requested timing to the teacher because it falls outside current availability."),
  ],
  [
    "Scheduling coordination follow-up",
    bilingualCoordinationText("排课协调跟进", "Scheduling coordination follow-up"),
  ],
  [
    "Need parent preferred lesson times",
    bilingualCoordinationText("需要家长提供偏好的上课时间", "Need parent preferred lesson times"),
  ],
  [
    "Hotfix retest for parent availability origin",
    bilingualCoordinationText("家长时间表链接来源热修复回归测试", "Hotfix retest for parent availability origin"),
  ],
  [
    "QA final verification for Emily success panel",
    bilingualCoordinationText("Emily 成功提示面板最终测试", "QA final verification for Emily success panel"),
  ],
  [
    "This coordination item has already been closed.",
    bilingualCoordinationText("这条排课协调已关闭。", "This coordination item has already been closed."),
  ],
  [
    "Open a new coordination ticket only if timing needs to be re-opened.",
    bilingualCoordinationText("只有在需要重新打开时间协调时，才新建一张排课协调工单。", "Open a new coordination ticket only if timing needs to be re-opened."),
  ],
  [
    "The family and ops side are aligned enough to place the lesson using Quick Schedule.",
    bilingualCoordinationText("家长和教务这边的信息已经足够一致，可以直接用快速排课安排课程。", "The family and ops side are aligned enough to place the lesson using Quick Schedule."),
  ],
  [
    "Use Quick Schedule to place the lesson, then close the coordination ticket.",
    bilingualCoordinationText("先用快速排课把课程排进去，再关闭这张排课协调工单。", "Use Quick Schedule to place the lesson, then close the coordination ticket."),
  ],
  [
    "The requested timing sits outside normal availability and now needs a teacher-side answer.",
    bilingualCoordinationText("当前请求时间落在正常 availability 之外，需要老师端给出答复。", "The requested timing sits outside normal availability and now needs a teacher-side answer."),
  ],
  [
    "Wait for the teacher's exception reply or nudge the teacher if it becomes overdue.",
    bilingualCoordinationText("等待老师的例外确认回复；如果超时，就继续催老师。", "Wait for the teacher's exception reply or nudge the teacher if it becomes overdue."),
  ],
  [
    "The parent availability form has not been submitted yet.",
    bilingualCoordinationText("家长可上课时间表单还没有提交。", "The parent availability form has not been submitted yet."),
  ],
  [
    "Collection mode:",
    bilingualCoordinationText("收集方式 / Collection mode:", "Collection mode:"),
  ],
  [
    "Send or resend the parent form link and wait for the family's available times.",
    bilingualCoordinationText("发送或重发家长表单链接，并等待家长提交可上课时间。", "Send or resend the parent form link and wait for the family's available times."),
  ],
  [
    "Availability-backed options were already sent out and ops is now waiting for the family to choose.",
    bilingualCoordinationText("基于 availability 的候选时间已经发出，当前等待家长选择。", "Availability-backed options were already sent out and ops is now waiting for the family to choose."),
  ],
  [
    "Wait for the parent's reply, or follow up again if no answer comes back.",
    bilingualCoordinationText("等待家长回复；如果迟迟没有回音，就继续跟进。", "Wait for the parent's reply, or follow up again if no answer comes back."),
  ],
  [
    "The parent's submitted times already match current teacher availability.",
    bilingualCoordinationText("家长提交的时间已经命中当前老师 availability。", "The parent's submitted times already match current teacher availability."),
  ],
  [
    "Send these matching slots to the parent, then move the ticket to waiting-for-parent-choice.",
    bilingualCoordinationText("先把这些命中的时间发给家长，再把工单推进到等待家长确认。", "Send these matching slots to the parent, then move the ticket to waiting-for-parent-choice."),
  ],
  [
    "No current availability matches the submitted parent preferences.",
    bilingualCoordinationText("当前没有 availability 能命中家长提交的偏好。", "No current availability matches the submitted parent preferences."),
  ],
  [
    "Send nearby alternatives first, or mark the item for teacher exception confirmation if the family insists.",
    bilingualCoordinationText("先发邻近替代时间；如果家长坚持原时间，再把这条记录转成老师例外确认。", "Send nearby alternatives first, or mark the item for teacher exception confirmation if the family insists."),
  ],
]);

const SCHEDULING_COORDINATION_PREFIX_REPLACEMENTS: Array<[string, string]> = [
  ["Parent availability summary:", "家长时间表摘要 / Parent availability summary:"],
  ["Available days:", "可上课星期 / Available days:"],
  ["Available time ranges:", "常用可上课时间段 / Available time ranges:"],
  ["Earliest start:", "最早可开始日期 / Earliest start:"],
  ["Mode preference:", "上课形式偏好 / Mode preference:"],
  ["Teacher preference:", "老师偏好 / Teacher preference:"],
  ["Parent note:", "家长备注 / Parent note:"],
  ["Specific dates:", "具体日期时间 / Specific dates:"],
];

export function formatSchedulingCoordinationSystemText(raw: string | null | undefined) {
  const src = String(raw ?? "");
  if (!src.trim()) return "";

  const replacePattern = (line: string) => {
    let replaced = line;
    replaced = replaced.replace(
      /Parent availability submitted \/ (\d+) matching availability-backed slot\(s\) ready for ops review/g,
      (_, count) => `家长已提交时间表，已找到 ${count} 条 availability 候选时间待教务查看 / Parent availability submitted / ${count} matching availability-backed slot(s) ready for ops review`
    );
    replaced = replaced.replace(
      /Parent re-submitted availability after confirmation \/ (\d+) matching slot\(s\) found/g,
      (_, count) => `家长在工单确认后再次提交时间表，已找到 ${count} 条命中时间 / Parent re-submitted availability after confirmation / ${count} matching slot(s) found`
    );
    replaced = replaced.replace(
      /Parent re-submitted availability after confirmation \/ manual review needed/g,
      "家长在工单确认后再次提交时间表，需要人工复核 / Parent re-submitted availability after confirmation / manual review needed"
    );
    replaced = replaced.replace(
      /Parent availability submitted \/ no current availability match yet/g,
      "家长已提交时间表，但当前还没有 availability 命中 / Parent availability submitted / no current availability match yet"
    );
    replaced = replaced.replace(
      /QA final verification for Emily success panel/g,
      "Emily 成功提示面板最终测试 / QA final verification for Emily success panel"
    );
    replaced = replaced.replace(
      /Hotfix retest for parent availability origin/g,
      "家长时间表链接来源热修复回归测试 / Hotfix retest for parent availability origin"
    );
    return replaced;
  };

  return src
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      const exact = SCHEDULING_COORDINATION_EXACT_TEXT_MAP.get(trimmed);
      if (exact) return line.replace(trimmed, exact);
      for (const [prefix, replacement] of SCHEDULING_COORDINATION_PREFIX_REPLACEMENTS) {
        if (trimmed.startsWith(prefix)) {
          return line.replace(trimmed, `${replacement} ${trimmed.slice(prefix.length).trimStart()}`.trim());
        }
      }
      const regexReplaced = replacePattern(trimmed);
      if (regexReplaced !== trimmed) {
        return line.replace(trimmed, regexReplaced);
      }
      return line;
    })
    .join("\n");
}

export function schedulingCoordinationCurrentIssueText() {
  return formatSchedulingCoordinationSystemText(
    "Need to coordinate lesson times with the parent using the teacher's submitted availability as the default scheduling source."
  );
}

export function schedulingCoordinationInitialRequiredActionText() {
  return formatSchedulingCoordinationSystemText(
    "Send availability-based slot options to the parent, record any special time request, and only return to the teacher if the requested time falls outside submitted availability."
  );
}

export function schedulingCoordinationWaitingParentAction() {
  return formatSchedulingCoordinationSystemText(
    "Send or resend the parent availability form, wait for the family to submit preferred times, then continue from teacher availability."
  );
}

export function schedulingCoordinationWaitingParentSummary() {
  return formatSchedulingCoordinationSystemText("Parent availability form sent / waiting for response");
}

export function schedulingCoordinationWaitingParentChoiceAction() {
  return formatSchedulingCoordinationSystemText(
    "Availability-backed slot options have been sent to the parent. Wait for the family to choose one before scheduling."
  );
}

export function schedulingCoordinationTeacherExceptionAction() {
  return formatSchedulingCoordinationSystemText(
    "Parent preferences do not match current availability. Ask the teacher to confirm this exception or suggest another time."
  );
}

export function schedulingCoordinationParentChoiceLoggedText() {
  return formatSchedulingCoordinationSystemText(
    "Ops sent availability-backed slot options to the parent and is now waiting for the family's choice."
  );
}

export function schedulingCoordinationTeacherExceptionLoggedText() {
  return formatSchedulingCoordinationSystemText(
    "Ops escalated the parent's requested timing to the teacher because it falls outside current availability."
  );
}

export function deriveSchedulingCoordinationParentSubmissionUpdate(args: {
  currentStatus: string;
  matchedSlotCount?: number;
}) {
  const matchedSlotCount = Math.max(0, args.matchedSlotCount ?? 0);
  if (args.currentStatus === "Confirmed") {
    return {
      status: "Confirmed",
      nextAction: formatSchedulingCoordinationSystemText(
        "A new parent availability submission arrived after the ticket had already been confirmed. Review it manually before changing the final lesson plan."
      ),
      parentAvailabilitySummary:
        matchedSlotCount > 0
          ? formatSchedulingCoordinationSystemText(`Parent re-submitted availability after confirmation / ${matchedSlotCount} matching slot(s) found`)
          : formatSchedulingCoordinationSystemText("Parent re-submitted availability after confirmation / manual review needed"),
    } as const;
  }

  if (matchedSlotCount > 0) {
    return {
      status: "Need Info",
      nextAction: formatSchedulingCoordinationSystemText(
        "Parent availability already matches current teacher availability. Review the matched slots, send the availability-backed options to the family, and then move the ticket to waiting for the parent choice."
      ),
      parentAvailabilitySummary: formatSchedulingCoordinationSystemText(
        `Parent availability submitted / ${matchedSlotCount} matching availability-backed slot(s) ready for ops review`
      ),
    } as const;
  }

  return {
    status: "Need Info",
    nextAction: formatSchedulingCoordinationSystemText(
      "Parent availability was submitted but no current teacher availability matches yet. Review nearby alternatives first, then ask for a teacher exception only if the family insists on the unavailable timing."
    ),
    parentAvailabilitySummary: formatSchedulingCoordinationSystemText(
      "Parent availability submitted / no current availability match yet"
    ),
  } as const;
}

export function buildSchedulingCoordinationTeacherOptions(args: {
  enrollments: EnrollmentLike[];
  teachers: TeacherLike[];
}) {
  const subjectMeta = new Map<string, { subjectLabel?: string; levelId?: string; levelLabel?: string }>();
  const assignedTeacherIds = new Set<string>();
  const options = new Map<string, SchedulingCoordinationTeacherOption>();

  for (const enrollment of args.enrollments) {
    const subjectId = enrollment.class.subjectId ?? undefined;
    if (!subjectId) continue;
    subjectMeta.set(subjectId, {
      subjectLabel: enrollment.class.subject?.name ?? undefined,
      levelId: enrollment.class.levelId ?? undefined,
      levelLabel: enrollment.class.level?.name ?? undefined,
    });
    assignedTeacherIds.add(enrollment.class.teacherId);
    options.set(enrollment.class.teacherId, {
      teacherId: enrollment.class.teacherId,
      teacherName: enrollment.class.teacher?.name ?? enrollment.class.teacherId,
      subjectId,
      subjectLabel: enrollment.class.subject?.name ?? undefined,
      levelId: enrollment.class.levelId ?? undefined,
      levelLabel: enrollment.class.level?.name ?? undefined,
      assigned: true,
    });
  }

  for (const teacher of args.teachers) {
    const matchedSubject = teacher.subjects?.find((subject) => subjectMeta.has(subject.id));
    const matchedSubjectId = matchedSubject?.id ?? (teacher.subjectCourseId && subjectMeta.has(teacher.subjectCourseId) ? teacher.subjectCourseId : undefined);
    if (!matchedSubjectId) continue;
    if (options.has(teacher.id)) continue;
    const matchedMeta = subjectMeta.get(matchedSubjectId);
    options.set(teacher.id, {
      teacherId: teacher.id,
      teacherName: teacher.name,
      subjectId: matchedSubjectId,
      subjectLabel: matchedMeta?.subjectLabel ?? matchedSubject?.name ?? undefined,
      levelId: matchedMeta?.levelId,
      levelLabel: matchedMeta?.levelLabel,
      assigned: assignedTeacherIds.has(teacher.id),
    });
  }

  return Array.from(options.values()).sort((a, b) => {
    if (a.assigned !== b.assigned) return a.assigned ? -1 : 1;
    return a.teacherName.localeCompare(b.teacherName);
  });
}

export function deriveSchedulingCoordinationPhase(args: {
  ticketStatus: string;
  hasParentForm: boolean;
  parentSubmittedAt?: Date | null;
  matchedSlotCount?: number;
  parentAvailabilitySummary?: string | null;
}): SchedulingCoordinationPhase {
  const matchedSlotCount = Math.max(0, args.matchedSlotCount ?? 0);
  const parentSubmitted = Boolean(args.parentSubmittedAt);
  const parentAvailabilitySummary = String(args.parentAvailabilitySummary ?? "");

  if (["Completed", "Cancelled"].includes(args.ticketStatus)) {
    return {
      key: "closed",
      title: "Closed / 已关闭",
      badge: "Closed / 已关闭",
      description: formatSchedulingCoordinationSystemText("This coordination item has already been closed."),
      nextStep: formatSchedulingCoordinationSystemText("Open a new coordination ticket only if timing needs to be re-opened."),
    };
  }

  if (args.ticketStatus === "Confirmed") {
    if (parentAvailabilitySummary.includes("Parent re-submitted availability after confirmation")) {
      return {
        key: "manual_review_after_resubmission",
        title: "Manual review needed / 需人工复核",
        badge: "Review / 复核",
        description: formatSchedulingCoordinationSystemText(
          "A new parent availability submission arrived after the ticket had already been confirmed. Review it manually before changing the final lesson plan."
        ),
        nextStep: formatSchedulingCoordinationSystemText(
          matchedSlotCount > 0
            ? "Parent availability already matches current teacher availability. Review the matched slots first, then decide whether the final lesson plan should change."
            : "No current availability matches the new parent submission yet. Review alternatives first before changing the final lesson plan."
        ),
      };
    }
    return {
      key: "ready_to_schedule",
      title: "Ready to schedule / 可直接排课",
      badge: "Ready / 可排",
      description: formatSchedulingCoordinationSystemText("The family and ops side are aligned enough to place the lesson using Quick Schedule."),
      nextStep: formatSchedulingCoordinationSystemText("Use Quick Schedule to place the lesson, then close the coordination ticket."),
    };
  }

  if (args.ticketStatus === "Waiting Teacher" || args.ticketStatus === "Exception") {
    return {
      key: "waiting_teacher_exception",
      title: "Waiting teacher exception / 等老师例外确认",
      badge: "Teacher / 老师",
      description: formatSchedulingCoordinationSystemText("The requested timing sits outside normal availability and now needs a teacher-side answer."),
      nextStep: formatSchedulingCoordinationSystemText("Wait for the teacher's exception reply or nudge the teacher if it becomes overdue."),
    };
  }

  if (!args.hasParentForm || !parentSubmitted) {
    return {
      key: "waiting_parent_submission",
      title: "Waiting for parent submission / 等家长提交",
      badge: "Parent / 家长",
      description: formatSchedulingCoordinationSystemText("The parent availability form has not been submitted yet."),
      nextStep: formatSchedulingCoordinationSystemText("Send or resend the parent form link and wait for the family's available times."),
    };
  }

  if (args.ticketStatus === "Waiting Parent") {
    return {
      key: "waiting_parent_choice",
      title: "Waiting for parent choice / 等家长确认",
      badge: "Reply / 等回复",
      description: formatSchedulingCoordinationSystemText("Availability-backed options were already sent out and ops is now waiting for the family to choose."),
      nextStep: formatSchedulingCoordinationSystemText("Wait for the parent's reply, or follow up again if no answer comes back."),
    };
  }

  if (matchedSlotCount > 0) {
    return {
      key: "availability_options_ready",
      title: "Availability options ready / 候选时间已就绪",
      badge: "Match / 命中",
      description: formatSchedulingCoordinationSystemText("The parent's submitted times already match current teacher availability."),
      nextStep: formatSchedulingCoordinationSystemText("Send these matching slots to the parent, then move the ticket to waiting-for-parent-choice."),
    };
  }

  return {
    key: "teacher_exception_needed",
    title: "Teacher exception likely needed / 可能需要老师例外确认",
    badge: "Exception / 例外",
    description: formatSchedulingCoordinationSystemText("No current availability matches the submitted parent preferences."),
    nextStep: formatSchedulingCoordinationSystemText("Send nearby alternatives first, or mark the item for teacher exception confirmation if the family insists."),
  };
}

export function inferSchedulingCoordinationDurationMin(args: {
  ticketDurationMin?: number | null;
  upcomingSessions: Array<{ startAt: Date; endAt: Date }>;
  monthlySessions: Array<{ startAt: Date; endAt: Date }>;
}) {
  const ticketDurationMin = Math.round(Number(args.ticketDurationMin ?? 0));
  if (Number.isFinite(ticketDurationMin) && ticketDurationMin >= 15) {
    return ticketDurationMin;
  }
  const sample = args.upcomingSessions[0] ?? args.monthlySessions[0] ?? null;
  if (!sample) return 45;
  const minutes = Math.round((sample.endAt.getTime() - sample.startAt.getTime()) / 60000);
  return Number.isFinite(minutes) && minutes >= 15 ? minutes : 45;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfWindow(date: Date, horizonDays: number) {
  const end = startOfDay(date);
  end.setDate(end.getDate() + Math.max(1, horizonDays));
  return end;
}

function uniqueMonthsBetween(startAt: Date, endAt: Date) {
  const months: string[] = [];
  const cursor = new Date(startAt.getFullYear(), startAt.getMonth(), 1, 0, 0, 0, 0);
  const limit = new Date(endAt.getFullYear(), endAt.getMonth(), 1, 0, 0, 0, 0);
  while (cursor <= limit) {
    months.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

export async function listSchedulingCoordinationCandidateSlots(args: {
  studentId: string;
  teacherOptions: SchedulingCoordinationTeacherOption[];
  teacherId?: string;
  startAt: Date;
  durationMin: number;
  horizonDays?: number;
  maxSlots?: number;
}) {
  const selectedTeachers = args.teacherId
    ? args.teacherOptions.filter((option) => option.teacherId === args.teacherId)
    : args.teacherOptions;
  if (selectedTeachers.length === 0) return [] as BookingSlot[];

  const windowStart = startOfDay(args.startAt);
  const windowEnd = endOfWindow(args.startAt, args.horizonDays ?? 14);
  const months = uniqueMonthsBetween(windowStart, windowEnd);

  const slotCollections = await Promise.all(
    months.map((month) =>
      listBookingSlotsForMonth({
        linkId: `coordination:${args.studentId}`,
        teachers: selectedTeachers.map((option) => ({
          teacherId: option.teacherId,
          teacherName: option.teacherName,
          subjectLabel: option.subjectLabel,
        })),
        startDate: windowStart,
        endDate: windowEnd,
        durationMin: args.durationMin,
        month,
        stepMin: args.durationMin,
      })
    )
  );

  const merged = slotCollections
    .flatMap((result) => result?.slots ?? [])
    .filter((slot) => slot.startAt >= args.startAt && slot.endAt <= windowEnd)
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime() || a.teacherName.localeCompare(b.teacherName));

  return merged.slice(0, Math.max(1, args.maxSlots ?? 5));
}

export async function evaluateSchedulingSpecialRequest(args: {
  studentId: string;
  teacherOptions: SchedulingCoordinationTeacherOption[];
  teacherId?: string;
  requestedStartAt: Date;
  durationMin: number;
}) {
  const exactCandidates = await listSchedulingCoordinationCandidateSlots({
    studentId: args.studentId,
    teacherOptions: args.teacherOptions,
    teacherId: args.teacherId,
    startAt: args.requestedStartAt,
    durationMin: args.durationMin,
    horizonDays: 7,
    maxSlots: 12,
  });

  const requestedEndAt = new Date(args.requestedStartAt.getTime() + args.durationMin * 60000);
  const matches = exactCandidates.filter(
    (slot) =>
      slot.startAt.getTime() === args.requestedStartAt.getTime() && slot.endAt.getTime() === requestedEndAt.getTime()
  );

  return {
    matches,
    alternatives: exactCandidates
      .filter((slot) => slot.startAt.getTime() !== args.requestedStartAt.getTime())
      .slice(0, 3),
  };
}

export async function listSchedulingCoordinationParentMatchedSlots(args: {
  studentId: string;
  teacherOptions: SchedulingCoordinationTeacherOption[];
  teacherId?: string;
  payload: ParentAvailabilityPayload | null | undefined;
  startAt?: Date;
  durationMin: number;
  maxSlots?: number;
}) {
  const payload = args.payload;
  if (!payload) {
    return listSchedulingCoordinationCandidateSlots({
      studentId: args.studentId,
      teacherOptions: args.teacherOptions,
      teacherId: args.teacherId,
      startAt: args.startAt ?? new Date(),
      durationMin: args.durationMin,
      maxSlots: args.maxSlots,
    });
  }

  const requestedStart = args.startAt ?? new Date();
  const derivedWindow = deriveParentAvailabilitySearchWindow({
    payload,
    now: requestedStart,
    defaultHorizonDays: 14,
  });
  const windowStart =
    derivedWindow.startAt.getTime() > requestedStart.getTime() ? derivedWindow.startAt : requestedStart;
  const scanLimit = payload.selectionMode === "calendar" ? 240 : 180;
  const teacherSlots = await listSchedulingCoordinationCandidateSlots({
    studentId: args.studentId,
    teacherOptions: args.teacherOptions,
    teacherId: args.teacherId,
    startAt: windowStart,
    horizonDays: derivedWindow.horizonDays,
    durationMin: args.durationMin,
    maxSlots: scanLimit,
  });

  const matchedSlots = filterSchedulingSlotsByParentAvailability(teacherSlots, payload);
  const maxSlots = Math.max(1, args.maxSlots ?? 5);
  if (payload.selectionMode !== "calendar" || payload.dateSelections.length === 0) {
    return matchedSlots.slice(0, maxSlots);
  }
  return prioritizeCalendarDateCoverage(matchedSlots, payload, maxSlots);
}

function prioritizeCalendarDateCoverage(
  slots: BookingSlot[],
  payload: ParentAvailabilityPayload,
  maxSlots: number
) {
  const requestedDates = Array.from(
    new Set(payload.dateSelections.map((selection) => selection.date).filter(Boolean))
  );
  if (requestedDates.length <= 1 || slots.length <= maxSlots) {
    return slots.slice(0, maxSlots);
  }

  const slotsByDate = new Map<string, BookingSlot[]>();
  for (const slot of slots) {
    const bucket = slotsByDate.get(slot.dateKey) ?? [];
    bucket.push(slot);
    slotsByDate.set(slot.dateKey, bucket);
  }

  const remainingByDate = new Map<string, BookingSlot[]>(
    requestedDates.map((date) => [date, [...(slotsByDate.get(date) ?? [])]])
  );
  const prioritized: BookingSlot[] = [];
  const seenSlotKeys = new Set<string>();

  while (prioritized.length < maxSlots) {
    let addedInRound = false;
    for (const date of requestedDates) {
      if (prioritized.length >= maxSlots) break;
      const bucket = remainingByDate.get(date) ?? [];
      const next = bucket.shift();
      remainingByDate.set(date, bucket);
      if (!next || seenSlotKeys.has(next.slotKey)) continue;
      prioritized.push(next);
      seenSlotKeys.add(next.slotKey);
      addedInRound = true;
    }
    if (!addedInRound) break;
  }

  for (const slot of slots) {
    if (prioritized.length >= maxSlots) break;
    if (seenSlotKeys.has(slot.slotKey)) continue;
    prioritized.push(slot);
  }

  return prioritized.slice(0, maxSlots);
}

const WEEKDAY_TO_JS_DAY: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

export function filterSchedulingSlotsByParentAvailability(
  slots: BookingSlot[],
  payload: ParentAvailabilityPayload | null | undefined
) {
  if (!payload) return slots;

  if (payload.selectionMode === "calendar" && payload.dateSelections.length > 0) {
    return slots.filter((slot) => {
      const dateKey = `${slot.startAt.getFullYear()}-${String(slot.startAt.getMonth() + 1).padStart(2, "0")}-${String(slot.startAt.getDate()).padStart(2, "0")}`;
      const start = `${String(slot.startAt.getHours()).padStart(2, "0")}:${String(slot.startAt.getMinutes()).padStart(2, "0")}`;
      const end = `${String(slot.endAt.getHours()).padStart(2, "0")}:${String(slot.endAt.getMinutes()).padStart(2, "0")}`;
      return payload.dateSelections.some((selection) => selection.date === dateKey && start >= selection.start && end <= selection.end);
    });
  }

  const allowedWeekdays = new Set(
    payload.weekdays.map((weekday) => WEEKDAY_TO_JS_DAY[weekday]).filter((value) => Number.isInteger(value))
  );
  const earliestStart = payload.earliestStartDate ? new Date(`${payload.earliestStartDate}T00:00:00`) : null;
  const timeRanges = payload.timeRanges
    .map((range) => ({
      start: range.start,
      end: range.end,
    }))
    .filter((range) => range.start && range.end);

  return slots.filter((slot) => {
    if (earliestStart && slot.startAt < earliestStart) return false;
    if (allowedWeekdays.size > 0 && !allowedWeekdays.has(slot.startAt.getDay())) return false;
    if (timeRanges.length === 0) return true;
    const start = `${String(slot.startAt.getHours()).padStart(2, "0")}:${String(slot.startAt.getMinutes()).padStart(2, "0")}`;
    const end = `${String(slot.endAt.getHours()).padStart(2, "0")}:${String(slot.endAt.getMinutes()).padStart(2, "0")}`;
    return timeRanges.some((range) => start >= range.start && end <= range.end);
  });
}

export function buildSchedulingCoordinationSlotShareText(
  slot: { teacherName: string; startAt: Date; endAt: Date },
  variant: "default" | "match" | "alternative" = "default"
) {
  const yyyy = slot.startAt.getFullYear();
  const mm = String(slot.startAt.getMonth() + 1).padStart(2, "0");
  const dd = String(slot.startAt.getDate()).padStart(2, "0");
  const dateLabel = `${yyyy}-${mm}-${dd}`;
  const start = `${String(slot.startAt.getHours()).padStart(2, "0")}:${String(slot.startAt.getMinutes()).padStart(2, "0")}`;
  const end = `${String(slot.endAt.getHours()).padStart(2, "0")}:${String(slot.endAt.getMinutes()).padStart(2, "0")}`;
  const lead =
    variant === "match"
      ? "您好，您刚刚提出的这个时间老师 availability 可以直接安排。"
      : variant === "alternative"
        ? "您好，原时间暂时不在老师已提交的 availability 里，这里有一个最近可排的替代时间供您确认。"
        : "您好，这里先给您一个基于老师 availability 的可排时间，您确认后我们就可以继续安排。";
  const leadEn =
    variant === "match"
      ? "The requested time matches the teacher's submitted availability."
      : variant === "alternative"
        ? "The original request is outside current availability, but here is the nearest available alternative."
        : "Here is an availability-backed lesson option for your confirmation.";
  return [
    lead,
    `时间 / Time: ${dateLabel} ${start}-${end}`,
    `老师 / Teacher: ${slot.teacherName}`,
    "",
    leadEn,
    `Time: ${dateLabel} ${start}-${end}`,
    `Teacher: ${slot.teacherName}`,
  ].join("\n");
}
