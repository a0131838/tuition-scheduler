const api = require("../../utils/api");

function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

Page({
  data: { configured: false, loading: false, employee: {}, leaveTypes: [], requests: [], leaveTypeIndex: 0, portions: [{ value: "FULL_DAY", label: "全天" }, { value: "HALF_DAY", label: "半天" }, { value: "HOURLY", label: "按小时" }], portionIndex: 0, startDate: today(), endDate: today(), hours: "1", reason: "" },
  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  load() { this.setData({ loading: true }); return api.requestStaff("/api/miniapp/staff/hr/leave", { timeout: 12000 }).then(data => this.setData({ configured: Boolean(data.configured), employee: data.employee || {}, leaveTypes: data.leaveTypes || [], requests: data.requests || [] })).catch(err => api.toast(err.message)).finally(() => this.setData({ loading: false })); },
  changeType(e) { this.setData({ leaveTypeIndex: Number(e.detail.value || 0) }); },
  changePortion(e) { this.setData({ portionIndex: Number(e.detail.value || 0) }); },
  changeStart(e) { this.setData({ startDate: e.detail.value, endDate: e.detail.value > this.data.endDate ? e.detail.value : this.data.endDate }); },
  changeEnd(e) { this.setData({ endDate: e.detail.value }); },
  changeHours(e) { this.setData({ hours: e.detail.value }); },
  changeReason(e) { this.setData({ reason: e.detail.value }); },
  submit() {
    const type = this.data.leaveTypes[this.data.leaveTypeIndex]; const portion = this.data.portions[this.data.portionIndex];
    if (!type) return api.toast("请选择假期类型"); if (!this.data.reason.trim()) return api.toast("请填写请假原因");
    wx.showModal({ title: "确认提交", content: `${type.label}\n${this.data.startDate} 至 ${this.data.endDate}\n提交后由 ${this.data.employee.managerName || "HR"} 审批。`, success: res => { if (!res.confirm) return; this.setData({ loading: true }); api.requestStaff("/api/miniapp/staff/hr/leave", { method: "POST", timeout: 15000, data: { leaveType: type.value, portion: portion.value, startDate: this.data.startDate, endDate: this.data.endDate, hours: this.data.hours, reason: this.data.reason } }).then(data => { api.toast(data.message); this.setData({ reason: "" }); return this.load(); }).catch(err => api.toast(err.message)).finally(() => this.setData({ loading: false })); } });
  },
  cancelRequest(e) { const id = e.currentTarget.dataset.id; wx.showModal({ title: "取消申请", content: "已批准的假期取消后会恢复对应余额。", success: res => { if (!res.confirm) return; api.requestStaff("/api/miniapp/staff/hr/leave", { method: "POST", data: { action: "CANCEL", requestId: id } }).then(data => { api.toast(data.message); return this.load(); }).catch(err => api.toast(err.message)); } }); }
});
