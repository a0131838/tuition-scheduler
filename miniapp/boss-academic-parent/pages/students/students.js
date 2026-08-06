const api = require("../../utils/api");

Page({
  data: { students: [], currentStudentId: "", currentStudent: null, loggingOut: false },
  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  load() {
    return api.request("/api/miniapp/students").then((data) => {
      const students = data.students || [];
      const app = getApp();
      if (!app.globalData.currentStudentId && students[0]) app.setCurrentStudent(students[0]);
      const currentStudentId = app.globalData.currentStudentId;
      this.setData({ students, currentStudentId, currentStudent: students.find((item) => item.id === currentStudentId) || students[0] || null });
    }).catch((err) => {
      if (String(err.message).includes("Unauthorized")) { getApp().setSession(""); wx.redirectTo({ url: "/pages/login/login" }); return; }
      api.toast(err.message);
    });
  },
  selectStudent(e) {
    const student = this.data.students[Number(e.currentTarget.dataset.index)];
    if (!student) return;
    getApp().setCurrentStudent(student);
    this.setData({ currentStudentId: student.id, currentStudent: student });
    wx.switchTab({ url: "/pages/home/home" });
  },
  goFinance() { wx.navigateTo({ url: "/pages/finance/finance" }); },
  goRequests() { wx.navigateTo({ url: "/pages/requests/requests" }); },
  goReports() { wx.navigateTo({ url: "/pages/care-reports/care-reports" }); },
  goReminders() { wx.navigateTo({ url: "/pages/reminders/reminders" }); },
  goBind() { wx.navigateTo({ url: "/pages/bind/bind" }); },
  logout() {
    if (this.data.loggingOut) return;
    wx.showModal({ title: "退出家长登录", content: "退出后需要重新使用微信登录。", confirmText: "退出", confirmColor: "#EC5E0A", success: (result) => {
      if (!result.confirm) return;
      this.setData({ loggingOut: true });
      api.request("/api/miniapp/auth/logout", { method: "POST", timeout: 12000 }).catch(() => null).finally(() => {
        const app = getApp(); app.setSession(""); app.setCurrentStudent(null); app.setCurrentPortal(""); wx.reLaunch({ url: "/pages/guide-account/guide-account" });
      });
    }});
  }
});
