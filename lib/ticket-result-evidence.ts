export type ResultAction = {
  actionType: string;
  sourceSessionId?: string | null;
  requestedStartAt?: Date | null;
  requestedTeacherId?: string | null;
  courseLabel?: string | null;
  durationMin?: number | null;
  notes?: string | null;
  chargePolicy?: string | null;
};

export type ResultLesson = {
  id: string;
  startAt: Date;
  endAt: Date;
  teacherId: string;
  courseLabel: string;
  cancelled: boolean;
  charge: boolean;
};

function numberValue(text: string) {
  const chinese: Record<string, number> = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  return chinese[text] ?? Number(text);
}

// Only explicit quantities are constraints. Dates and vague package hours are not lesson counts.
export function explicitLessonCount(notes?: string | null) {
  const original = (notes ?? "").split(/\n\n\[|\[Existing result linked\]/)[0];
  const match = original.match(/(?<![第\d])([1-9]\d?|[一二两三四五六七八九十])\s*(?:节(?:课|计算机|数学|英文)?|次课|次课程)/)
    ?? original.match(/(?:共|安排|课时)\s*([1-9]\d?)\s*次/);
  return match ? numberValue(match[1]) : 1;
}

export function needsMakeupFollowup(action: { actionType: string; replacementRequired?: boolean; notes?: string | null }) {
  if (action.actionType !== "CANCEL_SESSION") return false;
  if (action.replacementRequired) return true;
  const notes = (action.notes ?? "").split(/\n\n\[/)[0];
  if (/(?:不|无)(?:需要|需|用)?(?:再)?补课|无需补课/.test(notes)) return false;
  return /补课|调整到|改至|改到/.test(notes);
}

const businessDay = (date: Date) => new Date(date.getTime() + 8 * 3600000).toISOString().slice(0, 10);

export function checkResultEvidence(action: ResultAction, lessons: ResultLesson[], confirmedChange = false) {
  const errors: string[] = [];
  const differences: string[] = [];
  if (!lessons.length) errors.push("请选择实际处理的课程。");
  if (new Set(lessons.map((row) => row.id)).size !== lessons.length) errors.push("课程不能重复选择。");
  if (action.actionType !== "CREATE_SESSION" && (lessons.length !== 1 || lessons[0]?.id !== action.sourceSessionId)) {
    errors.push("核验对象必须是本动作的原课程。");
  }
  for (const lesson of lessons) {
    if (action.actionType === "CANCEL_SESSION") {
      if (!lesson.cancelled) errors.push("原课程尚未取消，不能标记为取消完成。");
      if (action.chargePolicy === "CHARGE" && !lesson.charge) errors.push("实际扣课状态与工单不一致。");
      if (action.chargePolicy === "NO_CHARGE" && lesson.charge) errors.push("实际扣课状态与工单不一致。");
      continue;
    }
    if (lesson.cancelled) errors.push("已取消课程不能作为排课或改课的完成结果。");
    if (action.requestedStartAt && businessDay(lesson.startAt) !== businessDay(action.requestedStartAt) && explicitLessonCount(action.notes) === 1) {
      differences.push("实际日期与工单日期不同");
    }
    if (action.actionType === "RESCHEDULE_SESSION") {
      if (!action.requestedStartAt) errors.push("请先补充目标时间，再核验改课结果。");
      else if (lesson.startAt.getTime() !== action.requestedStartAt.getTime()) differences.push("实际时间与目标时间不同");
    }
    if (action.actionType === "REPLACE_TEACHER" && !action.requestedTeacherId) errors.push("请先补充目标老师，再核验换老师结果。");
    if (action.requestedTeacherId && lesson.teacherId !== action.requestedTeacherId) differences.push("实际老师与目标老师不同");
    const requestedParts = (action.courseLabel ?? "").split(/\s*\/\s*/).filter(Boolean);
    if (requestedParts.length && requestedParts.some((part) => !lesson.courseLabel.toLowerCase().includes(part.toLowerCase()))) differences.push("实际科目或级别与工单不同");
    if (action.durationMin && Math.round((lesson.endAt.getTime() - lesson.startAt.getTime()) / 60000) !== action.durationMin) differences.push("实际单节时长与工单不同");
  }
  const original = (action.notes ?? "").split(/\n\n\[/)[0];
  const totalMatch = original.match(/(?:总(?:时长)?|共)\s*(\d+(?:\.\d+)?)\s*(分钟|小时)/);
  const totalMinutes = lessons.reduce((sum, row) => sum + Math.round((row.endAt.getTime() - row.startAt.getTime()) / 60000), 0);
  if (action.actionType === "CREATE_SESSION" && lessons.length > explicitLessonCount(action.notes)) differences.push("实际关联节数超过本次明确范围");
  if (action.actionType === "CREATE_SESSION" && totalMatch && lessons.length >= explicitLessonCount(action.notes)) {
    const required = Number(totalMatch[1]) * (totalMatch[2] === "小时" ? 60 : 1);
    if (totalMinutes !== required) differences.push("实际总时长与原需求不同");
  }
  if (differences.length && !confirmedChange) errors.push(`${[...new Set(differences)].join("；")}。请核对，若需求已变更，填写确认依据。`);
  return { errors: [...new Set(errors)], differences: [...new Set(differences)], totalMinutes,
    complete: action.actionType !== "CREATE_SESSION" || lessons.length >= explicitLessonCount(action.notes),
    expectedCount: action.actionType === "CREATE_SESSION" ? explicitLessonCount(action.notes) : 1 };
}
