const api = require("../../utils/api");

Page({
  data: { items: [], loading: false, workingId: "", message: "" },
  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  load() {
    this.setData({ loading: true, message: "" });
    return api.requestStaff("/api/miniapp/staff/teacher/arrangement-confirmations", { timeout: 20000 })
      .then((data) => this.setData({ items: data.items || [] }))
      .catch((error) => this.setData({ message: error.message || "读取失败" }))
      .finally(() => this.setData({ loading: false }));
  },
  confirm(event) {
    const id = String(event.currentTarget.dataset.id || "");
    if (!id || this.data.workingId) return;
    this.setData({ workingId: id, message: "" });
    api.requestStaff(`/api/miniapp/staff/teacher/arrangement-confirmations/${encodeURIComponent(id)}`, { method: "POST", timeout: 30000 })
      .then((data) => { wx.showToast({ title: "已确认", icon: "success" }); this.setData({ message: data.message || "已确认" }); return this.load(); })
      .catch((error) => this.setData({ message: error.message || "确认失败" }))
      .finally(() => this.setData({ workingId: "" }));
  },
});
