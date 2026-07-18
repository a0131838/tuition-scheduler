const api = require("../../utils/api");

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

Page({
  data: {
    month: currentMonth(),
    scopes: [{ value: "all", label: "全部排课课次" }, { value: "completed", label: "仅已完成课次" }],
    scopeIndex: 0,
    payroll: null,
    showCombos: false,
    showSessions: false,
    loading: false,
    confirming: false
  },
  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  changeMonth(e) { this.setData({ month: e.detail.value }); this.load(); },
  changeScope(e) { this.setData({ scopeIndex: Number(e.detail.value || 0) }); this.load(); },
  toggleCombos() { this.setData({ showCombos: !this.data.showCombos }); },
  toggleSessions() { this.setData({ showSessions: !this.data.showSessions }); },
  load() {
    const scope = this.data.scopes[this.data.scopeIndex].value;
    this.setData({ loading: true });
    return api.requestStaff(`/api/miniapp/staff/teacher/payroll?month=${encodeURIComponent(this.data.month)}&scope=${scope}`, { timeout: 30000 })
      .then((data) => this.setData({ payroll: data, month: data.month || this.data.month }))
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },
  confirmPayroll() {
    if (this.data.confirming || !this.data.payroll || !this.data.payroll.status.needsAction) return;
    wx.showModal({
      title: "确认工资单",
      content: "请确认你已经核对课程、课时和工资金额。确认后将进入管理审批。",
      confirmText: "确认无误",
      success: (res) => {
        if (!res.confirm) return;
        const scope = this.data.scopes[this.data.scopeIndex].value;
        this.setData({ confirming: true });
        api.requestStaff("/api/miniapp/staff/teacher/payroll", {
          method: "POST",
          data: { month: this.data.month, scope, acknowledged: true },
          timeout: 30000
        })
          .then(() => {
            wx.showToast({ title: "已确认", icon: "success" });
            return this.load();
          })
          .catch((err) => api.toast(err.message))
          .finally(() => this.setData({ confirming: false }));
      }
    });
  }
});
