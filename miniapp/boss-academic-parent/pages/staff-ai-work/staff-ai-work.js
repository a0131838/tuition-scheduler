const api = require("../../utils/api");

function actionFor(item) {
  return { kind: "prepare", label: "查看完整处理方案" };
}

function friendlyMessage(value, fallback = "处理失败，请稍后重试") {
  const text = String(value || "").trim();
  const weekday = { Sun: "周日", Mon: "周一", Tue: "周二", Wed: "周三", Thu: "周四", Fri: "周五", Sat: "周六" };
  const missingDate = text.match(/No date availability on (Sun|Mon|Tue|Wed|Thu|Fri|Sat)/i);
  if (missingDate) return `老师尚未维护${weekday[missingDate[1]] || missingDate[1]}当天的可排课时间。请联系老师补充该日期的时间，或改选其他老师/日期。`;
  const outsideDate = text.match(/Outside date availability (Sun|Mon|Tue|Wed|Thu|Fri|Sat) ([0-9:]+)-([0-9:]+)\. Available: (.+)/i);
  if (outsideDate) return `申请的${weekday[outsideDate[1]] || outsideDate[1]} ${outsideDate[2]}–${outsideDate[3]}不在老师可用时间内。老师当前可用：${outsideDate[4]}。请改选时间或老师。`;
  if (/MISSING_COMMAND_INPUT/i.test(text)) return "AI还缺少生成正式操作所需的资料，请查看下方列出的具体缺失项。";
  if (/NO_FEASIBLE_SCHEDULE/i.test(text)) return "现有老师、家长时间和课包条件暂时无法同时满足，请查看下方原因并调整一项条件。";
  return text ? text.replace(/availability/ig, "可用时间") : fallback;
}

const ACTION_LABELS = {
  CREATE_SESSION: "新增课程", RESCHEDULE_SESSION: "调整课程时间", CANCEL_SESSION: "取消课程",
  REPLACE_TEACHER: "更换老师", CREATE_ASSESSMENT_TASK: "建立评估任务",
  PACKAGE_ACTIVATION_REVIEW: "建立课包资料与财务核对", ACADEMIC_CASE_HANDOFF: "建立学术处理",
  SERVICE_CASE_HANDOFF: "建立客服处理", OPERATION_CORRECTION_REVIEW: "建立纠正审批",
};

const WORKFLOW_LABELS = {
  NEW_SCHEDULE: "新学生排课",
  RESCHEDULE: "修改上课时间",
  CANCEL_LESSON: "取消课程",
  SUPPLEMENTARY: "补课或加课",
  CHANGE_TEACHER: "更换老师",
  ASSESSMENT: "学术评估",
  PACKAGE_ACTIVATION: "课包启用",
  ACADEMIC_HANDOFF: "学术处理",
  SERVICE_HANDOFF: "客服处理",
  OPERATION_CORRECTION: "资料纠正",
};

function workflowLabel(item) {
  const raw = item.confirmationCard?.workflowLabel || item.confirmationCard?.recognizedType || item.workflowKey || "工单";
  return WORKFLOW_LABELS[item.workflowKey] || WORKFLOW_LABELS[raw] || raw;
}

function singaporeParts(value) {
  const date = new Date(new Date(value).getTime() + 8 * 60 * 60 * 1000);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), hour: date.getUTCHours(), minute: date.getUTCMinutes() };
}

function pad(value) { return String(value).padStart(2, "0"); }

function singaporeDateTimeLabel(value) {
  if (!value) return "";
  const part = singaporeParts(value);
  return `${part.year}-${pad(part.month)}-${pad(part.day)} ${pad(part.hour)}:${pad(part.minute)}`;
}

function reviewCalendars(operations, existingSessions = []) {
  const grouped = {};
  const sessionById = new Map((existingSessions || []).map((row) => [row.id, row]));
  const movedIds = new Set((operations || []).filter((row) => row.commandType === "RESCHEDULE_SESSION" || row.commandType === "CANCEL_SESSION").map((row) => row.targetId));
  const add = (row, state) => {
    const part = singaporeParts(row.startAt);
    const key = `${part.year}-${pad(part.month)}`;
    if (!grouped[key]) grouped[key] = { year: part.year, month: part.month, events: {} };
    if (!grouped[key].events[part.day]) grouped[key].events[part.day] = [];
    grouped[key].events[part.day].push({
      key: `${state}-${row.id || row.sequence || 0}-${row.startAt}`, time: `${pad(part.hour)}:${pad(part.minute)}`,
      teacher: row.teacherName || "老师待确认", course: row.courseName || row.subjectName || "课程", state,
      action: state === "removed" ? "原课程将移走" : state === "proposed" ? (ACTION_LABELS[row.commandType] || "调整后课程") : "学生其他课程",
    });
  };
  (existingSessions || []).filter((row) => row.startAt).forEach((row) => add(row, movedIds.has(row.id) ? "removed" : "existing"));
  (operations || []).filter((row) => row.startAt && row.commandType !== "CANCEL_SESSION").forEach((row) => {
    const source = sessionById.get(row.targetId);
    add({ ...row, courseName: row.courseName || source?.courseName, teacherName: row.teacherName || source?.teacherName }, "proposed");
  });
  return Object.keys(grouped).sort().map((key) => {
    const month = grouped[key];
    const firstWeekday = new Date(Date.UTC(month.year, month.month - 1, 1)).getUTCDay();
    const leading = (firstWeekday + 6) % 7;
    const count = new Date(Date.UTC(month.year, month.month, 0)).getUTCDate();
    const cells = [];
    for (let index = 0; index < leading; index += 1) cells.push({ key: `before-${index}`, blank: true, events: [] });
    for (let day = 1; day <= count; day += 1) cells.push({ key: `${key}-${day}`, day, blank: false, events: month.events[day] || [] });
    while (cells.length % 7) cells.push({ key: `after-${cells.length}`, blank: true, events: [] });
    return { key, title: `${month.year}年${month.month}月`, cells };
  });
}

function previewLines(preview, operations) {
  const items = preview?.preview?.items || [];
  const lines = [];
  items.forEach((item) => {
    [item.courseLabel, item.scheduleText, item.timeText, item.teacherName && `老师：${item.teacherName}`,
      item.fromTeacherName && item.toTeacherName && `老师：${item.fromTeacherName} → ${item.toTeacherName}`,
      item.locationText && `地点：${item.locationText}`, item.chargeLabel, item.note, item.reason].filter(Boolean).forEach((value) => {
      if (!lines.includes(value)) lines.push(value);
    });
  });
  if (!lines.length) (operations || []).forEach((item) => lines.push(ACTION_LABELS[item.commandType] || "处理正式记录"));
  return lines;
}

function sessionLabel(item) {
  if (!item) return "";
  const time = item.startAt ? singaporeDateTimeLabel(item.startAt) : "时间待确认";
  return `${time} · ${item.courseName || "课程"} · ${item.teacherName || "老师待确认"}`;
}

function present(item) {
  const action = actionFor(item);
  const blockers = item.executionPreview?.blockers || item.operation?.blockers || [];
  const facts = item.relatedFacts || {};
  return {
    ...item,
    actionKind: action.kind,
    actionLabel: action.label,
    title: item.studentName || "未关联学生",
    summary: item.displayMessage || item.confirmationCard?.recognizedMatter || item.operation?.nextAction || "AI 正在读取工单",
    next: item.operation?.nextAction || "等待系统准备",
    workflowLabel: workflowLabel(item),
    dueLabel: singaporeDateTimeLabel(item.operation?.dueAt),
    impactLines: [item.lessonImpact, item.feeImpact].filter(Boolean),
    factLines: [
      facts.coursePackage?.courseName && `课包：${facts.coursePackage.courseName}`,
      Number.isFinite(facts.coursePackage?.remainingMinutes) && `剩余：${facts.coursePackage.remainingMinutes}分钟`,
      facts.targetSession && `原课次：${sessionLabel(facts.targetSession)}`,
    ].filter(Boolean),
    blockerItems: blockers.map((row) => ({ title: row.title || row.label || "还有条件需要处理", detail: row.detail || row.message || "请查看缺失信息", action: row.action || "完成后重新预检" })),
    needsTarget: ["CANCEL_LESSON", "RESCHEDULE", "CHANGE_TEACHER"].includes(item.workflowKey) && !item.targetSession,
  };
}

Page({
  data: {
    weekdays: ['一', '二', '三', '四', '五', '六', '日'],
    items: [], selected: null, loading: false, working: false, message: "", pendingReview: null,
    targetOptions: [], targetIndex: -1, teacherOptions: [], teacherIndex: -1,
    decision: { targetSessionId: "", targetSessionLabel: "点击选择具体课次", chargeValue: "", note: "", newTeacherId: "", newTeacherName: "点击选择老师", reason: "" },
  },
  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  load(selectedId) {
    this.setData({ loading: true, message: "" });
    return api.requestStaff("/api/miniapp/staff/ai-work", { timeout: 30000 })
      .then((data) => {
        const items = (data.items || []).map(present);
        const selected = selectedId ? (items.find((item) => item.intakeId === selectedId) || null) : null;
        this.setData({ items, selected, pendingReview: null });
        this.setupDecision(selected);
      })
      .catch((error) => this.setData({ message: friendlyMessage(error.message, "读取失败") }))
      .finally(() => this.setData({ loading: false }));
  },
  select(event) {
    const selected = this.data.items.find((item) => item.intakeId === event.currentTarget.dataset.id) || null;
    this.setData({ selected, pendingReview: null, message: "" });
    this.setupDecision(selected);
    wx.pageScrollTo({ scrollTop: 0, duration: 180 });
  },
  handleBack() {
    if (!this.data.selected) return wx.navigateBack({ delta: 1 });
    this.backToQueue();
  },
  backToQueue() {
    this.setData({ selected: null, pendingReview: null, message: "" });
    wx.nextTick(() => wx.pageScrollTo({ scrollTop: this.queueScrollTop || 0, duration: 0 }));
  },
  onPageScroll(event) {
    if (!this.data.selected) this.queueScrollTop = event.scrollTop || 0;
  },
  setupDecision(item) {
    if (!item) return;
    const targetOptions = (item.targetSessionCandidates || []).map((row) => ({ ...row, label: sessionLabel(row) }));
    const targetSessionId = item.targetSession?.id || "";
    const targetIndex = targetOptions.findIndex((row) => row.id === targetSessionId);
    this.setData({
      targetOptions, targetIndex, teacherOptions: [], teacherIndex: -1,
      decision: {
        targetSessionId, targetSessionLabel: targetIndex >= 0 ? targetOptions[targetIndex].label : "点击选择具体课次",
        chargeValue: "", note: item.cancellationReason?.label || "",
        newTeacherId: "", newTeacherName: "点击选择老师", reason: item.summary || "家长申请更换老师",
      },
    });
    if (item.workflowKey === "CHANGE_TEACHER" && targetSessionId) this.loadTeachers(targetSessionId);
  },
  chooseTarget(event) {
    const targetIndex = Number(event.detail.value);
    const target = this.data.targetOptions[targetIndex];
    this.setData({ targetIndex, "decision.targetSessionId": target?.id || "", "decision.targetSessionLabel": target?.label || "点击选择具体课次", teacherOptions: [], teacherIndex: -1, "decision.newTeacherId": "", "decision.newTeacherName": "点击选择老师" });
    if (this.data.selected?.workflowKey === "CHANGE_TEACHER" && target?.id) this.loadTeachers(target.id);
  },
  loadTeachers(sessionId) {
    return api.requestStaff(`/api/miniapp/staff/schedule/${encodeURIComponent(sessionId)}/replace-teacher`, { timeout: 30000 })
      .then((data) => {
        const teacherOptions = data.teachers || [];
        this.setData({ teacherOptions, "decision.newTeacherName": teacherOptions.length ? "点击选择老师" : "暂无通过校验的老师" });
      })
      .catch((error) => this.setData({ message: friendlyMessage(error.message, "可用老师读取失败") }));
  },
  chooseTeacher(event) {
    const teacherIndex = Number(event.detail.value);
    const teacher = this.data.teacherOptions[teacherIndex];
    this.setData({ teacherIndex, "decision.newTeacherId": teacher?.id || "", "decision.newTeacherName": teacher?.name || "点击选择老师" });
  },
  chooseCharge(event) { this.setData({ "decision.chargeValue": event.detail.value }); },
  editNote(event) { this.setData({ "decision.note": event.detail.value }); },
  editReason(event) { this.setData({ "decision.reason": event.detail.value }); },
  validateDecision(item) {
    const decision = this.data.decision;
    if (item.needsTarget && !decision.targetSessionId) return "请选择本次要处理的具体课次。";
    if (item.workflowKey === "CANCEL_LESSON" && !["true", "false"].includes(decision.chargeValue)) return "请明确本次取消是否扣课时。";
    if (item.workflowKey === "CANCEL_LESSON" && !decision.note.trim()) return "请填写取消原因。";
    if (item.workflowKey === "CHANGE_TEACHER" && !decision.newTeacherId) return "请选择替换后的老师。";
    if (item.workflowKey === "CHANGE_TEACHER" && !decision.reason.trim()) return "请填写换老师原因。";
    return "";
  },
  run() {
    const item = this.data.selected;
    if (!item || this.data.working) return;
    const decisionError = this.validateDecision(item);
    if (decisionError) return this.setData({ message: decisionError });
    this.setData({ working: true, message: "" });
    const decision = this.data.decision;
    const resolveTarget = item.needsTarget
      ? api.requestStaff("/api/miniapp/staff/ai-work", { method: "POST", data: { action: "resolve_target_session", intakeId: item.intakeId, sessionId: decision.targetSessionId }, timeout: 30000 })
      : Promise.resolve();
    const prepare = resolveTarget.then(() => api.requestStaff("/api/miniapp/staff/ai-work", {
      method: "POST",
      data: {
        action: "prepare", intakeId: item.intakeId,
        ...(item.workflowKey === "CANCEL_LESSON" ? { charge: decision.chargeValue === "true", note: decision.note.trim() } : {}),
        ...(item.workflowKey === "CHANGE_TEACHER" ? { newTeacherId: decision.newTeacherId, reason: decision.reason.trim() } : {}),
      }, timeout: 60000,
    }).then((result) => result.package));
    prepare.then((prepared) => {
      if ((prepared.blockers || []).length) {
        this.setData({ message: "还有关键信息未确定，系统不会猜测执行。" });
        return this.load(item.intakeId).then(() => null);
      }
      const executionPackage = prepared.formalExecutionPackage;
      if (!executionPackage || !item.formalTicketId) throw new Error("完整执行包尚未准备好。");
      const path = `/api/miniapp/staff/ai-tickets/${encodeURIComponent(item.formalTicketId)}/execute`;
      return api.requestStaff(path, { method: "POST", data: { mode: "preview", package: executionPackage }, timeout: 60000 })
        .then((preview) => {
          const operations = prepared.operations || [];
          this.setData({
            pendingReview: {
              path, executionPackage, previewToken: preview.previewToken,
              commandCount: preview.preview.commandCount, calendars: reviewCalendars(operations, preview.preview.calendarSessions || []),
              lines: previewLines(preview, operations),
            },
            message: "完整方案已通过正式系统复核，请核对后确认一次。",
          });
          return null;
        });
    }).catch((error) => this.setData({ message: friendlyMessage(error.message, "方案准备失败") }))
      .finally(() => this.setData({ working: false }));
  },
  cancelReview() { this.setData({ pendingReview: null, message: "" }); },
  confirmExecution() {
    const review = this.data.pendingReview;
    const item = this.data.selected;
    if (!review || !item || this.data.working) return;
    this.setData({ working: true, message: "正在执行，完成前请勿重复点击。" });
    api.requestStaff(review.path, { method: "POST", data: { mode: "apply", package: review.executionPackage, previewToken: review.previewToken }, timeout: 60000 })
      .then((result) => {
        const intakeUrl = result.result && result.result.intake && result.result.intake.url;
        if (intakeUrl) {
          wx.setClipboardData({ data: intakeUrl, success: () => wx.showModal({ title: "已建立家长资料链接", content: "链接已复制，发给家长填写后再进入合同和财务核对。", showCancel: false }) });
        } else wx.showToast({ title: "处理完成", icon: "success" });
        this.setData({ pendingReview: null, message: result.message || "已完成" });
        return this.load();
      })
      .catch((error) => {
        if (error.code === "AI_TICKET_STALE" && item.formalTicketId) {
          this.setData({ pendingReview: null, message: "工单有新变化，AI正在重新读取，请核对更新后的方案。" });
          return api.requestStaff("/api/miniapp/staff/ai-work", { method: "POST", data: { action: "refresh", intakeId: item.intakeId, ticketId: item.formalTicketId }, timeout: 60000 })
            .then(() => this.load(item.intakeId));
        }
        this.setData({ message: friendlyMessage(error.message, "执行失败") });
        return null;
      })
      .finally(() => this.setData({ working: false }));
  },
});
