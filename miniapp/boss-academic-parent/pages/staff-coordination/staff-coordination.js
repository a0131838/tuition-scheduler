const api = require("../../utils/api");

const scopes = [
  { label: "全部开放", status: "", overdue: false },
  { label: "已逾期", status: "", overdue: true },
  { label: "等待家长", status: "Waiting Parent", overdue: false },
  { label: "等待老师", status: "Waiting Teacher", overdue: false },
  { label: "双方已确认", status: "Confirmed", overdue: false },
  { label: "异常升级", status: "Exception", overdue: false }
];
const owners = ["全部负责人", "Jasmine", "Eva", "Emily"];

Page({
  data: {
    scopes,
    owners,
    scopeIndex: 0,
    ownerIndex: 0,
    query: "",
    tickets: [],
    summary: {},
    totalOpenText: "0",
    overdueText: "0",
    loading: false
  },

  onShow() {
    this.load();
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },

  load() {
    const scope = scopes[this.data.scopeIndex];
    const owner = this.data.ownerIndex > 0 ? owners[this.data.ownerIndex] : "";
    const query = [];
    if (scope.status) query.push("status=" + encodeURIComponent(scope.status));
    if (scope.overdue) query.push("overdue=true");
    if (owner) query.push("owner=" + encodeURIComponent(owner));
    if (this.data.query.trim()) query.push("q=" + encodeURIComponent(this.data.query.trim()));
    query.push("limit=150");
    this.setData({ loading: true });
    return api.requestStaff("/api/miniapp/staff/scheduling-coordination?" + query.join("&"), { timeout: 20000 })
      .then((data) => {
        const summary = data.summary || {};
        this.setData({
          tickets: data.tickets || [],
          summary,
          totalOpenText: String(summary.totalOpen || 0),
          overdueText: String(summary.overdue || 0)
        });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  changeScope(e) {
    this.setData({ scopeIndex: Number(e.detail.value || 0) });
    this.load();
  },

  changeOwner(e) {
    this.setData({ ownerIndex: Number(e.detail.value || 0) });
    this.load();
  },

  inputQuery(e) {
    this.setData({ query: e.detail.value });
  },

  search() {
    this.load();
  },

  clearSearch() {
    this.setData({ query: "" });
    this.load();
  },

  openDetail(e) {
    wx.navigateTo({
      url: "/pages/staff-coordination-detail/staff-coordination-detail?id=" + encodeURIComponent(e.currentTarget.dataset.id)
    });
  }
});
