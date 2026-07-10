const api = require("../../utils/api");

Page({
  data: {
    studentName: "",
    feedbacks: []
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
    return api.request(`/api/miniapp/students/${studentId}/feedbacks`)
      .then((data) => this.setData({ feedbacks: data.items || [] }))
      .catch((err) => api.toast(err.message));
  }
});
