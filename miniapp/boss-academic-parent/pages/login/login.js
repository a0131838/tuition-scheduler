const api = require("../../utils/api");

Page({
  data: {
    loading: false
  },

  onShow() {
    if (this.routing) return;
    const app = getApp();
    if (app.globalData.currentPortal === "staff" && app.globalData.staffToken) {
      this.redirectToStaff();
      return;
    }
    if (app.globalData.currentPortal === "parent" && app.globalData.token) {
      this.switchToParentHome();
    }
  },

  handleLogin() {
    getApp().setCurrentPortal("parent");
    this.setData({ loading: true });
    api.loginWithWeChat()
      .then((data) => {
        if (data.students && data.students.length > 0) {
          const app = getApp();
          const selectedId = api.currentStudentId();
          const selectedStudent = data.students.find((student) => student.id === selectedId) || data.students[0];
          app.setCurrentStudent(selectedStudent);
          this.switchToParentHome();
        } else {
          wx.navigateTo({ url: "/pages/bind/bind" });
        }
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  switchToParentHome() {
    this.routing = true;
    wx.switchTab({
      url: "/pages/home/home",
      complete: () => { this.routing = false; }
    });
  },

  redirectToStaff() {
    this.routing = true;
    wx.redirectTo({
      url: "/pages/staff-home/staff-home",
      complete: () => { this.routing = false; }
    });
  },

  goSchoolGuide() {
    getApp().setCurrentPortal("");
    wx.reLaunch({ url: "/pages/guide-home/guide-home" });
  }
});
