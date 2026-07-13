const api = require("../../utils/api");

Page({
  data: { upcoming: [], upcomingCount: 0, loading: false },

  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },

  load() {
    this.setData({ loading: true });
    return api.requestStaff("/api/miniapp/staff/teacher/dashboard", { timeout: 12000 })
      .then((data) => this.setData({ upcoming: data.upcoming || [], upcomingCount: data.upcomingCount || 0 }))
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  openSession(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: "/pages/staff-session-detail/staff-session-detail?id=" + encodeURIComponent(id) });
  }
});
