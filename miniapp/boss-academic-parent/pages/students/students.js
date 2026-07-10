const api = require("../../utils/api");

Page({
  data: {
    students: [],
    currentStudentId: ""
  },

  onShow() {
    this.load();
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },

  load() {
    return api.request("/api/miniapp/students")
      .then((data) => {
        const students = data.students || [];
        const app = getApp();
        if (!app.globalData.currentStudentId && students[0]) app.setCurrentStudent(students[0]);
        this.setData({
          students,
          currentStudentId: app.globalData.currentStudentId
        });
      })
      .catch((err) => {
        if (String(err.message).includes("Unauthorized")) {
          wx.redirectTo({ url: "/pages/login/login" });
          return;
        }
        api.toast(err.message);
      });
  },

  selectStudent(e) {
    const student = this.data.students[Number(e.currentTarget.dataset.index)];
    if (!student) return;
    getApp().setCurrentStudent(student);
    this.setData({ currentStudentId: student.id });
    wx.switchTab({ url: "/pages/home/home" });
  },

  goBind() {
    wx.navigateTo({ url: "/pages/bind/bind" });
  }
});
