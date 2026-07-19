const api = require("../../utils/api");

function valueOr(value, fallback) { return value || fallback; }

function presentWorkspace(data) {
  const student = Object.assign({}, data.student, {
    gradeDisplay: valueOr(data.student.grade, "未填年级"),
    schoolDisplay: data.student.school || data.student.targetSchool || "未填学校"
  });
  const parents = (data.parents || []).map((item) => Object.assign({}, item, {
    primaryText: item.primary ? "· 主要联系人" : "",
    phoneDisplay: valueOr(item.phone, "-"),
    groupNameDisplay: valueOr(item.groupName, "-"),
    ownerDisplay: valueOr(item.owner, "-")
  }));
  const packages = (data.packages || []).map((item) => Object.assign({}, item, {
    cardClass: item.lowBalance ? "alert" : "",
    validToDisplay: valueOr(item.validTo, "无固定日期"),
    balanceDisplay: item.remainingHours === null ? "包月" : item.remainingHours + "h"
  }));
  const openTickets = (data.openTickets || []).map((item) => Object.assign({}, item, {
    cardClass: item.dueText ? "alert" : "",
    ownerDisplay: valueOr(item.owner, "未分配"),
    nextActionDisplay: valueOr(item.nextAction, "待跟进")
  }));
  return Object.assign({}, data, {
    student,
    parents,
    packages,
    openTickets,
    hasRisks: (data.riskFlags || []).length > 0,
    hasParents: parents.length > 0,
    noPackages: packages.length === 0,
    noUpcoming: (data.upcoming || []).length === 0,
    noOpenTickets: openTickets.length === 0,
    noFeedbacks: (data.feedbacks || []).length === 0
  });
}

Page({
  data: { query: "", searching: false, searched: false, results: [], showSearchEmpty: false, loading: false, noWorkspace: true, workspace: null },
  onLoad(options) { if (options.id) this.loadWorkspace(options.id); },
  onPullDownRefresh() {
    const id = this.data.workspace && this.data.workspace.student && this.data.workspace.student.id;
    const task = id ? this.loadWorkspace(id) : Promise.resolve();
    task.finally(() => wx.stopPullDownRefresh());
  },
  inputQuery(e) { this.setData({ query: e.detail.value || "" }); },
  search() {
    const q = this.data.query.trim();
    if (q.length < 2) return api.toast("请输入至少两个字");
    this.setData({ searching: true, workspace: null, noWorkspace: true, searched: true, showSearchEmpty: false });
    api.requestStaff("/api/miniapp/staff/students?q=" + encodeURIComponent(q), { timeout: 15000 })
      .then((data) => {
        const results = (data.students || []).map((item) => Object.assign({}, item, { gradeDisplay: valueOr(item.grade, "未填年级"), schoolDisplay: item.school || item.targetSchool || "未填学校" }));
        this.setData({ results, showSearchEmpty: results.length === 0 });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ searching: false }));
  },
  selectStudent(e) { this.loadWorkspace(e.currentTarget.dataset.id); },
  loadWorkspace(id) {
    if (!id) return Promise.resolve();
    this.setData({ loading: true, results: [] });
    return api.requestStaff("/api/miniapp/staff/students/" + encodeURIComponent(id) + "/workspace", { timeout: 30000 })
      .then((data) => this.setData({ workspace: presentWorkspace(data), noWorkspace: false, showSearchEmpty: false, query: data.student ? data.student.name : this.data.query }))
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },
  clearWorkspace() { this.setData({ workspace: null, noWorkspace: true, query: "", results: [], searched: false, showSearchEmpty: false }); },
  openSession(e) { wx.navigateTo({ url: "/pages/staff-session-detail/staff-session-detail?id=" + encodeURIComponent(e.currentTarget.dataset.id) }); },
  openTicket(e) { wx.navigateTo({ url: "/pages/staff-request-detail/staff-request-detail?id=" + encodeURIComponent(e.currentTarget.dataset.id) }); },
  openSchedule() {
    const id = this.data.workspace.student.id;
    wx.navigateTo({ url: "/pages/staff-student-scheduling/staff-student-scheduling?id=" + encodeURIComponent(id) });
  },
  createRequest() {
    const student = this.data.workspace.student;
    wx.navigateTo({ url: "/pages/staff-request-new/staff-request-new?studentId=" + encodeURIComponent(student.id) + "&studentLabel=" + encodeURIComponent([student.name, student.grade].filter(Boolean).join(" / ")) });
  }
});
