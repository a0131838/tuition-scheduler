const api = require("../../utils/api");

Page({
  data: {
    loading: false,
    requests: [],
    summary: {},
    query: "",
    statusIndex: 0,
    statusLabels: ["全部开放", "待联系", "已联系", "可发码", "已发码", "测评中", "待复核", "报告完成", "已解读"],
    statusValues: ["OPEN", "REQUESTED", "CONTACTED", "READY_TO_ISSUE", "CODE_ISSUED", "IN_PROGRESS", "AWAITING_REVIEW", "REPORT_READY", "INTERPRETED"]
  },
  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  setQuery(event) { this.setData({ query: event.detail.value || "" }); },
  setStatus(event) { this.setData({ statusIndex: Number(event.detail.value || 0) }); this.load(); },
  load() {
    this.setData({ loading: true });
    const status = this.data.statusValues[this.data.statusIndex] || "OPEN";
    return api.requestStaff(`/api/miniapp/staff/academic-assessment-requests?status=${encodeURIComponent(status)}&q=${encodeURIComponent(this.data.query || "")}&limit=80`, { timeout: 20000 })
      .then((data) => this.setData({ requests: data.requests || [], summary: data.summary || {} }))
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },
  openRequest(event) { wx.navigateTo({ url: "/pages/staff-assessment-request-detail/staff-assessment-request-detail?id=" + encodeURIComponent(event.currentTarget.dataset.id) }); }
});
