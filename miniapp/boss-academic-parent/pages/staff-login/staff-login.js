const api = require("../../utils/api");

const roleLabels = {
  ADMIN: "管理账号",
  TEACHER: "老师账号",
  CS: "教务账号",
  FINANCE: "财务账号",
  SALES: "课程顾问账号"
};

Page({
  data: {
    loading: false,
    accounts: [],
    choosing: false
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
        if (data.needsAccountChoice) {
          const accounts = (data.accounts || []).map((account) => ({
            ...account,
            roleText: account.isObserver ? "观察者账号" : (roleLabels[account.role] || "员工账号")
          }));
          this.setData({ accounts, choosing: true });
          return;
        }
        wx.redirectTo({ url: "/pages/staff-home/staff-home" });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  chooseAccount(e) {
    const userId = e.currentTarget.dataset.userid;
    if (!userId || this.data.loading) return;
    this.setData({ loading: true });
    api.loginStaffWithWeChat(userId)
      .then(() => wx.redirectTo({ url: "/pages/staff-home/staff-home" }))
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  bindAnother() {
    wx.navigateTo({ url: "/pages/staff-bind/staff-bind" });
  },

  goParent() {
    getApp().setCurrentPortal("");
    wx.reLaunch({ url: "/pages/guide-account/guide-account" });
  },

  onShareAppMessage() {
    return {
      title: "新加坡学校指南｜找学校、查考试、做评估",
      path: "/pages/guide-home/guide-home"
    };
  }
});
