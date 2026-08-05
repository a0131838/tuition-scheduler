const api = require("../../utils/api");

Page({
  data: {
    loading: false,
    issuing: false,
    bank: {},
    capabilities: {},
    awaitingCount: 0,
    sessions: [],
    codes: [],
    auditLogs: [],
    studentNickname: "",
    note: "",
    ageLabels: ["不锁定", "3–5岁", "6–8岁", "9–11岁", "12–14岁", "15–17岁"],
    ageIndex: 0,
    pathLabels: ["不锁定", "暂不确定", "国际学校", "政府学校 / AEIS", "DSA / 面试 / 作品集"],
    pathValues: ["", "UNSURE", "INTERNATIONAL", "MOE_AEIS", "DSA"],
    pathIndex: 0,
    issuedCode: ""
  },

  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  setNickname(event) { this.setData({ studentNickname: event.detail.value }); },
  setNote(event) { this.setData({ note: event.detail.value }); },
  setAge(event) { this.setData({ ageIndex: Number(event.detail.value) }); },
  setPath(event) { this.setData({ pathIndex: Number(event.detail.value) }); },

  load() {
    this.setData({ loading: true });
    return api.requestStaff("/api/miniapp/staff/academic-assessments?limit=50", { timeout: 15000 })
      .then((data) => this.setData({ bank: data.bank || {}, capabilities: data.capabilities || {}, awaitingCount: data.awaitingCount || 0, sessions: data.sessions || [], codes: data.codes || [], auditLogs: data.auditLogs || [] }))
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  issueCode() {
    this.setData({ issuing: true, issuedCode: "" });
    api.requestStaff("/api/miniapp/staff/academic-assessments", {
      method: "POST",
      data: {
        studentNickname: this.data.studentNickname,
        note: this.data.note,
        ageBand: this.data.ageIndex ? this.data.ageLabels[this.data.ageIndex] : "",
        targetPath: this.data.pathValues[this.data.pathIndex]
      },
      timeout: 15000
    }).then((data) => {
      this.setData({ issuedCode: data.code || "" });
      api.toast(data.message);
      this.load();
    }).catch((err) => api.toast(err.message)).finally(() => this.setData({ issuing: false }));
  },

  copyCode() {
    wx.setClipboardData({ data: this.data.issuedCode, success: () => api.toast("评估码已复制") });
  },

  revokeCode(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({ title: "撤销评估码", content: "撤销后家长将无法使用此评估码。", success: (result) => {
      if (!result.confirm) return;
      api.requestStaff("/api/miniapp/staff/academic-assessments", { method: "POST", data: { action: "revoke", id } })
        .then((data) => { api.toast(data.message); this.load(); })
        .catch((err) => api.toast(err.message));
    }});
  },

  openSession(event) {
    wx.navigateTo({ url: "/pages/staff-assessment-detail/staff-assessment-detail?id=" + encodeURIComponent(event.currentTarget.dataset.id) });
  }
});
