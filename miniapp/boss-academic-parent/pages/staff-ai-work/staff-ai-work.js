const api = require("../../utils/api");

function actionFor(item) {
  return { kind: "prepare", label: "预检并确认执行" };
}

function sessionLabel(item) {
  if (!item) return "";
  const time = item.startAt ? String(item.startAt).replace("T", " ").slice(0, 16) : "时间待确认";
  return `${time} · ${item.courseName || "课程"} · ${item.teacherName || "老师待确认"}`;
}

function present(item) {
  const action = actionFor(item);
  return {
    ...item,
    actionKind: action.kind,
    actionLabel: action.label,
    title: item.studentName || "未关联学生",
    summary: item.confirmationCard?.recognizedMatter || item.operation?.nextAction || "AI 正在读取工单",
    next: item.operation?.nextAction || "等待系统准备",
    blockerText: (item.executionPreview?.blockers || item.operation?.blockers || []).map((row) => row.label || row.message || row.code).join("；"),
    needsTarget: ["CANCEL_LESSON", "RESCHEDULE", "CHANGE_TEACHER"].includes(item.workflowKey) && !item.targetSession,
  };
}

Page({
  data: {
    items: [], selected: null, loading: false, working: false, message: "",
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
        const selected = items.find((item) => item.intakeId === selectedId) || items[0] || null;
        this.setData({ items, selected });
        this.setupDecision(selected);
      })
      .catch((error) => this.setData({ message: error.message || "读取失败" }))
      .finally(() => this.setData({ loading: false }));
  },
  select(event) {
    const selected = this.data.items.find((item) => item.intakeId === event.currentTarget.dataset.id) || null;
    this.setData({ selected });
    this.setupDecision(selected);
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
      .catch((error) => this.setData({ message: error.message || "可用老师读取失败" }));
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
        .then((preview) => new Promise((resolve, reject) => wx.showModal({
          title: "最后确认", content: `系统已复核 ${preview.preview.commandCount} 项正式操作。确认后将更新正式记录和家长进度。`,
          confirmText: "确认执行", success: (result) => result.confirm ? resolve({ path, executionPackage, previewToken: preview.previewToken }) : reject(new Error("已取消")),
        })));
    }).then((prepared) => prepared ? api.requestStaff(prepared.path, { method: "POST", data: { mode: "apply", package: prepared.executionPackage, previewToken: prepared.previewToken }, timeout: 60000 }) : null)
      .then((result) => {
        if (!result) return null;
        const intakeUrl = result.result && result.result.intake && result.result.intake.url;
        if (intakeUrl) {
          wx.setClipboardData({
            data: intakeUrl,
            success: () => wx.showModal({ title: "已建立家长资料链接", content: "链接已复制，发给家长填写后再进入合同和财务核对。", showCancel: false }),
          });
        } else wx.showToast({ title: "处理完成", icon: "success" });
        this.setData({ message: result.message || "已完成" });
        return this.load();
      })
      .catch((error) => { if (error.message !== "已取消") this.setData({ message: error.message }); })
      .finally(() => this.setData({ working: false }));
  },
});
