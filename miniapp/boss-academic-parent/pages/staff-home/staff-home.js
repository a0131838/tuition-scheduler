const api = require("../../utils/api");

Page({
  data: {
    staffName: "",
    role: "",
    pendingCount: 0,
    todaySessionCount: 0,
    loading: false
  },

  onShow() {
    this.load();
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },

  load() {
    this.setData({ loading: true });
    return Promise.all([
      api.requestStaff("/api/miniapp/staff/me"),
      api.requestStaff("/api/miniapp/staff/parent-requests?limit=200"),
      api.requestStaff("/api/miniapp/staff/schedule")
    ])
      .then(([me, requests, schedule]) => {
        this.setData({
          staffName: me.staff ? me.staff.name : "",
          role: me.staff ? me.staff.role : "",
          pendingCount: requests.total || 0,
          todaySessionCount: schedule.summary ? schedule.summary.visibleSessions : 0
        });
      })
      .catch((err) => {
        api.toast(err.message);
        if (String(err.message || "").toLowerCase().includes("unauthorized")) {
          wx.redirectTo({ url: "/pages/staff-login/staff-login" });
        }
      })
      .finally(() => this.setData({ loading: false }));
  },

  goRequests() {
    wx.navigateTo({ url: "/pages/staff-requests/staff-requests" });
  },

  goSchedule() {
    wx.navigateTo({ url: "/pages/staff-schedule/staff-schedule" });
  },

  logout() {
    getApp().setStaffSession("", null);
    wx.redirectTo({ url: "/pages/staff-login/staff-login" });
  }
});
