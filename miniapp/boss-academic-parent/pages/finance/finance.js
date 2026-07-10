const api = require("../../utils/api");

Page({
  data: {
    studentName: "",
    note: "",
    summary: {},
    packages: []
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
    return api.request(`/api/miniapp/students/${studentId}/finance`)
      .then((data) => {
        this.setData({
          note: data.note || "",
          summary: data.summary || {},
          packages: data.packages || []
        });
      })
      .catch((err) => api.toast(err.message));
  },

  openInvoice(e) {
    api.downloadPdf(e.currentTarget.dataset.url).catch((err) => api.toast(err.message));
  },

  openReceipt(e) {
    api.downloadPdf(e.currentTarget.dataset.url).catch((err) => api.toast(err.message));
  },

  contactFinance() {
    wx.navigateTo({
      url: "/pages/request-new/request-new?type=" + encodeURIComponent("财务问题")
    });
  }
});
