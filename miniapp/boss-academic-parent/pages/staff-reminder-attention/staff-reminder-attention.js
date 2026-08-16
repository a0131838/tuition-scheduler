const api = require("../../utils/api");

Page({
  data: {
    reminders: [], visibleReminders: [], consentReminders: [], total: 0,
    summary: { overdue: 0, today: 0, waitingReply: 0 }, loading: false,
    filter: "ACTION", expandedKey: ""
  },

  onShow() {
    this.load();
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },

  load() {
    this.setData({ loading: true });
    return api.requestStaff("/api/miniapp/staff/reminder-attention", { timeout: 12000 })
      .then((data) => {
        const reminders = data.reminders || [];
        this.setData({
          reminders,
          consentReminders: data.consentReminders || [],
          total: data.total || 0,
          summary: data.summary || { overdue: 0, today: 0, waitingReply: 0 },
          expandedKey: this.data.expandedKey || (reminders[0] ? reminders[0].key : "")
        });
        this.applyFilter(this.data.filter, reminders);
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  applyFilter(filter, source) {
    const reminders = source || this.data.reminders;
    const visibleReminders = reminders.filter((item) => {
      if (filter === "ALL") return true;
      if (filter === "OVERDUE" || filter === "TODAY") return item.urgency === filter;
      if (filter === "WAITING_REPLY") return item.status === "WAITING_REPLY";
      return ["READY", "COPIED", "SENT", "REPLIED", "ESCALATED"].indexOf(item.status) >= 0;
    });
    this.setData({ filter, visibleReminders, expandedKey: visibleReminders.some((item) => item.key === this.data.expandedKey) ? this.data.expandedKey : (visibleReminders[0] ? visibleReminders[0].key : "") });
  },

  changeFilter(e) {
    this.applyFilter(e.currentTarget.dataset.filter);
  },

  toggleReminder(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ expandedKey: this.data.expandedKey === key ? "" : key });
  },

  updateStatus(item, status, language) {
    return api.requestStaff("/api/miniapp/staff/reminder-attention", {
      method: "POST", data: { key: item.key, status, language: language || "" }, timeout: 12000
    }).then(() => this.load());
  },

  copyText(e) {
    const key = e.currentTarget.dataset.key;
    const language = e.currentTarget.dataset.language || "BILINGUAL";
    const item = this.data.reminders.find((row) => row.key === key);
    if (!item) return;
    const text = language === "ZH" ? item.copyZh : language === "EN" ? item.copyEn : item.copyBilingual;
    wx.setClipboardData({
      data: text,
      success: () => this.updateStatus(item, "COPIED", language).then(() => api.toast(language === "BILINGUAL" ? "已复制中英双语" : "文案已复制")),
      fail: () => api.toast("复制失败")
    });
  },

  markStatus(e) {
    const item = this.data.reminders.find((row) => row.key === e.currentTarget.dataset.key);
    if (!item) return;
    this.updateStatus(item, e.currentTarget.dataset.status).catch((err) => api.toast(err.message));
  },

  callParent(e) {
    const phone = e.currentTarget.dataset.phone;
    if (!phone) return api.toast("家长未填写电话");
    wx.makePhoneCall({ phoneNumber: phone, fail: () => {} });
  }
});
