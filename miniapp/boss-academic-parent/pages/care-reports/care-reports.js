const api = require("../../utils/api");

const TYPE_LABELS = {
  MONTHLY: "月度报告",
  MILESTONE: "阶段报告",
  INCIDENT: "重大事项报告",
  TERM: "学期报告"
};

Page({
  data: { loading: true, items: [], error: "" },

  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },

  load() {
    const studentId = api.requireStudentPage();
    if (!studentId) return Promise.resolve();
    this.setData({ loading: true, error: "" });
    return api.request(`/api/miniapp/students/${studentId}/care-reports`)
      .then((data) => this.setData({
        items: (data.items || []).map((item) => Object.assign({}, item, { typeLabel: TYPE_LABELS[item.reportType] || "进展报告" }))
      }))
      .catch((err) => this.setData({ error: err.message || "报告加载失败" }))
      .finally(() => this.setData({ loading: false }));
  },

  openReport(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/care-report-detail/care-report-detail?id=${id}` });
  }
});
