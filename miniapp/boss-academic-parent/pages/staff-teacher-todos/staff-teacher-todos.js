const api = require("../../utils/api");

Page({
  data: { total: 0, summary: {}, items: [], sessionTodos: [], loading: false },
  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  load() {
    this.setData({ loading: true });
    return api.requestStaff("/api/miniapp/staff/teacher/todos", { timeout: 30000 })
      .then((data) => this.setData({ total: data.total || 0, summary: data.summary || {}, items: data.items || [], sessionTodos: data.sessionTodos || [] }))
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },
  openItem(e) {
    const target = e.currentTarget.dataset.target;
    if (target === "payroll") return wx.navigateTo({ url: "/pages/staff-teacher-payroll/staff-teacher-payroll" });
    if (target === "student-feedbacks") return wx.navigateTo({ url: "/pages/staff-teacher-feedbacks/staff-teacher-feedbacks" });
    if (target === "expenses") return wx.navigateTo({ url: "/pages/staff-teacher-expenses/staff-teacher-expenses" });
    if (target === "history") return wx.navigateTo({ url: "/pages/staff-teacher-history/staff-teacher-history" });
    return wx.navigateTo({ url: "/pages/staff-schedule/staff-schedule" });
  },
  openSession(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: "/pages/staff-session-detail/staff-session-detail?id=" + encodeURIComponent(id) });
  }
});
