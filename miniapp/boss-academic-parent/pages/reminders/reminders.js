const api = require("../../utils/api");

const NOTES = {
  course: "上课前提醒及课程安排变化",
  service: "服务请求状态和待处理事项",
  documents: "发票、收据和付款文件更新",
  learning: "老师发布新的课后反馈"
};

Page({
  data: { studentName: "", groups: [], courseReminder: null, loadingKey: "" },
  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  load() {
    const studentId = api.requireStudentPage();
    if (!studentId) return Promise.resolve();
    this.setData({ studentName: getApp().globalData.currentStudentName || "当前学生" });
    return api.request(`/api/miniapp/subscriptions/intent?studentId=${encodeURIComponent(studentId)}`).then((data) => {
      const groups = (data.groups || []).filter((item) => item.configured).map((item) => Object.assign({}, item, { note: NOTES[item.key] || "对应服务状态更新" }));
      this.setData({ groups, courseReminder: data.courseReminder || null });
    }).catch((err) => api.toast(err.message));
  },
  requestSubscription(e) {
    const key = e.currentTarget.dataset.key;
    const group = this.data.groups.find((item) => item.key === key);
    if (!group || !group.templateIds || !group.templateIds.length || this.data.loadingKey) return;
    this.setData({ loadingKey: key });
    wx.requestSubscribeMessage({
      tmplIds: group.templateIds.slice(0, 3),
      success: (result) => api.request("/api/miniapp/subscriptions/intent", { method: "POST", data: { groupKey: key, studentId: api.currentStudentId(), result } })
        .then((data) => { api.toast(data.message || "提醒设置已记录"); return this.load(); })
        .catch((err) => api.toast(err.message))
        .finally(() => this.setData({ loadingKey: "" })),
      fail: (err) => { api.toast(err.errMsg || "未能打开提醒授权"); this.setData({ loadingKey: "" }); }
    });
  }
});
