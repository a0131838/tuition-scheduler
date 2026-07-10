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
    sessionId: "",
    session: null,
    sessionTeacherName: "-",
    attendanceRows: [],
    attendanceSaving: false,
    focusStudentName: "",
    parentFeedbackSections: sectionList({}),
    homework: "",
    previousHomeworkDone: "",
    previousHomeworkDoneChecked: false,
    submitDisabled: false,
    loading: false,
    saving: false
  },

  onLoad(query) {
    this.setData({ sessionId: query.id || "" });
    this.load();
  },

  load() {
    if (!this.data.sessionId) return Promise.resolve();
    this.setData({ loading: true });
    const feedbackTask = api.requestStaff("/api/miniapp/staff/schedule/" + encodeURIComponent(this.data.sessionId) + "/feedback")
      .then((data) => {
        const feedback = data.feedback || {};
        this.setData({
          session: data.session || null,
          sessionTeacherName: data.session && data.session.teacherName ? data.session.teacherName : "-",
          focusStudentName: feedback.focusStudentName || "",
          parentFeedbackSections: sectionList(feedback.parentFeedbackSections),
          homework: feedback.homework || "",
          previousHomeworkDone: feedback.previousHomeworkDone || "",
          previousHomeworkDoneChecked: feedback.previousHomeworkDone === "yes",
          submitDisabled: false
        });
      })
      .catch((err) => api.toast(err.message));

    const attendanceTask = api.requestStaff("/api/miniapp/staff/schedule/" + encodeURIComponent(this.data.sessionId) + "/attendance")
      .then((data) => this.setData({ attendanceRows: attendanceList(data.rows) }))
      .catch((err) => api.toast(err.message));

    return Promise.allSettled([feedbackTask, attendanceTask])
      .finally(() => this.setData({ loading: false }));
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
