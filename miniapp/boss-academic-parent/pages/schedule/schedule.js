const api = require("../../utils/api");

function groupSessions(sessions, filter) {
  const selected = (sessions || []).filter((item) => filter === "history" ? ["done", "muted"].includes(item.statusTone) : !["done", "muted"].includes(item.statusTone));
  const groups = [];
  selected.forEach((session) => {
    let group = groups.find((item) => item.dateLabel === session.dateLabel);
    if (!group) { group = { dateLabel: session.dateLabel, sessions: [] }; groups.push(group); }
    group.sessions.push(session);
  });
  return filter === "history" ? groups.reverse().map((group) => Object.assign({}, group, { sessions: group.sessions.slice().reverse() })) : groups;
}

Page({
  data: { studentName: "", sessions: [], visibleGroups: [], nextSession: null, filter: "upcoming", courseReminder: null, courseGroup: null, subscriptionLoading: false },
  onLoad(query) { const studentId = String(query.studentId || ""); if (studentId) getApp().setCurrentStudent({ id: studentId, name: getApp().globalData.currentStudentName || "当前学生" }); },
  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  load() {
    const studentId = api.requireStudentPage(); if (!studentId) return Promise.resolve();
    this.setData({ studentName: getApp().globalData.currentStudentName || "当前学生" });
    return Promise.all([api.request(`/api/miniapp/students/${studentId}/schedule`), api.request(`/api/miniapp/subscriptions/intent?studentId=${encodeURIComponent(studentId)}`)])
      .then(([schedule, reminder]) => {
        const courseReminder = reminder.courseReminder || null; const statusBySession = {};
        ((courseReminder && courseReminder.selectedStudentSessions) || []).forEach((item) => { statusBySession[item.sessionId] = item; });
        const sessions = (schedule.sessions || []).map((item) => Object.assign({}, item, { reminderStatusLabel: statusBySession[item.id] ? statusBySession[item.id].reminderStatusLabel : "" }));
        this.setData({ sessions, visibleGroups: groupSessions(sessions, this.data.filter), nextSession: sessions.find((item) => !["done", "muted"].includes(item.statusTone)) || null, courseReminder, courseGroup: (reminder.groups || []).find((item) => item.key === "course" && item.configured) || null });
      }).catch((err) => api.toast(err.message));
  },
  changeFilter(e) { const filter = e.currentTarget.dataset.filter || "upcoming"; this.setData({ filter, visibleGroups: groupSessions(this.data.sessions, filter) }); },
  requestCourseReminder() {
    const group = this.data.courseGroup; if (!group || !group.templateIds || !group.templateIds.length || this.data.subscriptionLoading) return;
    this.setData({ subscriptionLoading: true });
    wx.requestSubscribeMessage({ tmplIds: group.templateIds.slice(0, 3), success: (result) => api.request("/api/miniapp/subscriptions/intent", { method: "POST", data: { groupKey: "course", studentId: api.currentStudentId(), result } }).then((data) => { api.toast(data.message || "提醒设置已记录"); return this.load(); }).catch((err) => api.toast(err.message)).finally(() => this.setData({ subscriptionLoading: false })), fail: (err) => { api.toast(err.errMsg || "未能打开提醒授权"); this.setData({ subscriptionLoading: false }); } });
  }
});
