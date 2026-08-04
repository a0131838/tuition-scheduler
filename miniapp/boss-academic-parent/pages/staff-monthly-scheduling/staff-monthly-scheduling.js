const api = require("../../utils/api");

const tabs = [
  { value: "ALL", label: "全部" },
  { value: "NOT_SENT", label: "待发送" },
  { value: "SENT", label: "已发送" },
  { value: "VIEWED", label: "已查看" },
  { value: "SUBMITTED", label: "已提交" },
  { value: "NEEDS_CLARIFICATION", label: "需澄清" },
  { value: "MATCHED", label: "已匹配" },
  { value: "TEACHER_EXCEPTION", label: "老师例外" },
  { value: "SCHEDULED", label: "已排课" },
  { value: "PAUSED", label: "下月暂停" },
  { value: "NO_RESPONSE", label: "未回复" }
];

Page({
  data: { loading: true, updatingId: "", month: "", campaign: null, items: [], counts: {}, tabs, status: "ALL" },
  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  load() {
    this.setData({ loading: true });
    return api.requestStaff(`/api/miniapp/staff/monthly-scheduling?status=${encodeURIComponent(this.data.status)}`, { timeout: 15000 })
      .then((data) => this.setData({ month: data.month || "", campaign: data.campaign || null, items: data.items || [], counts: data.counts || {} }))
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },
  selectTab(e) { this.setData({ status: e.currentTarget.dataset.value }, () => this.load()); },
  copyMessage(e) {
    const item = this.data.items.find((row) => row.id === e.currentTarget.dataset.id);
    if (!item || !item.message) return;
    wx.setClipboardData({ data: item.message });
  },
  inputNote(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ [`items[${index}].internalNote`]: e.detail.value });
  },
  updateStatus(e) {
    const itemId = e.currentTarget.dataset.id;
    const status = e.currentTarget.dataset.status;
    if (!itemId || !status || this.data.updatingId) return;
    const item = this.data.items.find((row) => row.id === itemId);
    this.setData({ updatingId: itemId });
    api.requestStaff("/api/miniapp/staff/monthly-scheduling", {
      method: "PATCH",
      timeout: 12000,
      data: { itemId, status, expectedStatus: item ? item.status : "", internalNote: item ? item.internalNote || "" : "" }
    })
      .then(() => { wx.showToast({ title: "已更新", icon: "success" }); return this.load(); })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ updatingId: "" }));
  }
});
