const api = require("../../utils/api");

Page({
  data: {
    loading: false
  },

  onShow() {
    getApp().setCurrentPortal("staff");
    const token = getApp().globalData.staffToken || wx.getStorageSync("staff_token") || "";
    if (token) wx.redirectTo({ url: "/pages/staff-home/staff-home" });
  },

  handleLogin() {
    this.setData({ loading: true });
    api.loginStaffWithWeChat()
      .then((data) => {
        if (data.needsBind) {
          wx.navigateTo({ url: "/pages/staff-bind/staff-bind" });
          return;
        }
        wx.redirectTo({ url: "/pages/staff-home/staff-home" });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  goParent() {
    getApp().setCurrentPortal("parent");
    wx.redirectTo({ url: "/pages/login/login" });
  }
});
