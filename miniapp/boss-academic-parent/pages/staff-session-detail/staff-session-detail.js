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
  if (action !== "reschedule") target.setDate(target.getDate() + 7);
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
    feedbackReviewStatus: "",
    feedbackReviewStatusText: "",
    feedbackReviewNote: "",
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
    scheduleSeriesClass: "mode-button",
    scheduleSeriesMode: false,
    scheduleWeeks: "4",
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
    scheduleCoordinationTickets: [],
    scheduleCoordinationTicketIds: [],
    hasScheduleCoordinationTickets: false,
    scheduleConfirmText: "确认改课",
    hasSchedulePreview: false,
    scheduleChecking: false,
    scheduleSaving: false,
    cancellationStudents: [],
    cancellationStudentIndex: 0,
    cancellationStudentName: "",
    hasCancellationStudents: false,
    canShowCancellation: false,
    cancellationCharge: false,
    cancellationNote: "",
    cancellationPreview: null,
    cancellationPreviewToken: "",
    cancellationPreviewTimeText: "",
    cancellationPreviewChargeText: "",
    cancellationTickets: [],
    cancellationTicketIds: [],
    hasCancellationPreview: false,
    hasCancellationTickets: false,
    cancellationChecking: false,
    cancellationSaving: false,
    replacementTeachers: [],
    replacementTeacherIndex: 0,
    replacementTeacherName: "",
    hasReplacementTeachers: false,
    replacementReason: "",
    replacementPreview: null,
    replacementPreviewToken: "",
    replacementPreviewTimeText: "",
    replacementPreviewTeacherText: "",
    replacementTickets: [],
    replacementTicketIds: [],
    hasReplacementPreview: false,
    hasReplacementTickets: false,
    replacementChecking: false,
    replacementSaving: false,
    locationCampuses: [],
    locationCampusIndex: 0,
    locationCampusName: "",
    locationRooms: [],
    locationRoomIndex: 0,
    locationRoomName: "",
    locationRequiresRoom: false,
    hasLocationRooms: false,
    currentLocationText: "",
    locationReason: "",
    locationPreview: null,
    locationPreviewToken: "",
    locationPreviewFromText: "",
    locationPreviewToText: "",
    hasLocationPreview: false,
    locationChecking: false,
    locationSaving: false,
    canRequestReschedule: false,
    teacherRequestStudents: [],
    teacherRequestStudentIndex: 0,
    teacherRequestStudentName: "",
    teacherRequestReason: "",
    teacherRequestDate: "",
    teacherRequestTime: "",
    teacherRequestExisting: null,
    hasTeacherRequestExisting: false,
    teacherRequestSaving: false
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
        const canRequestReschedule = canTeachSession && Boolean(session && session.startAt && new Date(session.startAt).getTime() > Date.now());
        const cancellationStudents = session && session.students ? session.students : [];
        this.setData({
          session,
          sessionTeacherName: session && session.teacherName ? session.teacherName : "-",
          sessionStudentText: session && session.studentText ? session.studentText : "-",
          sessionLocationText: session && session.locationText ? session.locationText : "-",
          canTeachSession,
          canManageCoordination,
          canManageSchedule,
          canRequestReschedule,
          readOnlySession: !canTeachSession && !canManageCoordination && !canManageSchedule,
          scheduleDate: defaults.date,
          scheduleTime: defaults.time,
          scheduleDuration: defaults.duration,
          schedulePreview: null,
          schedulePreviewToken: "",
          scheduleCoordinationTickets: [],
          scheduleCoordinationTicketIds: [],
          hasScheduleCoordinationTickets: false,
          hasSchedulePreview: false,
          cancellationStudents,
          cancellationStudentIndex: 0,
          cancellationStudentName: cancellationStudents[0] ? cancellationStudents[0].name : "",
          hasCancellationStudents: cancellationStudents.length > 0,
          canShowCancellation: canManageSchedule && cancellationStudents.length > 0,
          cancellationPreview: null,
          cancellationPreviewToken: "",
          cancellationTickets: [],
          cancellationTicketIds: [],
          hasCancellationPreview: false,
          hasCancellationTickets: false
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
                  feedbackReviewStatus: feedback.reviewStatus || "",
                  feedbackReviewStatusText: feedback.reviewStatus === "PUBLISHED" ? "教务已审核并发布给家长" : feedback.reviewStatus === "RETURNED" ? "教务已退回，请按原因补充后重新提交" : feedback.submittedAt ? "已提交，等待教务审核" : "",
                  feedbackReviewNote: feedback.reviewNote || "",
                  submitDisabled: false
                });
              })
              .catch((err) => api.toast(err.message))
          );
          if (canRequestReschedule) tasks.push(this.loadTeacherRescheduleRequest(defaults));
          tasks.push(
            api.requestStaff(basePath + "/attendance")
              .then((attendanceData) => this.setData({ attendanceRows: attendanceList(attendanceData.rows) }))
              .catch((err) => api.toast(err.message))
          );
        }
        if (canManageCoordination) tasks.push(this.loadCoordination());
        if (canManageSchedule) {
          tasks.push(this.loadReplacementTeachers());
          tasks.push(this.loadLocationOptions());
        }
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
    const rawMode = e.currentTarget.dataset.mode;
    const action = rawMode === "create" || rawMode === "series" ? rawMode : "reschedule";
    const defaults = schedulingDefaults(this.data.session, action);
    this.setData({
      scheduleAction: action,
      scheduleCreateClass: action === "create" ? "mode-button active" : "mode-button",
      scheduleRescheduleClass: action === "reschedule" ? "mode-button active" : "mode-button",
      scheduleSeriesClass: action === "series" ? "mode-button active" : "mode-button",
      scheduleSeriesMode: action === "series",
      scheduleDate: defaults.date,
      scheduleTime: defaults.time,
      scheduleDuration: defaults.duration,
      scheduleConfirmText: action === "create" ? "确认排课" : action === "series" ? "确认连续排课" : "确认改课",
      schedulePreview: null,
      schedulePreviewToken: "",
      scheduleCoordinationTickets: [],
      scheduleCoordinationTicketIds: [],
      hasScheduleCoordinationTickets: false,
      hasSchedulePreview: false
    });
  },

  invalidateSchedulingPreview(values) {
    this.setData(Object.assign({}, values, {
      schedulePreview: null,
      schedulePreviewToken: "",
      scheduleCoordinationTickets: [],
      scheduleCoordinationTicketIds: [],
      hasScheduleCoordinationTickets: false,
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

  inputScheduleWeeks(e) {
    this.invalidateSchedulingPreview({ scheduleWeeks: e.detail.value });
  },

  schedulePayload(mode) {
    return {
      mode,
      action: this.data.scheduleAction,
      startAt: `${this.data.scheduleDate}T${this.data.scheduleTime}:00+08:00`,
      durationMin: Number(this.data.scheduleDuration),
      weeks: Number(this.data.scheduleWeeks),
      previewToken: this.data.schedulePreviewToken,
      completeCoordinationTicketIds: mode === "apply" ? this.data.scheduleCoordinationTicketIds : []
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
    if (this.data.scheduleSeriesMode) {
      const weeks = Number(this.data.scheduleWeeks);
      if (!Number.isInteger(weeks) || weeks < 2 || weeks > 12) {
        api.toast("连续排课需为 2-12 周");
        return;
      }
    }
    const path = "/api/miniapp/staff/schedule/" + encodeURIComponent(this.data.sessionId) + (this.data.scheduleSeriesMode ? "/series" : "/manage");
    this.setData({ scheduleChecking: true });
    api.requestStaff(path, { method: "POST", data: this.schedulePayload("preview"), timeout: 30000 })
      .then((data) => {
        const preview = data.preview || {};
        const coordinationTickets = (preview.coordinationTickets || []).map((ticket) => {
          const status = coordinationStatuses.find((item) => item.value === ticket.status);
          return Object.assign({}, ticket, {
            label: ticket.ticketNo + " · " + ticket.studentName,
            statusText: status ? status.label : ticket.status
          });
        });
        this.setData({
          schedulePreview: preview,
          schedulePreviewToken: data.previewToken || "",
          schedulePreviewBeforeText: preview.beforeText || (this.data.scheduleSeriesMode ? "连续新增 " + (preview.weeks || 0) + " 周" : "-"),
          schedulePreviewAfterText: preview.afterText || (preview.firstText && preview.lastText ? preview.firstText + " 至 " + preview.lastText : "-"),
          schedulePreviewCourseText: preview.courseLabel || "-",
          schedulePreviewPeopleText: (preview.teacherName || "-") + " · " + (preview.studentText || "-"),
          schedulePreviewLocationText: preview.locationText || "-",
          scheduleCoordinationTickets: coordinationTickets,
          scheduleCoordinationTicketIds: [],
          hasScheduleCoordinationTickets: coordinationTickets.length > 0,
          hasSchedulePreview: Boolean(data.previewToken)
        });
      })
      .catch((err) => this.showSchedulingError(err))
      .finally(() => this.setData({ scheduleChecking: false }));
  },

  changeScheduleCoordinationTickets(e) {
    this.setData({ scheduleCoordinationTicketIds: e.detail.value || [] });
  },

  applyScheduling() {
    if (!this.data.schedulePreviewToken || this.data.scheduleSaving) return;
    const actionText = this.data.scheduleAction === "create" ? "新增课程" : this.data.scheduleSeriesMode ? "连续排课" : "修改课程时间";
    const completionCount = this.data.scheduleCoordinationTicketIds.length;
    wx.showModal({
      title: "确认" + actionText,
      content: this.data.schedulePreviewAfterText + (completionCount ? "\n同时完成 " + completionCount + " 个排课协调工单" : ""),
      confirmText: "确认执行",
      success: (result) => {
        if (!result.confirm) return;
        const path = "/api/miniapp/staff/schedule/" + encodeURIComponent(this.data.sessionId) + (this.data.scheduleSeriesMode ? "/series" : "/manage");
        this.setData({ scheduleSaving: true });
        api.requestStaff(path, { method: "POST", data: this.schedulePayload("apply"), timeout: 30000 })
          .then(() => {
            wx.showToast({ title: this.data.scheduleSeriesMode ? "已连续排课" : this.data.scheduleAction === "create" ? "已排课" : "已改课", icon: "success" });
            return this.load();
          })
          .catch((err) => this.showSchedulingError(err))
          .finally(() => this.setData({ scheduleSaving: false }));
      }
    });
  },

  invalidateCancellationPreview(values) {
    this.setData(Object.assign({}, values, {
      cancellationPreview: null,
      cancellationPreviewToken: "",
      cancellationTickets: [],
      cancellationTicketIds: [],
      hasCancellationPreview: false,
      hasCancellationTickets: false
    }));
  },

  changeCancellationStudent(e) {
    const index = Number(e.detail.value || 0);
    const student = this.data.cancellationStudents[index];
    this.invalidateCancellationPreview({
      cancellationStudentIndex: index,
      cancellationStudentName: student ? student.name : ""
    });
  },

  changeCancellationCharge(e) {
    this.invalidateCancellationPreview({ cancellationCharge: Boolean(e.detail.value) });
  },

  inputCancellationNote(e) {
    this.invalidateCancellationPreview({ cancellationNote: e.detail.value });
  },

  changeCancellationTickets(e) {
    this.setData({ cancellationTicketIds: e.detail.value || [] });
  },

  cancellationPayload(mode) {
    const student = this.data.cancellationStudents[this.data.cancellationStudentIndex];
    return {
      mode,
      studentId: student ? student.id : "",
      charge: this.data.cancellationCharge,
      note: String(this.data.cancellationNote || "").trim(),
      previewToken: this.data.cancellationPreviewToken,
      completeTicketIds: mode === "apply" ? this.data.cancellationTicketIds : []
    };
  },

  previewCancellation() {
    const payload = this.cancellationPayload("preview");
    if (!payload.studentId) {
      api.toast("请选择学生");
      return;
    }
    if (!payload.note) {
      api.toast("请填写请假/取消原因");
      return;
    }
    const path = "/api/miniapp/staff/schedule/" + encodeURIComponent(this.data.sessionId) + "/cancel";
    this.setData({ cancellationChecking: true });
    api.requestStaff(path, { method: "POST", data: payload, timeout: 30000 })
      .then((data) => {
        const preview = data.preview || {};
        const tickets = (preview.tickets || []).map((ticket) => Object.assign({}, ticket, {
          label: ticket.ticketNo + " · 请假/取消"
        }));
        this.setData({
          cancellationPreview: preview,
          cancellationPreviewToken: data.previewToken || "",
          cancellationPreviewTimeText: preview.timeText || "-",
          cancellationPreviewChargeText: preview.chargeLabel || "-",
          cancellationTickets: tickets,
          cancellationTicketIds: [],
          hasCancellationPreview: Boolean(data.previewToken),
          hasCancellationTickets: tickets.length > 0
        });
      })
      .catch((err) => this.showSchedulingError(err))
      .finally(() => this.setData({ cancellationChecking: false }));
  },

  applyCancellation() {
    if (!this.data.cancellationPreviewToken || this.data.cancellationSaving) return;
    const ticketCount = this.data.cancellationTicketIds.length;
    wx.showModal({
      title: "确认请假/取消",
      content: this.data.cancellationPreviewTimeText + "\n" + this.data.cancellationPreviewChargeText + (ticketCount ? "\n同时完成 " + ticketCount + " 个请假工单" : ""),
      confirmText: "确认处理",
      confirmColor: "#b42318",
      success: (result) => {
        if (!result.confirm) return;
        const path = "/api/miniapp/staff/schedule/" + encodeURIComponent(this.data.sessionId) + "/cancel";
        this.setData({ cancellationSaving: true });
        api.requestStaff(path, { method: "POST", data: this.cancellationPayload("apply"), timeout: 30000 })
          .then((data) => {
            wx.showToast({ title: data.message || "已处理", icon: "success" });
            return this.load();
          })
          .catch((err) => this.showSchedulingError(err))
          .finally(() => this.setData({ cancellationSaving: false }));
      }
    });
  },

  loadReplacementTeachers() {
    const path = "/api/miniapp/staff/schedule/" + encodeURIComponent(this.data.sessionId) + "/replace-teacher";
    return api.requestStaff(path, { timeout: 20000 })
      .then((data) => {
        const teachers = data.teachers || [];
        this.setData({
          replacementTeachers: teachers,
          replacementTeacherIndex: 0,
          replacementTeacherName: teachers[0] ? teachers[0].name : "",
          hasReplacementTeachers: teachers.length > 0,
          replacementPreview: null,
          replacementPreviewToken: "",
          replacementTickets: [],
          replacementTicketIds: [],
          hasReplacementPreview: false,
          hasReplacementTickets: false
        });
      })
      .catch(() => this.setData({ replacementTeachers: [], hasReplacementTeachers: false }));
  },

  invalidateReplacementPreview(values) {
    this.setData(Object.assign({}, values, {
      replacementPreview: null,
      replacementPreviewToken: "",
      replacementTickets: [],
      replacementTicketIds: [],
      hasReplacementPreview: false,
      hasReplacementTickets: false
    }));
  },

  changeReplacementTeacher(e) {
    const index = Number(e.detail.value || 0);
    const teacher = this.data.replacementTeachers[index];
    this.invalidateReplacementPreview({
      replacementTeacherIndex: index,
      replacementTeacherName: teacher ? teacher.name : ""
    });
  },

  inputReplacementReason(e) {
    this.invalidateReplacementPreview({ replacementReason: e.detail.value });
  },

  changeReplacementTickets(e) {
    this.setData({ replacementTicketIds: e.detail.value || [] });
  },

  replacementPayload(mode) {
    const teacher = this.data.replacementTeachers[this.data.replacementTeacherIndex];
    return {
      mode,
      newTeacherId: teacher ? teacher.id : "",
      reason: String(this.data.replacementReason || "").trim(),
      previewToken: this.data.replacementPreviewToken,
      completeTicketIds: mode === "apply" ? this.data.replacementTicketIds : []
    };
  },

  previewReplacement() {
    const payload = this.replacementPayload("preview");
    if (!payload.newTeacherId) {
      api.toast("请选择老师");
      return;
    }
    if (!payload.reason) {
      api.toast("请填写换老师原因");
      return;
    }
    const path = "/api/miniapp/staff/schedule/" + encodeURIComponent(this.data.sessionId) + "/replace-teacher";
    this.setData({ replacementChecking: true });
    api.requestStaff(path, { method: "POST", data: payload, timeout: 30000 })
      .then((data) => {
        const preview = data.preview || {};
        const tickets = (preview.tickets || []).map((ticket) => Object.assign({}, ticket, {
          label: ticket.ticketNo + " · " + ticket.studentName
        }));
        this.setData({
          replacementPreview: preview,
          replacementPreviewToken: data.previewToken || "",
          replacementPreviewTimeText: preview.timeText || "-",
          replacementPreviewTeacherText: (preview.fromTeacherName || "-") + " → " + (preview.toTeacherName || "-"),
          replacementTickets: tickets,
          replacementTicketIds: [],
          hasReplacementPreview: Boolean(data.previewToken),
          hasReplacementTickets: tickets.length > 0
        });
      })
      .catch((err) => this.showSchedulingError(err))
      .finally(() => this.setData({ replacementChecking: false }));
  },

  applyReplacement() {
    if (!this.data.replacementPreviewToken || this.data.replacementSaving) return;
    const ticketCount = this.data.replacementTicketIds.length;
    wx.showModal({
      title: "确认更换老师",
      content: this.data.replacementPreviewTimeText + "\n" + this.data.replacementPreviewTeacherText + (ticketCount ? "\n同时完成 " + ticketCount + " 个换老师工单" : ""),
      confirmText: "确认更换",
      success: (result) => {
        if (!result.confirm) return;
        const path = "/api/miniapp/staff/schedule/" + encodeURIComponent(this.data.sessionId) + "/replace-teacher";
        this.setData({ replacementSaving: true });
        api.requestStaff(path, { method: "POST", data: this.replacementPayload("apply"), timeout: 30000 })
          .then((data) => {
            wx.showToast({ title: data.message || "已更换", icon: "success" });
            return this.load();
          })
          .catch((err) => this.showSchedulingError(err))
          .finally(() => this.setData({ replacementSaving: false }));
      }
    });
  },

  loadLocationOptions() {
    const path = "/api/miniapp/staff/schedule/" + encodeURIComponent(this.data.sessionId) + "/change-location";
    return api.requestStaff(path)
      .then((data) => {
        const campuses = data.campuses || [];
        let index = campuses.findIndex((item) => item.id === data.currentCampusId);
        if (index < 0) index = 0;
        this.setData({
          locationCampuses: campuses,
          currentLocationText: data.currentLocationText || this.data.sessionLocationText,
          locationReason: "",
          locationPreview: null,
          locationPreviewToken: "",
          hasLocationPreview: false
        });
        this.applyLocationCampus(index, data.currentRoomId || "");
      })
      .catch((err) => api.toast(err.message));
  },

  applyLocationCampus(index, preferredRoomId) {
    const campus = this.data.locationCampuses[index] || null;
    const rooms = campus && campus.requiresRoom ? (campus.rooms || []) : [{ id: "", name: "无需教室" }];
    let roomIndex = rooms.findIndex((item) => item.id === preferredRoomId);
    if (roomIndex < 0) roomIndex = 0;
    const room = rooms[roomIndex] || null;
    this.invalidateLocationPreview({
      locationCampusIndex: index,
      locationCampusName: campus ? campus.name : "",
      locationRooms: rooms,
      locationRoomIndex: roomIndex,
      locationRoomName: room ? room.name : "",
      locationRequiresRoom: Boolean(campus && campus.requiresRoom),
      hasLocationRooms: rooms.length > 0
    });
  },

  invalidateLocationPreview(values) {
    this.setData(Object.assign({}, values || {}, {
      locationPreview: null,
      locationPreviewToken: "",
      hasLocationPreview: false
    }));
  },

  changeLocationCampus(e) {
    this.applyLocationCampus(Number(e.detail.value || 0), "");
  },

  changeLocationRoom(e) {
    const index = Number(e.detail.value || 0);
    const room = this.data.locationRooms[index];
    this.invalidateLocationPreview({ locationRoomIndex: index, locationRoomName: room ? room.name : "" });
  },

  inputLocationReason(e) {
    this.invalidateLocationPreview({ locationReason: e.detail.value });
  },

  locationPayload(mode) {
    const campus = this.data.locationCampuses[this.data.locationCampusIndex];
    const room = this.data.locationRooms[this.data.locationRoomIndex];
    return {
      mode,
      campusId: campus ? campus.id : "",
      roomId: room ? room.id : "",
      reason: String(this.data.locationReason || "").trim(),
      previewToken: this.data.locationPreviewToken
    };
  },

  previewLocationChange() {
    const payload = this.locationPayload("preview");
    if (!payload.campusId) return api.toast("请选择校区");
    if (this.data.locationRequiresRoom && !payload.roomId) return api.toast("请选择教室");
    if (!payload.reason) return api.toast("请填写换地点原因");
    const path = "/api/miniapp/staff/schedule/" + encodeURIComponent(this.data.sessionId) + "/change-location";
    this.setData({ locationChecking: true });
    api.requestStaff(path, { method: "POST", data: payload, timeout: 30000 })
      .then((data) => {
        const preview = data.preview || {};
        this.setData({
          locationPreview: preview,
          locationPreviewToken: data.previewToken || "",
          locationPreviewFromText: preview.fromLocationText || "-",
          locationPreviewToText: preview.toLocationText || "-",
          hasLocationPreview: Boolean(data.previewToken)
        });
      })
      .catch((err) => this.showSchedulingError(err))
      .finally(() => this.setData({ locationChecking: false }));
  },

  applyLocationChange() {
    if (!this.data.locationPreviewToken || this.data.locationSaving) return;
    wx.showModal({
      title: "确认更换本节课地点",
      content: this.data.locationPreviewFromText + "\n改为：" + this.data.locationPreviewToText + "\n其他课次不受影响。",
      confirmText: "确认更换",
      success: (result) => {
        if (!result.confirm) return;
        const path = "/api/miniapp/staff/schedule/" + encodeURIComponent(this.data.sessionId) + "/change-location";
        this.setData({ locationSaving: true });
        api.requestStaff(path, { method: "POST", data: this.locationPayload("apply"), timeout: 30000 })
          .then((data) => {
            wx.showToast({ title: data.message || "已更新", icon: "success" });
            return this.load();
          })
          .catch((err) => this.showSchedulingError(err))
          .finally(() => this.setData({ locationSaving: false }));
      }
    });
  },

  loadTeacherRescheduleRequest(defaults) {
    const path = "/api/miniapp/staff/schedule/" + encodeURIComponent(this.data.sessionId) + "/reschedule-request";
    return api.requestStaff(path)
      .then((data) => {
        const students = data.students || [];
        this.setData({
          teacherRequestStudents: students,
          teacherRequestStudentIndex: 0,
          teacherRequestStudentName: students[0] ? students[0].name : "",
          teacherRequestDate: this.data.teacherRequestDate || defaults.date,
          teacherRequestTime: this.data.teacherRequestTime || defaults.time,
          teacherRequestExisting: data.existing || null,
          hasTeacherRequestExisting: Boolean(data.existing)
        });
      })
      .catch((err) => api.toast(err.message));
  },

  changeTeacherRequestStudent(e) {
    const index = Number(e.detail.value || 0);
    const student = this.data.teacherRequestStudents[index];
    this.setData({ teacherRequestStudentIndex: index, teacherRequestStudentName: student ? student.name : "" });
  },

  inputTeacherRequestReason(e) {
    this.setData({ teacherRequestReason: e.detail.value });
  },

  changeTeacherRequestDate(e) {
    this.setData({ teacherRequestDate: e.detail.value });
  },

  changeTeacherRequestTime(e) {
    this.setData({ teacherRequestTime: e.detail.value });
  },

  submitTeacherRescheduleRequest() {
    if (this.data.teacherRequestSaving) return;
    const student = this.data.teacherRequestStudents[this.data.teacherRequestStudentIndex];
    const reason = String(this.data.teacherRequestReason || "").trim();
    if (!student) return api.toast("请选择学生");
    if (!reason) return api.toast("请填写调课原因");
    const path = "/api/miniapp/staff/schedule/" + encodeURIComponent(this.data.sessionId) + "/reschedule-request";
    wx.showModal({
      title: "提交调课申请",
      content: "申请会进入 Jasmine/Eva 的排课与调课看板，不会直接修改课程。",
      confirmText: "确认提交",
      success: (result) => {
        if (!result.confirm) return;
        this.setData({ teacherRequestSaving: true });
        api.requestStaff(path, {
          method: "POST",
          data: {
            studentId: student.id,
            reason,
            preferredDate: this.data.teacherRequestDate,
            preferredTime: this.data.teacherRequestTime
          }
        })
          .then((data) => {
            wx.showToast({ title: "已提交", icon: "success" });
            this.setData({ teacherRequestReason: "" });
            return this.loadTeacherRescheduleRequest({ date: this.data.teacherRequestDate, time: this.data.teacherRequestTime });
          })
          .catch((err) => api.toast(err.message))
          .finally(() => this.setData({ teacherRequestSaving: false }));
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
        wx.showModal({ title: "反馈已提交", content: "反馈已进入教务审核。Emily 或 Eva 审核发布后，家长才会在小程序中看到。", showCancel: false });
        this.load();
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ saving: false, submitDisabled: false }));
  }
});
