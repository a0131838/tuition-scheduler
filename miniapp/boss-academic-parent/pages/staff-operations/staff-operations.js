const api = require("../../utils/api");

Page({
  data: { loading: false, operations: [], canRequestCorrection: false, selected: null, reason: "", expectedResult: "", saving: false },
  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  load() {
    this.setData({ loading: true });
    return api.requestStaff("/api/miniapp/staff/operations?limit=100", { timeout: 30000 })
      .then((data) => {
        const operations = (data.operations || []).map((item) => Object.assign({}, item, { actorRoleText: item.actorRole || "员工" }));
        this.setData({ operations, showEmpty: operations.length === 0, canRequestCorrection: Boolean(data.capabilities && data.capabilities.canRequestCorrection) });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },
  startCorrection(e) {
    const id = e.currentTarget.dataset.id;
    const selected = this.data.operations.find((item) => item.id === id) || null;
    this.setData({ selected, reason: "", expectedResult: "" });
  },
  cancelCorrection() { this.setData({ selected: null, reason: "", expectedResult: "" }); },
  inputReason(e) { this.setData({ reason: e.detail.value || "" }); },
  inputExpected(e) { this.setData({ expectedResult: e.detail.value || "" }); },
  submitCorrection() {
    if (!this.data.selected || this.data.reason.trim().length < 5 || this.data.expectedResult.trim().length < 3) return api.toast("请完整填写错误原因和期望结果");
    this.setData({ saving: true });
    api.requestStaff("/api/miniapp/staff/operations", { method: "POST", data: { auditLogId: this.data.selected.id, reason: this.data.reason, expectedResult: this.data.expectedResult }, timeout: 30000 })
      .then((data) => {
        wx.showModal({ title: "已创建纠正工单", content: data.ticket ? data.ticket.ticketNo : "管理员将进行复核", showCancel: false });
        this.cancelCorrection();
        this.load();
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ saving: false }));
  }
});
