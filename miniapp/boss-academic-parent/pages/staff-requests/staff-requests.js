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
const types = ["全部类型", "排课要求", "请假/取消", "给老师的话", "投诉", "普通反馈", "财务问题", "学校事务", "其他"];

Page({
  data: {
    owners,
    statuses,
    types,
    ownerIndex: 0,
    statusIndex: 0,
    typeIndex: 0,
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
    const type = this.data.typeIndex > 0 ? types[this.data.typeIndex] : "";
    const query = [];
    if (owner) query.push("owner=" + encodeURIComponent(owner));
    if (status) query.push("status=" + encodeURIComponent(status));
    if (type) query.push("type=" + encodeURIComponent(type));
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

  changeType(e) {
    this.setData({ typeIndex: Number(e.detail.value || 0) });
    this.load();
  },

  openDetail(e) {
    wx.navigateTo({ url: "/pages/staff-request-detail/staff-request-detail?id=" + e.currentTarget.dataset.id });
  }
});
