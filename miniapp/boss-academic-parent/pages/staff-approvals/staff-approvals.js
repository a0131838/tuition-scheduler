const api = require("../../utils/api");

function decorate(items) {
  return (items || []).map((item) => Object.assign({}, item, {
    canAct: ["PACKAGE_INVOICE", "EXPENSE_CLAIM", "TEACHER_PAYROLL"].includes(item.type),
    canReject: ["PACKAGE_INVOICE", "EXPENSE_CLAIM"].includes(item.type),
    amountDisplay: item.amountText || ((item.currency || "SGD") + " " + Number(item.amount || 0).toFixed(2)),
    cardClass: item.overdue ? "alert" : ""
  }));
}

Page({
  data: { loading: false, savingId: "", summary: {}, items: [] },
  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  load() {
    this.setData({ loading: true });
    return api.requestStaff("/api/miniapp/staff/approvals", { timeout: 60000 })
      .then((data) => {
        const summary = data.summary || {};
        const items = decorate(data.items);
        this.setData({ summary, managerCount: summary.manager || 0, overdueCount: summary.overdue || 0, items, showEmpty: items.length === 0 });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },
  approve(e) {
    const item = this.data.items.find((row) => row.id === e.currentTarget.dataset.id && row.type === e.currentTarget.dataset.type);
    if (!item || !item.canAct) return;
    wx.showModal({
      title: "确认审批通过",
      content: item.title + "\n" + item.amountDisplay + "\n请确认已核对关键数据。",
      confirmText: "确认通过",
      success: (res) => { if (res.confirm) this.submit(item, "APPROVE", ""); }
    });
  },
  reject(e) {
    const item = this.data.items.find((row) => row.id === e.currentTarget.dataset.id && row.type === e.currentTarget.dataset.type);
    if (!item || !item.canReject) return;
    wx.showModal({
      title: "退回并要求修正",
      content: "请填写明确的退回原因，系统会保留审批日志。",
      editable: true,
      placeholderText: "输入退回原因",
      confirmText: "确认退回",
      success: (res) => {
        if (!res.confirm) return;
        const reason = String(res.content || "").trim();
        if (reason.length < 3) return api.toast("请填写退回原因");
        this.submit(item, "REJECT", reason);
      }
    });
  },
  submit(item, decision, reason) {
    this.setData({ savingId: item.id, saving: true });
    api.requestStaff("/api/miniapp/staff/approvals", { method: "POST", data: { type: item.type, id: item.id, decision, reason }, timeout: 60000 })
      .then(() => { wx.showToast({ title: decision === "APPROVE" ? "已通过" : "已退回", icon: "success" }); return this.load(); })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ savingId: "", saving: false }));
  }
});
