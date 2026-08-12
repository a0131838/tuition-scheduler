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
    accounts: [],
    currentUserId: "",
    loading: true,
    switchingId: "",
    requiresRelogin: false
  },

  onShow() {
    this.loadAccounts();
  },

  loadAccounts() {
    this.setData({ loading: true });
    return Promise.all([
      api.requestStaff("/api/miniapp/staff/me", { timeout: 12000 }),
      api.requestStaff("/api/miniapp/staff/accounts", { timeout: 12000 })
    ])
      .then(([me, result]) => {
        const currentUserId = me.staff ? me.staff.id : "";
        const accounts = (result.accounts || []).map((account) => ({
          ...account,
          roleText: account.isObserver ? "观察者账号" : (roleLabels[account.role] || "员工账号"),
          isCurrent: account.id === currentUserId
        }));
        this.setData({ accounts, currentUserId, requiresRelogin: Boolean(result.requiresRelogin) });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  switchAccount(e) {
    const userId = e.currentTarget.dataset.userid;
    if (!userId || userId === this.data.currentUserId || this.data.switchingId) return;
    this.setData({ switchingId: userId });
    api.requestStaff("/api/miniapp/staff/accounts", {
      method: "POST",
      data: { userId },
      timeout: 12000
    })
      .then((data) => {
        getApp().setStaffSession(data.token, data.staff);
        wx.showToast({ title: "账号已切换", icon: "success" });
        wx.reLaunch({ url: "/pages/staff-home/staff-home" });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ switchingId: "" }));
  },

  bindAnother() {
    wx.navigateTo({ url: "/pages/staff-bind/staff-bind" });
  },

  relogin() {
    getApp().setStaffSession("", null);
    wx.reLaunch({ url: "/pages/staff-login/staff-login" });
  }
});
