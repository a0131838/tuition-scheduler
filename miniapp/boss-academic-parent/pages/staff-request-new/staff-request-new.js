const api = require("../../utils/api");

const typeOptions = [
  { value: "改课程时间", label: "改一节课时间", actionType: "RESCHEDULE_SESSION" },
  { value: "临时取消&请假课程", label: "取消 / 请假一节课", actionType: "CANCEL_SESSION" },
  { value: "补课加课", label: "新增课程 / 补课", actionType: "CREATE_SESSION" },
  { value: "改上课老师", label: "更换上课老师", actionType: "REPLACE_TEACHER" },
  { value: "排课协调", label: "时间未确定，需要协调", actionType: "COORDINATE_ONLY" },
  { value: "普通反馈", label: "普通反馈" },
  { value: "给老师的话", label: "给老师的话" },
  { value: "投诉", label: "投诉" },
  { value: "财务问题", label: "财务问题" },
  { value: "学校事务", label: "学校事务" },
  { value: "其他", label: "其他" }
];
const actionOptions = typeOptions.slice(0, 5);
const communicationSources = ["微信群", "电话", "线下", "老师转达", "内部发现", "家长小程序", "其他"];
const priorities = ["普通", "1小时紧急", "6小时紧急", "24小时紧急"];
const owners = ["自动分配", "Jasmine", "Eva", "Emily"];
const leaveParties = ["学生/家长", "老师", "学校安排变动", "其他"];

let searchTimer = null;
let studentSearchSeq = 0;
const REQUEST_DRAFT_KEY = "staff_request_new_draft_v2";

function localDate(value) {
  const date = value || new Date();
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

function localTime(value) {
  const date = value || new Date();
  return String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
}

function manualCancellationReady(action) {
  return action && action.actionType === "CANCEL_SESSION" && action.manualSource && action.manualDate && action.manualTime && String(action.manualCourse || "").trim();
}

function composedActionNotes(action) {
  const rows = [];
  if (action.actionType === "CANCEL_SESSION") {
    rows.push("请假方：" + leaveParties[action.leavePartyIndex || 0]);
    rows.push("通知时间：" + action.noticeDate + " " + action.noticeTime);
    if (action.manualSource) {
      rows.push("手动目标课程：" + action.manualDate + " " + action.manualTime + " · " + String(action.manualCourse || "").trim() + (String(action.manualTeacher || "").trim() ? " · " + String(action.manualTeacher).trim() : ""));
    }
  }
  if (String(action.notes || "").trim()) rows.push(String(action.notes).trim());
  return rows.join("\n") || null;
}

Page({
  data: {
    typeOptions,
    communicationSources,
    priorities,
    owners,
    leaveParties,
    typeIndex: 0,
    communicationSourceIndex: 0,
    priorityIndex: 0,
    ownerIndex: 0,
    studentQuery: "",
    studentResults: [],
    selectedStudentId: "",
    selectedStudentLabel: "",
    upcomingSessions: [],
    sourceDate: localDate(),
    sourceWindow: { minDate: "", maxDate: "" },
    schedulingActions: [],
    scheduleOptionsLoading: false,
    sourceDetail: "",
    originalContent: "",
    publicSummary: "",
    requiredAction: "",
    latestDeadlineText: "",
    files: [],
    advancedOpen: false,
    searching: false,
    loading: false,
    draftRestored: false,
    submitted: false,
    createdRequestId: "",
    createdTicketNo: ""
  },

  onLoad(options) {
    const studentId = (options && options.studentId) || "";
    const studentLabel = decodeURIComponent((options && options.studentLabel) || "");
    const draft = wx.getStorageSync(REQUEST_DRAFT_KEY);
    this.setData({
      schedulingActions: [this.newSchedulingAction(typeOptions[0].actionType)],
      selectedStudentId: studentId,
      selectedStudentLabel: studentLabel,
      studentQuery: studentLabel
    });
    if (!studentId && draft && typeof draft === "object" && draft.savedAt) {
      const restoredActions = Array.isArray(draft.schedulingActions)
        ? draft.schedulingActions.map((action) => Object.assign(this.newSchedulingAction(action.actionType), action))
        : [this.newSchedulingAction(typeOptions[0].actionType)];
      this.setData(Object.assign({}, draft, { schedulingActions: restoredActions, sourceDate: draft.sourceDate || localDate(), files: [], loading: false, searching: false, draftRestored: true }));
    }
    const activeStudentId = studentId || (draft && draft.selectedStudentId) || "";
    if (activeStudentId) this.loadSchedulingOptions(activeStudentId, this.data.sourceDate);
  },

  onHide() { this.saveDraft(); },

  onUnload() {
    if (!this.data.loading && !this.data.submitted) this.saveDraft();
    if (searchTimer) clearTimeout(searchTimer);
    studentSearchSeq += 1;
  },

  saveDraft() {
    if (!this.data.originalContent && !this.data.publicSummary && !this.data.selectedStudentId) return;
    wx.setStorageSync(REQUEST_DRAFT_KEY, {
      typeIndex: this.data.typeIndex, communicationSourceIndex: this.data.communicationSourceIndex,
      priorityIndex: this.data.priorityIndex, ownerIndex: this.data.ownerIndex,
      studentQuery: this.data.studentQuery, selectedStudentId: this.data.selectedStudentId,
      selectedStudentLabel: this.data.selectedStudentLabel, schedulingActions: this.data.schedulingActions,
      sourceDate: this.data.sourceDate,
      sourceDetail: this.data.sourceDetail, originalContent: this.data.originalContent,
      publicSummary: this.data.publicSummary, requiredAction: this.data.requiredAction,
      latestDeadlineText: this.data.latestDeadlineText, advancedOpen: this.data.advancedOpen,
      createdRequestId: this.data.createdRequestId, createdTicketNo: this.data.createdTicketNo,
      savedAt: new Date().toISOString()
    });
  },

  onTypeChange(e) {
    const typeIndex = Number(e.detail.value || 0);
    const selected = typeOptions[typeIndex] || typeOptions[0];
    this.setData({
      typeIndex,
      schedulingActions: selected.actionType ? [this.newSchedulingAction(selected.actionType)] : []
    });
  },

  newSchedulingAction(actionType) {
    const option = actionOptions.find((item) => item.actionType === actionType) || actionOptions[0];
    const now = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return {
      actionType: option.actionType,
      actionLabel: option.label,
      needsSource: ["RESCHEDULE_SESSION", "CANCEL_SESSION", "REPLACE_TEACHER"].includes(option.actionType),
      sourceIndex: -1,
      sourceSessionId: "",
      sourceSessionLabel: "请选择原来的课程",
      requestedDate: now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0"),
      requestedTime: "",
      notes: "",
      replacementRequired: false,
      manualSource: false,
      manualDate: localDate(),
      manualTime: "",
      manualCourse: "",
      manualTeacher: "",
      leavePartyIndex: 0,
      noticeDate: localDate(),
      noticeTime: localTime()
    };
  },

  onSourceChange(e) {
    this.setData({ communicationSourceIndex: Number(e.detail.value || 0) });
  },

  onPriorityChange(e) {
    this.setData({ priorityIndex: Number(e.detail.value || 0) });
  },

  onOwnerChange(e) {
    this.setData({ ownerIndex: Number(e.detail.value || 0) });
  },

  onStudentInput(e) {
    const value = e.detail.value || "";
    this.setData({
      studentQuery: value,
      selectedStudentId: "",
      selectedStudentLabel: ""
    });
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => this.searchStudents(), 450);
  },

  searchStudents(event) {
    if (searchTimer) clearTimeout(searchTimer);
    const seq = ++studentSearchSeq;
    const query = this.data.studentQuery.trim();
    if (query.length < 2) {
      this.setData({ studentResults: [], searching: false });
      if (event) api.toast("请输入至少两个字");
      return;
    }
    this.setData({ searching: true });
    api.requestStaff("/api/miniapp/staff/students?q=" + encodeURIComponent(query), { timeout: 12000 })
      .then((data) => {
        if (seq !== studentSearchSeq) return;
        this.setData({ studentResults: data.students || [] });
      })
      .catch((err) => {
        if (seq === studentSearchSeq) api.toast(err.message);
      })
      .finally(() => {
        if (seq === studentSearchSeq) this.setData({ searching: false });
      });
  },

  clearStudentSearch() {
    if (searchTimer) clearTimeout(searchTimer);
    studentSearchSeq += 1;
    this.setData({
      studentQuery: "",
      studentResults: [],
      selectedStudentId: "",
      selectedStudentLabel: "",
      upcomingSessions: [],
      searching: false
    });
  },

  selectStudent(e) {
    const id = e.currentTarget.dataset.id;
    const label = e.currentTarget.dataset.label;
    studentSearchSeq += 1;
    if (searchTimer) clearTimeout(searchTimer);
    const schedulingActions = this.data.schedulingActions.map((action) => Object.assign({}, action, {
      sourceIndex: -1,
      sourceSessionId: "",
      sourceSessionLabel: "请选择原来的课程"
    }));
    this.setData({
      selectedStudentId: id,
      selectedStudentLabel: label,
      studentQuery: label,
      studentResults: [],
      searching: false,
      schedulingActions
    });
    this.loadSchedulingOptions(id, this.data.sourceDate);
  },

  loadSchedulingOptions(studentId, sourceDate) {
    if (!studentId) return;
    this.setData({ scheduleOptionsLoading: true, upcomingSessions: [] });
    api.requestStaff("/api/miniapp/staff/students/" + encodeURIComponent(studentId) + "/scheduling?sourceDate=" + encodeURIComponent(sourceDate || this.data.sourceDate), { timeout: 15000 })
      .then((data) => {
        if (this.data.selectedStudentId !== studentId) return;
        this.setData({
          upcomingSessions: (data.options && data.options.sourceSessions) || [],
          sourceWindow: (data.options && data.options.sourceSessionWindow) || { minDate: "", maxDate: "" }
        });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => {
        if (this.data.selectedStudentId === studentId) this.setData({ scheduleOptionsLoading: false });
      });
  },

  changeSourceDate(e) {
    const sourceDate = e.detail.value;
    const schedulingActions = this.data.schedulingActions.map((action) => Object.assign({}, action, {
      sourceIndex: -1,
      sourceSessionId: "",
      sourceSessionLabel: "请选择原来的课程"
    }));
    this.setData({ sourceDate, schedulingActions });
    this.loadSchedulingOptions(this.data.selectedStudentId, sourceDate);
  },

  addSchedulingAction() {
    wx.showActionSheet({
      itemList: actionOptions.map((item) => item.label),
      success: (res) => {
        const option = actionOptions[res.tapIndex];
        if (!option) return;
        this.setData({ schedulingActions: this.data.schedulingActions.concat(this.newSchedulingAction(option.actionType)) });
      }
    });
  },

  removeSchedulingAction(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (!Number.isFinite(index)) return;
    const actions = this.data.schedulingActions.filter((_, itemIndex) => itemIndex !== index);
    this.setData({ schedulingActions: actions });
  },

  changeActionSource(e) {
    const index = Number(e.currentTarget.dataset.index);
    const sourceIndex = Number(e.detail.value);
    const session = this.data.upcomingSessions[sourceIndex];
    const actions = this.data.schedulingActions.slice();
    if (!actions[index] || !session) return;
    actions[index] = Object.assign({}, actions[index], {
      sourceIndex,
      sourceSessionId: session.id,
      sourceSessionLabel: session.startText + " · " + session.courseLabel + " · " + session.teacherName + " · " + session.statusLabel,
      manualSource: false,
      manualCourse: session.courseLabel || "",
      manualTeacher: session.teacherName || ""
    });
    let publicSummary = this.data.publicSummary;
    if (!publicSummary.trim() && actions[index].actionType === "CANCEL_SESSION") {
      publicSummary = "已收到关于 " + session.startText + " 课程的请假/取消申请，教务正在核实处理。";
    }
    this.setData({ schedulingActions: actions, publicSummary });
  },

  toggleManualSource(e) {
    const index = Number(e.currentTarget.dataset.index);
    const actions = this.data.schedulingActions.slice();
    if (!actions[index]) return;
    const enabled = Boolean(e.detail.value);
    actions[index] = Object.assign({}, actions[index], {
      manualSource: enabled,
      sourceIndex: enabled ? -1 : actions[index].sourceIndex,
      sourceSessionId: enabled ? "" : actions[index].sourceSessionId,
      sourceSessionLabel: enabled ? "手动记录，待教务匹配" : actions[index].sourceSessionLabel
    });
    this.setData({ schedulingActions: actions });
  },

  updateActionField(e, field, value) {
    const index = Number(e.currentTarget.dataset.index);
    const actions = this.data.schedulingActions.slice();
    if (!actions[index]) return;
    actions[index] = Object.assign({}, actions[index], { [field]: value });
    this.setData({ schedulingActions: actions });
  },

  changeManualDate(e) { this.updateActionField(e, "manualDate", e.detail.value); },
  changeManualTime(e) { this.updateActionField(e, "manualTime", e.detail.value); },
  inputManualCourse(e) { this.updateActionField(e, "manualCourse", e.detail.value); },
  inputManualTeacher(e) { this.updateActionField(e, "manualTeacher", e.detail.value); },
  changeLeaveParty(e) { this.updateActionField(e, "leavePartyIndex", Number(e.detail.value || 0)); },
  changeNoticeDate(e) { this.updateActionField(e, "noticeDate", e.detail.value); },
  changeNoticeTime(e) { this.updateActionField(e, "noticeTime", e.detail.value); },

  changeActionDate(e) {
    const index = Number(e.currentTarget.dataset.index);
    const actions = this.data.schedulingActions.slice();
    if (!actions[index]) return;
    actions[index] = Object.assign({}, actions[index], { requestedDate: e.detail.value });
    this.setData({ schedulingActions: actions });
  },

  changeActionTime(e) {
    const index = Number(e.currentTarget.dataset.index);
    const actions = this.data.schedulingActions.slice();
    if (!actions[index]) return;
    actions[index] = Object.assign({}, actions[index], { requestedTime: e.detail.value });
    this.setData({ schedulingActions: actions });
  },

  inputActionNotes(e) {
    const index = Number(e.currentTarget.dataset.index);
    const actions = this.data.schedulingActions.slice();
    if (!actions[index]) return;
    actions[index] = Object.assign({}, actions[index], { notes: e.detail.value });
    this.setData({ schedulingActions: actions });
  },

  changeReplacementRequired(e) {
    const index = Number(e.currentTarget.dataset.index);
    const actions = this.data.schedulingActions.slice();
    if (!actions[index]) return;
    actions[index] = Object.assign({}, actions[index], { replacementRequired: Boolean(e.detail.value) });
    this.setData({ schedulingActions: actions });
  },

  onSourceDetailInput(e) {
    this.setData({ sourceDetail: e.detail.value });
  },

  onOriginalInput(e) {
    this.setData({ originalContent: e.detail.value });
  },

  onPublicInput(e) {
    this.setData({ publicSummary: e.detail.value });
  },

  onActionInput(e) {
    this.setData({ requiredAction: e.detail.value });
  },

  onDeadlineInput(e) {
    this.setData({ latestDeadlineText: e.detail.value });
  },

  toggleAdvanced() {
    this.setData({ advancedOpen: !this.data.advancedOpen });
  },

  appendFiles(nextFiles) {
    const merged = this.data.files.slice();
    (nextFiles || []).forEach((file) => {
      if (!file.path || merged.some((item) => item.path === file.path)) return;
      if (merged.length < 9) merged.push(file);
    });
    this.setData({ files: merged });
  },

  choosePhotos() {
    const remaining = 9 - this.data.files.length;
    if (remaining <= 0) return api.toast("最多上传 9 个附件");
    wx.chooseMedia({
      count: remaining,
      mediaType: ["image"],
      sourceType: ["album"],
      success: (res) => {
        const photos = (res.tempFiles || []).map((file, index) => ({
          path: file.tempFilePath,
          name: `相册截图 ${this.data.files.length + index + 1}`,
          size: file.size || 0,
          isImage: true
        }));
        this.appendFiles(photos);
      },
      fail: () => {}
    });
  },

  chooseFiles() {
    const remaining = 9 - this.data.files.length;
    if (remaining <= 0) return api.toast("最多上传 9 个附件");
    wx.chooseMessageFile({
      count: remaining,
      type: "all",
      success: (res) => {
        const files = (res.tempFiles || []).map((file) => ({
          path: file.path,
          name: file.name || "微信文件",
          size: file.size || 0,
          isImage: /\.(jpe?g|png|webp|gif)$/i.test(file.name || "")
        }));
        this.appendFiles(files);
      },
      fail: () => {}
    });
  },

  previewFile(e) {
    const index = Number(e.currentTarget.dataset.index || 0);
    const file = this.data.files[index];
    if (!file || !file.isImage) return;
    const urls = this.data.files.filter((item) => item.isImage).map((item) => item.path);
    wx.previewImage({ current: file.path, urls });
  },

  removeFile(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (!Number.isFinite(index)) return;
    this.setData({ files: this.data.files.filter((_, itemIndex) => itemIndex !== index) });
  },

  submit() {
    if (!this.data.selectedStudentId) {
      api.toast("请先搜索并选择学生");
      return;
    }
    if (!this.data.originalContent.trim()) {
      api.toast("请填写微信群原话摘要");
      return;
    }
    if (!this.data.publicSummary.trim()) {
      api.toast("请填写对家长可见摘要");
      return;
    }
    const missingSource = this.data.schedulingActions.find((action) => action.needsSource && !action.sourceSessionId && !manualCancellationReady(action));
    if (missingSource) {
      api.toast("请为“" + missingSource.actionLabel + "”选择原课程");
      return;
    }

    wx.showModal({
      title: "确认创建工单",
      content: `${this.data.selectedStudentLabel}\n${typeOptions[this.data.typeIndex].label} · ${this.data.schedulingActions.length || 0} 个排课动作\n负责人：${owners[this.data.ownerIndex]}`,
      confirmText: "确认创建",
      success: (res) => {
        if (res.confirm) this.createRequest();
      }
    });
  },

  createRequest() {
    this.setData({ loading: true });
    const existing = this.data.createdRequestId
      ? Promise.resolve({ request: { id: this.data.createdRequestId, ticketNo: this.data.createdTicketNo } })
      : api.requestStaff("/api/miniapp/staff/parent-requests", {
      method: "POST",
      data: {
        studentId: this.data.selectedStudentId,
        type: typeOptions[this.data.typeIndex].value,
        communicationSource: communicationSources[this.data.communicationSourceIndex],
        sourceDetail: this.data.sourceDetail.trim(),
        originalContent: this.data.originalContent.trim(),
        publicSummary: this.data.publicSummary.trim(),
        requiredAction: this.data.requiredAction.trim(),
        latestDeadlineText: this.data.latestDeadlineText.trim(),
        priority: priorities[this.data.priorityIndex],
        owner: this.data.ownerIndex > 0 ? owners[this.data.ownerIndex] : "",
        schedulingActions: this.data.schedulingActions.map((action) => ({
          actionType: action.actionType,
          sourceSessionId: action.sourceSessionId || null,
          requestedStartAt: action.manualSource && action.actionType === "CANCEL_SESSION"
            ? action.manualDate + "T" + action.manualTime + ":00+08:00"
            : action.requestedTime
              ? action.requestedDate + "T" + action.requestedTime + ":00+08:00"
              : null,
          courseLabel: action.manualSource ? String(action.manualCourse || "").trim() || null : null,
          replacementRequired: action.replacementRequired,
          notes: composedActionNotes(action)
        }))
      },
      timeout: 20000
    });
    existing
      .then((data) => {
        const req = data.request;
        if (req && req.id) this.setData({ createdRequestId: req.id, createdTicketNo: req.ticketNo || this.data.createdTicketNo });
        const paths = this.data.files.map((file) => file.path).filter(Boolean);
        if (!req || !req.id || paths.length === 0) return data;
        return api.uploadFiles(`/api/miniapp/staff/parent-requests/${req.id}/attachments`, paths, { staff: true }).then(() => data);
      })
      .then((data) => {
        wx.removeStorageSync(REQUEST_DRAFT_KEY);
        this.setData({ draftRestored: false, submitted: true });
        wx.showToast({ title: "已创建", icon: "success" });
        setTimeout(() => {
          const id = data.request && data.request.id;
          wx.redirectTo({ url: id ? `/pages/staff-request-detail/staff-request-detail?id=${id}` : "/pages/staff-requests/staff-requests" });
        }, 500);
      })
      .catch((err) => {
        this.saveDraft();
        const prefix = this.data.createdTicketNo ? `${this.data.createdTicketNo} 已创建，附件未传完；可直接重试。` : "";
        api.toast(prefix || err.message);
      })
      .finally(() => this.setData({ loading: false }));
  }
});
