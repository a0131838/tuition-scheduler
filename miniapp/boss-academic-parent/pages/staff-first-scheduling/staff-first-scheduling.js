const api = require("../../utils/api");

const scopes = [
  { label: "全部学生", value: "all" },
  { label: "首次排课", value: "first" },
  { label: "待续排", value: "renewal" },
  { label: "可直接排课", value: "ready" },
  { label: "待处理前置条件", value: "blocked" }
];

Page({
  data: {
    scopes,
    scopeIndex: 0,
    query: "",
    candidates: [],
    visibleCandidates: [],
    summary: {},
    totalText: "0",
    readyText: "0",
    blockedText: "0",
    canSchedule: false,
    loading: false,
    openingStudentId: ""
  },

  onShow() {
    this.load();
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },

  load() {
    const query = this.data.query.trim();
    const path = "/api/miniapp/staff/first-scheduling?limit=150" + (query ? "&q=" + encodeURIComponent(query) : "");
    this.setData({ loading: true });
    return api.requestStaff(path, { timeout: 20000 })
      .then((data) => {
        const summary = data.summary || {};
        this.setData({
          candidates: data.candidates || [],
          summary,
          totalText: String(summary.total || 0),
          readyText: String(summary.ready || 0),
          blockedText: String(summary.blocked || 0),
          canSchedule: Boolean(data.capabilities && data.capabilities.canSchedule)
        });
        this.applyScope();
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  applyScope() {
    const scope = scopes[this.data.scopeIndex].value;
    const visible = (this.data.candidates || []).filter((item) => {
      if (scope === "ready") return item.ready;
      if (scope === "blocked") return !item.ready;
      if (scope === "first" || scope === "renewal") return item.scheduleStage === scope;
      return true;
    });
    this.setData({ visibleCandidates: visible });
  },

  changeScope(e) {
    this.setData({ scopeIndex: Number(e.detail.value || 0) });
    this.applyScope();
  },

  inputQuery(e) {
    this.setData({ query: e.detail.value || "" });
  },

  search() {
    this.load();
  },

  clearSearch() {
    this.setData({ query: "" });
    this.load();
  },

  openCandidate(e) {
    const studentId = e.currentTarget.dataset.id;
    const ticketId = e.currentTarget.dataset.ticketId;
    if (!studentId || this.data.openingStudentId) return;
    if (ticketId) {
      wx.navigateTo({ url: "/pages/staff-coordination-detail/staff-coordination-detail?id=" + encodeURIComponent(ticketId) });
      return;
    }
    this.setData({ openingStudentId: studentId });
    api.requestStaff("/api/miniapp/staff/first-scheduling", {
      method: "POST",
      data: { studentId },
      timeout: 20000
    })
      .then((data) => {
        if (!data.ticketId) throw new Error("首次排课工单创建失败");
        wx.navigateTo({ url: "/pages/staff-coordination-detail/staff-coordination-detail?id=" + encodeURIComponent(data.ticketId) });
      })
      .catch((err) => wx.showModal({ title: "无法开始首次排课", content: err.message || "请稍后重试", showCancel: false }))
      .finally(() => this.setData({ openingStudentId: "" }));
  }
});
