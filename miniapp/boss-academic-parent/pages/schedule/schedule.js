const api = require("../../utils/api");

Page({
  data: {
    studentName: "",
    sessions: []
  },

  onShow() {
    this.load();
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },

  load() {
    const studentId = api.requireStudentPage();
    if (!studentId) return Promise.resolve();
    this.setData({ studentName: getApp().globalData.currentStudentName || "当前学生" });
    return api.request(`/api/miniapp/students/${studentId}/schedule`)
      .then((data) => this.setData({ sessions: data.sessions || [] }))
      .catch((err) => api.toast(err.message));
  }
});
