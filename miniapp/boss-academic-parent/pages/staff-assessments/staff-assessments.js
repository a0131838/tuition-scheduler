const api = require("../../utils/api");

Page({
  data: {
    loading: false,
    issuing: false,
    bank: {},
    capabilities: {},
    awaitingCount: 0,
    completedCount: 0,
    requestOpenCount: 0,
    requestSummary: {},
    sessions: [],
    codes: [],
    auditLogs: [],
    showTools: false,
    studentNickname: "",
    note: "",
    ageLabels: ["不锁定", "3–5岁", "6–8岁", "9–11岁", "12–14岁", "15–17岁"],
    ageIndex: 0,
    pathLabels: ["不锁定", "暂不确定", "国际学校", "政府学校 / AEIS", "DSA / 面试 / 作品集"],
    pathValues: ["", "UNSURE", "INTERNATIONAL", "MOE_AEIS", "DSA"],
    pathIndex: 0,
    issuedCode: "",
    issuedMessage: ""
  },

  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  setNickname(event) { this.setData({ studentNickname: event.detail.value }); },
  setNote(event) { this.setData({ note: event.detail.value }); },
  setAge(event) { this.setData({ ageIndex: Number(event.detail.value) }); },
  setPath(event) { this.setData({ pathIndex: Number(event.detail.value) }); },
  toggleTools() { this.setData({ showTools: !this.data.showTools }); },

  load() {
    this.setData({ loading: true });
    return api.requestStaff("/api/miniapp/staff/academic-assessments?limit=50", { timeout: 15000 })
      .then((data) => {
        const sessions = data.sessions || [];
        const capabilities = data.capabilities || {};
        this.setData({
          bank: data.bank || {},
          capabilities,
          awaitingCount: data.awaitingCount || 0,
          completedCount: sessions.filter((item) => item.status === "COMPLETED").length,
          requestOpenCount: data.requestOpenCount || 0,
          sessions,
          codes: data.codes || [],
          auditLogs: data.auditLogs || []
        });
        if (!capabilities.canIssue) return null;
        return api.requestStaff("/api/miniapp/staff/academic-assessment-requests?status=OPEN&limit=1", { timeout: 15000 })
          .then((requestData) => this.setData({ requestSummary: requestData.summary || {}, requestOpenCount: (requestData.summary || {}).open || 0 }))
          .catch(() => null);
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  goRequestQueue() { wx.navigateTo({ url: "/pages/staff-assessment-requests/staff-assessment-requests" }); },
  issueCode() {
    this.setData({ issuing: true, issuedCode: "", issuedMessage: "" });
    api.requestStaff("/api/miniapp/staff/academic-assessments", {
      method: "POST",
      data: { studentNickname: this.data.studentNickname, note: this.data.note, ageBand: this.data.ageIndex ? this.data.ageLabels[this.data.ageIndex] : "", targetPath: this.data.pathValues[this.data.pathIndex] },
      timeout: 15000
    }).then((data) => { this.setData({ issuedCode: data.code || "" }); api.toast(data.message); this.load(); })
      .catch((err) => api.toast(err.message)).finally(() => this.setData({ issuing: false }));
  },
  copyCode() { wx.setClipboardData({ data: this.data.issuedCode, success: () => api.toast("评估码已复制") }); },
  revokeCode(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({ title: "撤销评估码", content: "撤销后家长将无法使用；如果来自申请，申请会回到可以重新发码。", success: (result) => {
      if (!result.confirm) return;
      api.requestStaff("/api/miniapp/staff/academic-assessments", { method: "POST", data: { action: "revoke", id } })
        .then((data) => { api.toast(data.message); this.load(); }).catch((err) => api.toast(err.message));
    }});
  },
  openSession(event) { wx.navigateTo({ url: "/pages/staff-assessment-detail/staff-assessment-detail?id=" + encodeURIComponent(event.currentTarget.dataset.id) }); }
});
