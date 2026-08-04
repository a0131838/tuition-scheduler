const api = require("../../utils/api");

function todayText() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

Page({
  data: { date: todayText(), start: "09:00", end: "18:00", slots: [], from: "", to: "", campaign: null, saving: false, deletingId: "" },
  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  load() {
    return api.requestStaff("/api/miniapp/staff/teacher/availability", { timeout: 12000 })
      .then((data) => this.setData({ slots: data.slots || [], from: data.from || "", to: data.to || "", campaign: data.campaign || null }))
      .catch((err) => api.toast(err.message));
  },
  changeDate(e) { this.setData({ date: e.detail.value }); },
  changeStart(e) { this.setData({ start: e.detail.value }); },
  changeEnd(e) { this.setData({ end: e.detail.value }); },
  addSlot() {
    if (this.data.saving) return;
    this.setData({ saving: true });
    api.requestStaff("/api/miniapp/staff/teacher/availability", { method: "POST", data: { date: this.data.date, start: this.data.start, end: this.data.end }, timeout: 12000 })
      .then(() => { wx.showToast({ title: "已保存", icon: "success" }); return this.load(); })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ saving: false }));
  },
  removeSlot(e) {
    const id = e.currentTarget.dataset.id;
    if (!id || this.data.deletingId) return;
    wx.showModal({
      title: "删除可用时段",
      content: "确定删除这个时段吗？已经排好的课程不会改变。",
      success: (res) => {
        if (!res.confirm) return;
        this.setData({ deletingId: id });
        api.requestStaff("/api/miniapp/staff/teacher/availability/" + encodeURIComponent(id), { method: "DELETE", timeout: 12000 })
          .then(() => this.load())
          .catch((err) => api.toast(err.message))
          .finally(() => this.setData({ deletingId: "" }));
      }
    });
  }
});
