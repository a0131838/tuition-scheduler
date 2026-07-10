const api = require("../../utils/api");

Page({
  data: {
    staffName: "",
    staffNameText: "员工工作台",
    role: "",
    roleText: "STAFF",
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
    this.setData({
      loading: true,
      staffNameText: this.data.staffNameText || "员工工作台",
      roleText: this.data.roleText || "STAFF"
    });

    const meTask = api.requestStaff("/api/miniapp/staff/me", { timeout: 12000 })
      .then((me) => {
        const staff = me.staff || {};
        this.setData({
          staffName: staff.name || "",
          staffNameText: staff.name || "员工工作台",
          role: staff.role || "",
          roleText: staff.role || "STAFF"
        });
      })
      .catch((err) => {
        if (String(err.message || "").toLowerCase().includes("unauthorized")) {
          wx.redirectTo({ url: "/pages/staff-login/staff-login" });
          return;
        }
        api.toast("员工信息加载失败");
      });

    const requestsTask = api.requestStaff("/api/miniapp/staff/parent-requests?limit=200", { timeout: 12000 })
      .then((requests) => this.setData({ pendingCount: requests.total || 0 }))
      .catch(() => this.setData({ pendingCount: 0 }));

    const scheduleTask = api.requestStaff("/api/miniapp/staff/schedule", { timeout: 12000 })
      .then((schedule) => this.setData({ todaySessionCount: schedule.summary ? schedule.summary.visibleSessions : 0 }))
      .catch(() => this.setData({ todaySessionCount: 0 }));

    return Promise.allSettled([meTask, requestsTask, scheduleTask])
      .finally(() => this.setData({ loading: false }));
  },

  goRequests() {
    wx.navigateTo({ url: "/pages/staff-requests/staff-requests" });
  },

  goNewRequest() {
    wx.navigateTo({ url: "/pages/staff-request-new/staff-request-new" });
  },

  goSchedule() {
    wx.navigateTo({ url: "/pages/staff-schedule/staff-schedule" });
  },

  logout() {
    getApp().setStaffSession("", null);
    wx.redirectTo({ url: "/pages/staff-login/staff-login" });
  }
});
