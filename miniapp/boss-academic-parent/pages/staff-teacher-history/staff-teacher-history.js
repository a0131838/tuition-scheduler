const api = require("../../utils/api");

function monthText() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

Page({
  data: { month: monthText(), summary: { sessions: 0, durationText: "0分钟", feedbackCompleted: 0, feedbackPending: 0 }, sessions: [], loading: false },
  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  changeMonth(e) { this.setData({ month: e.detail.value }); this.load(); },
  load() {
    this.setData({ loading: true });
    return api.requestStaff("/api/miniapp/staff/teacher/history?month=" + encodeURIComponent(this.data.month), { timeout: 12000 })
      .then((data) => this.setData({ month: data.month || this.data.month, summary: data.summary || this.data.summary, sessions: data.sessions || [] }))
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },
  openSession(e) { const id = e.currentTarget.dataset.id; if (id) wx.navigateTo({ url: "/pages/staff-session-detail/staff-session-detail?id=" + encodeURIComponent(id) }); }
});
