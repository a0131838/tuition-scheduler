const api = require("../../utils/api");

const sections = [
  { key: "lessonFocus", label: "本节课重点", hint: "孩子今天主要解决了什么学习问题？" },
  { key: "currentFinding", label: "目前发现", hint: "你观察到的真实学习卡点是什么？" },
  { key: "classPerformance", label: "课堂表现", hint: "课堂上有什么可观察的进步、投入度、正确率或困难？" },
  { key: "nextPlan", label: "下一步计划", hint: "接下来会训练什么，最好写清时间范围或重点方向。" },
  { key: "parentNote", label: "家长需要知道", hint: "家长应该如何理解孩子目前的状态，避免误判？" }
];

const attendanceStatusOptions = [
  { value: "UNMARKED", label: "未点名" },
  { value: "PRESENT", label: "出勤" },
  { value: "ABSENT", label: "缺席" },
  { value: "LATE", label: "迟到" },
  { value: "EXCUSED", label: "请假" }
];

const coordinationTargets = ["家长", "老师", "家长和老师", "内部协调"];
const coordinationStatuses = [
  { value: "Waiting Parent", label: "等待家长", nextAction: "等待家长回复可上课时间或确认候选时段。" },
  { value: "Waiting Teacher", label: "等待老师", nextAction: "等待老师回复可排时间或确认特殊时间。" },
  { value: "Confirmed", label: "双方已确认", nextAction: "进入后台完成正式排课并复核课程安排。" },
  { value: "Exception", label: "异常升级", nextAction: "由 Jasmine 跟进排课异常并确认下一步方案。" }
];

function followUpDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function schedulingDefaults(session, action) {
  const original = session && session.startAt ? new Date(session.startAt) : new Date();
  const duration = session && session.startAt && session.endAt
    ? Math.max(15, Math.round((new Date(session.endAt).getTime() - original.getTime()) / 60000))
    : 60;
  const target = new Date(original);
  if (action === "create") target.setDate(target.getDate() + 7);
  while (target.getTime() <= Date.now()) target.setDate(target.getDate() + 1);
  return {
    date: `${target.getFullYear()}-${pad2(target.getMonth() + 1)}-${pad2(target.getDate())}`,
    time: `${pad2(target.getHours())}:${pad2(target.getMinutes())}`,
    duration: String(duration)
  };
}

function sectionList(values) {
  const source = values || {};
  return sections.map((item) => Object.assign({}, item, { value: source[item.key] || "" }));
}

function attendanceList(rows) {
  return (rows || []).map((row) => {
    const statusIndex = Math.max(0, attendanceStatusOptions.findIndex((item) => item.value === row.status));
    return Object.assign({}, row, {
      statusIndex,
      statusLabel: attendanceStatusOptions[statusIndex].label,
      note: row.note || ""
    });
  });
}

Page({
  data: {
    attendanceStatusOptions,
    coordinationTargets,
    coordinationStatuses,
    sessionId: "",
    session: null,
    sessionTeacherName: "-",
    sessionStudentText: "-",
    sessionLocationText: "-",
    canTeachSession: false,
    canManageCoordination: false,
    canManageSchedule: false,
    readOnlySession: false,
    attendanceRows: [],
    attendanceSaving: false,
    focusStudentName: "",
    parentFeedbackSections: sectionList({}),
    homework: "",
    previousHomeworkDone: "",
    previousHomeworkDoneChecked: false,
    submitDisabled: false,
    loading: false,
    saving: false,
    coordinationStudents: [],
    coordinationStudentIndex: 0,
    coordinationStudentName: "",
    coordinationTargetIndex: 0,
    coordinationStatusIndex: 0,
    coordinationResult: "",
    coordinationNextAction: coordinationStatuses[0].nextAction,
    coordinationDueDate: followUpDate(),
    coordinationTicket: null,
    coordinationTicketNoText: "尚未创建协调工单",
    coordinationStatusText: "",
    coordinationHistoryText: "",
    availabilityUrl: "",
    hasCoordinationTicket: false,
    hasCoordinationHistory: false,
    hasAvailabilityUrl: false,
    coordinationSaving: false,
    scheduleAction: "reschedule",
    scheduleCreateClass: "mode-button",
    scheduleRescheduleClass: "mode-button active",
    scheduleDate: "",
    scheduleTime: "",
    scheduleDuration: "60",
    schedulePreview: null,
    schedulePreviewToken: "",
    schedulePreviewBeforeText: "",
    schedulePreviewAfterText: "",
    schedulePreviewCourseText: "",
    schedulePreviewPeopleText: "",
    schedulePreviewLocationText: "",
    scheduleConfirmText: "确认改课",
    hasSchedulePreview: false,
    scheduleChecking: false,
    scheduleSaving: false
  },

  onLoad(query) {
    this.setData({ sessionId: query.id || "" });
    this.load();
  },

  load() {
    if (!this.data.sessionId) return Promise.resolve();
    this.setData({ loading: true });
    const basePath = "/api/miniapp/staff/schedule/" + encodeURIComponent(this.data.sessionId);
    return api.requestStaff(basePath)
      .then((data) => {
        const session = data.session || null;
        const capabilities = data.capabilities || {};
        const canTeachSession = Boolean(capabilities.canTeachSession);
        const canManageCoordination = Boolean(capabilities.canManageCoordination);
        const canManageSchedule = Boolean(capabilities.canManageSchedule);
        const defaults = schedulingDefaults(session, this.data.scheduleAction);
        this.setData({
          session,
          sessionTeacherName: session && session.teacherName ? session.teacherName : "-",
          sessionStudentText: session && session.studentText ? session.studentText : "-",
          sessionLocationText: session && session.locationText ? session.locationText : "-",
          canTeachSession,
          canManageCoordination,
          canManageSchedule,
          readOnlySession: !canTeachSession && !canManageCoordination && !canManageSchedule,
          scheduleDate: defaults.date,
          scheduleTime: defaults.time,
          scheduleDuration: defaults.duration,
          schedulePreview: null,
          schedulePreviewToken: "",
          hasSchedulePreview: false
        });

        const tasks = [];
        if (canTeachSession) {
          tasks.push(
            api.requestStaff(basePath + "/feedback")
              .then((feedbackData) => {
                const feedback = feedbackData.feedback || {};
                this.setData({
                  focusStudentName: feedback.focusStudentName || "",
                  parentFeedbackSections: sectionList(feedback.parentFeedbackSections),
                  homework: feedback.homework || "",
                  previousHomeworkDone: feedback.previousHomeworkDone || "",
                  previousHomeworkDoneChecked: feedback.previousHomeworkDone === "yes",
                  submitDisabled: false
                });
              })
              .catch((err) => api.toast(err.message))
          );
          tasks.push(
            api.requestStaff(basePath + "/attendance")
              .then((attendanceData) => this.setData({ attendanceRows: attendanceList(attendanceData.rows) }))
              .catch((err) => api.toast(err.message))
          );
        }
        if (canManageCoordination) tasks.push(this.loadCoordination());
        return Promise.allSettled(tasks);
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  loadCoordination() {
    const path = "/api/miniapp/staff/schedule/" + encodeURIComponent(this.data.sessionId) + "/coordination";
    return api.requestStaff(path)
      .then((data) => {
        const students = data.students || [];
        const currentId = this.data.coordinationStudents[this.data.coordinationStudentIndex]
          ? this.data.coordinationStudents[this.data.coordinationStudentIndex].id
          : "";
        let index = students.findIndex((row) => row.id === currentId);
        if (index < 0) index = 0;
        this.setData({ coordinationStudents: students, coordinationStudentIndex: index });
        this.applyCoordinationStudent(index);
      })
      .catch((err) => api.toast(err.message));
  },

  applyCoordinationStudent(index) {
    const student = this.data.coordinationStudents[index] || null;
    const ticket = student ? student.coordination : null;
    let statusIndex = ticket ? coordinationStatuses.findIndex((row) => row.value === ticket.status) : 0;
    if (statusIndex < 0) statusIndex = 0;
    const history = ticket && ticket.communicationHistory ? ticket.communicationHistory : "";
    const availabilityUrl = ticket && ticket.availabilityUrl ? ticket.availabilityUrl : "";
    this.setData({
      coordinationStudentName: student ? student.name : "",
      coordinationTicket: ticket,
      coordinationTicketNoText: ticket ? ticket.ticketNo : "尚未创建协调工单",
      coordinationStatusText: ticket ? ticket.statusLabel : "",
      coordinationStatusIndex: statusIndex,
      coordinationNextAction: ticket && ticket.nextAction ? ticket.nextAction : coordinationStatuses[statusIndex].nextAction,
      coordinationDueDate: ticket && ticket.nextActionDueDate ? ticket.nextActionDueDate : followUpDate(),
      coordinationHistoryText: history,
      availabilityUrl,
      hasCoordinationTicket: Boolean(ticket),
      hasCoordinationHistory: Boolean(history),
      hasAvailabilityUrl: Boolean(availabilityUrl),
      coordinationResult: ""
    });
  },

  changeCoordinationStudent(e) {
    const index = Number(e.detail.value || 0);
    this.setData({ coordinationStudentIndex: index });
    this.applyCoordinationStudent(index);
  },

  changeCoordinationTarget(e) {
    this.setData({ coordinationTargetIndex: Number(e.detail.value || 0) });
  },

  changeCoordinationStatus(e) {
    const index = Number(e.detail.value || 0);
    this.setData({
      coordinationStatusIndex: index,
      coordinationNextAction: coordinationStatuses[index].nextAction
    });
  },

  inputCoordinationResult(e) {
    this.setData({ coordinationResult: e.detail.value });
  },

  inputCoordinationNextAction(e) {
    this.setData({ coordinationNextAction: e.detail.value });
  },

  changeCoordinationDueDate(e) {
    this.setData({ coordinationDueDate: e.detail.value });
  },

  saveCoordination() {
    const student = this.data.coordinationStudents[this.data.coordinationStudentIndex];
    if (!student) {
      api.toast("当前课程没有可协调学生");
      return;
    }
    const result = String(this.data.coordinationResult || "").trim();
    if (!result) {
      api.toast("请填写本次沟通结果");
      return;
    }
    const nextAction = String(this.data.coordinationNextAction || "").trim();
    if (!nextAction) {
      api.toast("请填写下一步动作");
      return;
    }

    const path = "/api/miniapp/staff/schedule/" + encodeURIComponent(this.data.sessionId) + "/coordination";
    this.setData({ coordinationSaving: true });
    api.requestStaff(path, {
      method: "POST",
      data: {
        studentId: student.id,
        communicationTarget: coordinationTargets[this.data.coordinationTargetIndex],
        communicationResult: result,
        status: coordinationStatuses[this.data.coordinationStatusIndex].value,
        nextAction,
        nextActionDue: this.data.coordinationDueDate
      }
    })
      .then((data) => {
        wx.showToast({ title: data.message || "已保存", icon: "success" });
        return this.loadCoordination();
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ coordinationSaving: false }));
  },

  copyAvailabilityLink() {
    if (!this.data.availabilityUrl) return;
    wx.setClipboardData({ data: this.data.availabilityUrl });
  },

  setSchedulingMode(e) {
    const action = e.currentTarget.dataset.mode === "create" ? "create" : "reschedule";
    const defaults = schedulingDefaults(this.data.session, action);
    this.setData({
      scheduleAction: action,
      scheduleCreateClass: action === "create" ? "mode-button active" : "mode-button",
      scheduleRescheduleClass: action === "reschedule" ? "mode-button active" : "mode-button",
      scheduleDate: defaults.date,
      scheduleTime: defaults.time,
      scheduleDuration: defaults.duration,
      scheduleConfirmText: action === "create" ? "确认排课" : "确认改课",
      schedulePreview: null,
      schedulePreviewToken: "",
      hasSchedulePreview: false
    });
  },

  invalidateSchedulingPreview(values) {
    this.setData(Object.assign({}, values, {
      schedulePreview: null,
      schedulePreviewToken: "",
      hasSchedulePreview: false
    }));
  },

  changeScheduleDate(e) {
    this.invalidateSchedulingPreview({ scheduleDate: e.detail.value });
  },

  changeScheduleTime(e) {
    this.invalidateSchedulingPreview({ scheduleTime: e.detail.value });
  },

  inputScheduleDuration(e) {
    this.invalidateSchedulingPreview({ scheduleDuration: e.detail.value });
  },

  schedulePayload(mode) {
    return {
      mode,
      action: this.data.scheduleAction,
      startAt: `${this.data.scheduleDate}T${this.data.scheduleTime}:00+08:00`,
      durationMin: Number(this.data.scheduleDuration),
      previewToken: this.data.schedulePreviewToken
    };
  },

  showSchedulingError(err) {
    wx.showModal({
      title: "无法执行",
      content: String(err && err.message ? err.message : "排课检查失败"),
      showCancel: false
    });
  },

  previewScheduling() {
    if (!this.data.scheduleDate || !this.data.scheduleTime) {
      api.toast("请选择日期和时间");
      return;
    }
    const duration = Number(this.data.scheduleDuration);
    if (!Number.isFinite(duration) || duration < 15 || duration > 360) {
      api.toast("时长需为 15-360 分钟");
      return;
    }
    const path = "/api/miniapp/staff/schedule/" + encodeURIComponent(this.data.sessionId) + "/manage";
    this.setData({ scheduleChecking: true });
    api.requestStaff(path, { method: "POST", data: this.schedulePayload("preview"), timeout: 30000 })
      .then((data) => {
        const preview = data.preview || {};
        this.setData({
          schedulePreview: preview,
          schedulePreviewToken: data.previewToken || "",
          schedulePreviewBeforeText: preview.beforeText || "-",
          schedulePreviewAfterText: preview.afterText || "-",
          schedulePreviewCourseText: preview.courseLabel || "-",
          schedulePreviewPeopleText: (preview.teacherName || "-") + " · " + (preview.studentText || "-"),
          schedulePreviewLocationText: preview.locationText || "-",
          hasSchedulePreview: Boolean(data.previewToken)
        });
      })
      .catch((err) => this.showSchedulingError(err))
      .finally(() => this.setData({ scheduleChecking: false }));
  },

  applyScheduling() {
    if (!this.data.schedulePreviewToken || this.data.scheduleSaving) return;
    const actionText = this.data.scheduleAction === "create" ? "新增课程" : "修改课程时间";
    wx.showModal({
      title: "确认" + actionText,
      content: this.data.schedulePreviewAfterText,
      confirmText: "确认执行",
      success: (result) => {
        if (!result.confirm) return;
        const path = "/api/miniapp/staff/schedule/" + encodeURIComponent(this.data.sessionId) + "/manage";
        this.setData({ scheduleSaving: true });
        api.requestStaff(path, { method: "POST", data: this.schedulePayload("apply"), timeout: 30000 })
          .then(() => {
            wx.showToast({ title: this.data.scheduleAction === "create" ? "已排课" : "已改课", icon: "success" });
            return this.load();
          })
          .catch((err) => this.showSchedulingError(err))
          .finally(() => this.setData({ scheduleSaving: false }));
      }
    });
  },

  changeAttendanceStatus(e) {
    const index = Number(e.currentTarget.dataset.index || 0);
    const statusIndex = Number(e.detail.value || 0);
    const rows = this.data.attendanceRows.slice();
    rows[index] = Object.assign({}, rows[index], {
      statusIndex,
      status: attendanceStatusOptions[statusIndex].value,
      statusLabel: attendanceStatusOptions[statusIndex].label
    });
    this.setData({ attendanceRows: rows });
  },

  inputAttendanceNote(e) {
    const index = Number(e.currentTarget.dataset.index || 0);
    const rows = this.data.attendanceRows.slice();
    rows[index] = Object.assign({}, rows[index], { note: e.detail.value });
    this.setData({ attendanceRows: rows });
  },

  saveAttendance() {
    if (this.data.attendanceSaving) return;
    this.setData({ attendanceSaving: true });
    api.requestStaff("/api/miniapp/staff/schedule/" + encodeURIComponent(this.data.sessionId) + "/attendance", {
      method: "POST",
      data: {
        items: this.data.attendanceRows.map((row) => ({
          studentId: row.studentId,
          status: row.status,
          note: row.note
        }))
      }
    })
      .then((data) => {
        this.setData({ attendanceRows: attendanceList(data.rows) });
        wx.showToast({ title: "点名已保存", icon: "success" });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ attendanceSaving: false }));
  },

  inputFocusStudent(e) {
    this.setData({ focusStudentName: e.detail.value });
  },

  inputSection(e) {
    const index = Number(e.currentTarget.dataset.index || 0);
    const list = this.data.parentFeedbackSections.slice();
    list[index].value = e.detail.value;
    this.setData({ parentFeedbackSections: list });
  },

  inputHomework(e) {
    this.setData({ homework: e.detail.value });
  },

  changePreviousHomework(e) {
    this.setData({
      previousHomeworkDone: e.detail.value ? "yes" : "no",
      previousHomeworkDoneChecked: Boolean(e.detail.value)
    });
  },

  submit() {
    if (this.data.saving) return;
    const parentFeedbackSections = {};
    let missing = "";
    this.data.parentFeedbackSections.forEach((item) => {
      parentFeedbackSections[item.key] = item.value || "";
      if (!String(item.value || "").trim() && !missing) missing = item.label;
    });
    if (missing) {
      api.toast("请填写：" + missing);
      return;
    }
    if (!String(this.data.homework || "").trim()) {
      api.toast("请填写课后作业");
      return;
    }

    this.setData({ saving: true, submitDisabled: true });
    api.requestStaff("/api/miniapp/staff/schedule/" + encodeURIComponent(this.data.sessionId) + "/feedback", {
      method: "POST",
      data: {
        focusStudentName: this.data.focusStudentName,
        parentFeedbackSections,
        homework: this.data.homework,
        previousHomeworkDone: this.data.previousHomeworkDone
      }
    })
      .then(() => {
        wx.showToast({ title: "已提交", icon: "success" });
        this.load();
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ saving: false, submitDisabled: false }));
  }
});
