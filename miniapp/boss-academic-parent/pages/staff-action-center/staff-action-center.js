const api = require("../../utils/api");

function present(data, loading) {
  const total = Number(data.total || 0);
  const items = (data.items || []).map((item) => Object.assign({}, item, {
    cardClass: item.urgent && item.count ? "alert" : "",
    countText: item.count || "✓"
  }));
  return {
    total,
    items,
    summaryTitle: total ? "项事务等待处理" : "当前没有待办",
    showItems: items.length > 0,
    showEmpty: !loading && items.length === 0
  };
}

Page({
  data: { loading: false, total: 0, items: [], summaryTitle: "当前没有待办", showItems: false, showEmpty: false, roleMode: "STAFF", capabilities: {} },
  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  load() {
    this.setData({ loading: true });
    return api.requestStaff("/api/miniapp/staff/action-center", { timeout: 30000 })
      .then((data) => this.setData(Object.assign(present(data, false), { roleMode: data.roleMode || "STAFF", capabilities: data.capabilities || {} })))
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false, showEmpty: !this.data.items.length }));
  },
  openItem(e) {
    const target = e.currentTarget.dataset.target;
    const map = {
      requests: "/pages/staff-requests/staff-requests",
      communications: "/pages/staff-communications/staff-communications",
      approvals: "/pages/staff-approvals/staff-approvals",
      leads: "/pages/staff-leads/staff-leads",
      "teacher-reports": "/pages/staff-teacher-reports/staff-teacher-reports",
      "teacher-expenses": "/pages/staff-teacher-expenses/staff-teacher-expenses",
      "teacher-payroll": "/pages/staff-teacher-payroll/staff-teacher-payroll",
      "teacher-schedule": "/pages/staff-schedule/staff-schedule",
      "teacher-history": "/pages/staff-teacher-history/staff-teacher-history",
      "teacher-student-feedbacks": "/pages/staff-teacher-feedbacks/staff-teacher-feedbacks"
    };
    wx.navigateTo({ url: map[target] || "/pages/staff-home/staff-home" });
  },
  openStudents() { wx.navigateTo({ url: "/pages/staff-student-workspace/staff-student-workspace" }); },
  openOperations() { wx.navigateTo({ url: "/pages/staff-operations/staff-operations" }); }
});
