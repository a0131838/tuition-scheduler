const api = require("../../utils/api");

Page({
  data: {
    loading: false
  },

  handleLogin() {
    this.setData({ loading: true });
    api.loginWithWeChat()
      .then((data) => {
        if (data.students && data.students.length > 0) {
          wx.switchTab({ url: "/pages/students/students" });
        } else {
          wx.navigateTo({ url: "/pages/bind/bind" });
        }
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  goBind() {
    wx.navigateTo({ url: "/pages/bind/bind" });
  },

  goStaff() {
    wx.navigateTo({ url: "/pages/staff-login/staff-login" });
  }
});
