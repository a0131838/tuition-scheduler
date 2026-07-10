const api = require("../../utils/api");

const owners = ["全部负责人", "Jasmine", "Eva", "Emily"];
const statuses = [
  { label: "未完成", value: "" },
  { label: "已收到", value: "Need Info" },
  { label: "等老师", value: "Waiting Teacher" },
  { label: "等家长", value: "Waiting Parent" },
  { label: "已确认", value: "Confirmed" },
  { label: "已完成", value: "Completed" }
];

Page({
  data: {
    owners,
    statuses,
    ownerIndex: 0,
    statusIndex: 0,
    requests: [],
    loading: false
  },

  onShow() {
    this.load();
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },

  load() {
    const owner = this.data.ownerIndex > 0 ? owners[this.data.ownerIndex] : "";
    const status = statuses[this.data.statusIndex].value;
    const query = [];
    if (owner) query.push("owner=" + encodeURIComponent(owner));
    if (status) query.push("status=" + encodeURIComponent(status));
    if (status) query.push("includeDone=true");
    query.push("limit=100");

    this.setData({ loading: true });
    return api.requestStaff("/api/miniapp/staff/parent-requests?" + query.join("&"))
      .then((data) => this.setData({ requests: data.requests || [] }))
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  changeOwner(e) {
    this.setData({ ownerIndex: Number(e.detail.value || 0) });
    this.load();
  },

  changeStatus(e) {
    this.setData({ statusIndex: Number(e.detail.value || 0) });
    this.load();
  },

  openDetail(e) {
    wx.navigateTo({ url: "/pages/staff-request-detail/staff-request-detail?id=" + e.currentTarget.dataset.id });
  }
});
