const api = require("../../utils/api");

Page({
  data: { id: "", loading: false, saving: false, request: null, declineReason: "", issuedCode: "", wechatMessage: "" },
  onLoad(options) { this.setData({ id: options.id || "" }); },
  onShow() { if (this.data.id) this.load(); },
  setDeclineReason(event) { this.setData({ declineReason: event.detail.value || "" }); },
  applyRequest(request) {
    const status = request.status;
    this.setData({ request: Object.assign({}, request, {
      canMarkContacted: status === "REQUESTED",
      canIssue: status === "CONTACTED" || status === "READY_TO_ISSUE",
      canDecline: ["REQUESTED", "CONTACTED", "READY_TO_ISSUE"].includes(status),
      canInterpret: status === "REPORT_READY",
      canClose: status === "INTERPRETED" || status === "DECLINED",
      canOpenSession: Boolean(request.sessionId)
    }) });
  },
  load() {
    this.setData({ loading: true });
    return api.requestStaff("/api/miniapp/staff/academic-assessment-requests?id=" + encodeURIComponent(this.data.id), { timeout: 15000 })
      .then((data) => this.applyRequest(data.request)).catch((err) => api.toast(err.message)).finally(() => this.setData({ loading: false }));
  },
  action(action, extra) {
    this.setData({ saving: true });
    return api.requestStaff("/api/miniapp/staff/academic-assessment-requests", { method: "POST", data: Object.assign({ id: this.data.id, action }, extra || {}), timeout: 20000 })
      .then((data) => {
        if (data.code) this.setData({ issuedCode: data.code, wechatMessage: data.wechatMessage || "" });
        if (data.request) this.applyRequest(data.request);
        api.toast(data.message);
        if (!data.code) return this.load();
      }).catch((err) => api.toast(err.message)).finally(() => this.setData({ saving: false }));
  },
  markContacted() { this.action("mark_contacted"); },
  issueCode() { wx.showModal({ title: "确认资料并发码", content: "将按当前年龄段和目标方向生成14天有效、默认一次使用的评估码。", success: (res) => { if (res.confirm) this.action("issue_code"); } }); },
  decline() { if (!this.data.declineReason.trim()) return api.toast("请先填写暂不适合测试的原因"); this.action("decline", { reason: this.data.declineReason }); },
  markInterpreted() { wx.showModal({ title: "确认已完成人工解读", content: "确认已经向家长解释测试条件、优势、优先补强和后续计划。", success: (res) => { if (res.confirm) this.action("mark_interpreted"); } }); },
  close() { this.action("close"); },
  copyCode() { wx.setClipboardData({ data: this.data.issuedCode, success: () => api.toast("评估码已复制") }); },
  copyMessage() { wx.setClipboardData({ data: this.data.wechatMessage, success: () => api.toast("微信通知已复制") }); },
  openSession() { if (this.data.request && this.data.request.sessionId) wx.navigateTo({ url: "/pages/staff-assessment-detail/staff-assessment-detail?id=" + encodeURIComponent(this.data.request.sessionId) }); }
});
