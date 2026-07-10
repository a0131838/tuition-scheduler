const api = require("../../utils/api");

Page({
  data: {
    studentName: "",
    requests: []
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
    return api.request(`/api/miniapp/students/${studentId}/requests`)
      .then((data) => this.setData({ requests: data.requests || [] }))
      .catch((err) => api.toast(err.message));
  },

  goNew() {
    wx.navigateTo({ url: "/pages/request-new/request-new" });
  },

  openDetail(e) {
    wx.navigateTo({ url: "/pages/request-detail/request-detail?id=" + e.currentTarget.dataset.id });
  }
});
