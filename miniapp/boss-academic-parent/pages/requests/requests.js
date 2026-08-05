const api = require("../../utils/api");

function updatedText(value) {
  const date = new Date(value); if (Number.isNaN(date.getTime())) return "-";
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return `${shifted.getUTCMonth() + 1}月${shifted.getUTCDate()}日 ${String(shifted.getUTCHours()).padStart(2, "0")}:${String(shifted.getUTCMinutes()).padStart(2, "0")}`;
}

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
      .then((data) => this.setData({ requests: (data.requests || []).map((item) => Object.assign({}, item, { updatedAtText: updatedText(item.updatedAt) })) }))
      .catch((err) => api.toast(err.message));
  },

  goNew() {
    wx.navigateTo({ url: "/pages/request-new/request-new" });
  },

  openDetail(e) {
    wx.navigateTo({ url: "/pages/request-detail/request-detail?id=" + e.currentTarget.dataset.id });
  }
});
