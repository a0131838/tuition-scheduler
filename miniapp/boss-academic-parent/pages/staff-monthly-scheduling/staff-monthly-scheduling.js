const api = require("../../utils/api");

const tabs = [
  { value: "READY_CONFIRM", label: "待确认" },
  { value: "WAITING_PARENT", label: "等家长" },
  { value: "EXCEPTIONS", label: "异常" },
  { value: "COMPLETED", label: "已处理" },
  { value: "ALL", label: "全部" }
];

Page({
  data: { loading: true, updatingId: "", month: "", campaign: null, items: [], counts: {}, tabs, status: "READY_CONFIRM" },
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
  },
  openScheduling(e) {
    const item = this.data.items.find((row) => row.id === e.currentTarget.dataset.id);
    const offer = item && item.selectedOffer;
    if (!item || !offer || !offer.sessionDates || !offer.sessionDates.length) return api.toast("没有可用于预填的具体时间");
    const first = offer.sessionDates[0];
    let url = "/pages/staff-student-scheduling/staff-student-scheduling?id=" + encodeURIComponent(item.studentId);
    url += "&date=" + encodeURIComponent(first.date);
    url += "&time=" + encodeURIComponent(offer.start);
    url += "&teacherId=" + encodeURIComponent(offer.teacherId);
    url += "&courseId=" + encodeURIComponent(item.courseId);
    url += "&duration=" + encodeURIComponent(String(offer.durationMin));
    url += "&weeks=" + encodeURIComponent(String(Math.min(12, offer.suggestedWeeks || 1)));
    wx.navigateTo({ url });
  }
});
