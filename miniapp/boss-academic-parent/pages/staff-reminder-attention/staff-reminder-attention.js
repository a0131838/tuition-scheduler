const api = require("../../utils/api");

Page({
  data: {
    reminders: [], visibleReminders: [], groupedReminders: [], consentReminders: [], total: 0,
    summary: { overdue: 0, today: 0, waitingReply: 0, priority: { P0: 0, P1: 0, P2: 0, P3: 0 }, groups: { COURSE: 0, TEACHING: 0, REPORT: 0, TICKET: 0 } }, loading: false,
    filter: "ACTION", group: "ALL", expandedKey: "",
    priorityFilters: [
      { value: "ACTION", label: "待处理" }, { value: "P0", label: "P0 立即" },
      { value: "P1", label: "P1 今天" }, { value: "P2", label: "P2 等回复" },
      { value: "P3", label: "P3 后续" }, { value: "ALL", label: "全部" }
    ],
    groupFilters: [
      { value: "ALL", label: "全部类别" }, { value: "COURSE", label: "课程提醒" },
      { value: "TEACHING", label: "教学跟进" }, { value: "REPORT", label: "学习报告" },
      { value: "TICKET", label: "工单确认" }
    ]
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
        const summary = data.summary || { overdue: 0, today: 0, waitingReply: 0, priority: { P0: 0, P1: 0, P2: 0, P3: 0 }, groups: { COURSE: 0, TEACHING: 0, REPORT: 0, TICKET: 0 } };
        const groupFilters = this.data.groupFilters.map((item) => Object.assign({}, item, { count: item.value === "ALL" ? (data.total || 0) : (summary.groups[item.value] || 0) }));
        this.setData({
          reminders,
          consentReminders: data.consentReminders || [],
          total: data.total || 0,
          summary,
          groupFilters,
          expandedKey: this.data.expandedKey || (reminders[0] ? reminders[0].key : "")
        });
        this.applyFilter(this.data.filter, this.data.group, reminders);
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  applyFilter(filter, group, source) {
    const reminders = source || this.data.reminders;
    const visibleReminders = reminders.filter((item) => {
      const priorityMatches = filter === "ALL" || (filter === "ACTION" ? item.priority !== "P2" && item.status !== "SNOOZED" : item.priority === filter);
      return priorityMatches && (group === "ALL" || item.group === group);
    });
    const priorityLabels = { P0: "立即处理", P1: "今天处理", P2: "等待回复", P3: "后续跟进" };
    const groupedReminders = ["P0", "P1", "P2", "P3"].map((priority) => ({
      priority,
      label: priorityLabels[priority],
      items: visibleReminders.filter((item) => item.priority === priority)
    })).filter((section) => section.items.length);
    this.setData({ filter, group, visibleReminders, groupedReminders, expandedKey: visibleReminders.some((item) => item.key === this.data.expandedKey) ? this.data.expandedKey : (visibleReminders[0] ? visibleReminders[0].key : "") });
  },

  changeFilter(e) {
    this.applyFilter(e.currentTarget.dataset.filter, this.data.group);
  },

  changeGroup(e) {
    this.applyFilter(this.data.filter, e.currentTarget.dataset.group);
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
