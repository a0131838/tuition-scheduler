const api = require("../../utils/api");

Page({
  data: {
    student: {},
    nextSession: null,
    latestFeedback: null,
    financeSummary: {},
    requestSummary: {}
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
    return api.request(`/api/miniapp/students/${studentId}/home`)
      .then((data) => {
        this.setData({
          student: data.student || {},
          nextSession: data.nextSession || null,
          latestFeedback: data.latestFeedback || null,
          financeSummary: data.financeSummary || {},
          requestSummary: data.requestSummary || {}
        });
      })
      .catch((err) => api.toast(err.message));
  },

  goFeedbacks() {
    wx.navigateTo({ url: "/pages/feedbacks/feedbacks" });
  },

  goNewRequest() {
    wx.navigateTo({ url: "/pages/request-new/request-new" });
  },

  goStudents() {
    wx.switchTab({ url: "/pages/students/students" });
  }
});
