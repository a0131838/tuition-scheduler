const api = require("../../utils/api");

Page({
  data: { reminders: [], total: 0, loading: false },

  onShow() {
    this.load();
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },

  load() {
    this.setData({ loading: true });
    return api.requestStaff("/api/miniapp/staff/reminder-attention", { timeout: 12000 })
      .then((data) => this.setData({ reminders: data.reminders || [], total: data.total || 0 }))
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  callParent(e) {
    const phone = e.currentTarget.dataset.phone;
    if (!phone) return api.toast("家长未填写电话");
    wx.makePhoneCall({ phoneNumber: phone, fail: () => {} });
  }
});
