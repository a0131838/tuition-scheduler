const api = require("../../utils/api");

const scopes = [
  { label: "全部学生", value: "all" },
  { label: "待排课关注", value: "attention" },
  { label: "首次排课", value: "first" },
  { label: "待续排", value: "renewal" },
  { label: "已有未来课程", value: "scheduled" },
  { label: "待处理前置条件", value: "blocked" }
];

let searchTimer = null;
let requestSeq = 0;

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
    attentionText: "0",
    scheduledText: "0",
    canSchedule: false,
    loading: false,
    preferredDate: "",
    preferredTime: ""
  },

  onLoad(options) {
    this.setData({
      preferredDate: /^\d{4}-\d{2}-\d{2}$/.test(options.date || "") ? options.date : "",
      preferredTime: /^\d{2}:\d{2}$/.test(options.time || "") ? options.time : ""
    });
  },

  onShow() {
    this.load();
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },

  onUnload() {
    if (searchTimer) clearTimeout(searchTimer);
    requestSeq += 1;
  },

  load() {
    const seq = ++requestSeq;
    const query = this.data.query.trim();
    const scope = scopes[this.data.scopeIndex].value;
    const path = "/api/miniapp/staff/first-scheduling?limit=150&scope=" + encodeURIComponent(scope) + (query ? "&q=" + encodeURIComponent(query) : "");
    this.setData({ loading: true });
    return api.requestStaff(path, { timeout: 20000 })
      .then((data) => {
        if (seq !== requestSeq) return;
        const summary = data.summary || {};
        this.setData({
          candidates: data.candidates || [],
          summary,
          totalText: String(summary.total || 0),
          readyText: String(summary.ready || 0),
          blockedText: String(summary.blocked || 0),
          attentionText: String(summary.attention || 0),
          scheduledText: String(summary.scheduled || 0),
          canSchedule: Boolean(data.capabilities && data.capabilities.canSchedule)
        });
        this.applyScope();
      })
      .catch((err) => {
        if (seq === requestSeq) api.toast(err.message);
      })
      .finally(() => {
        if (seq === requestSeq) this.setData({ loading: false });
      });
  },

  applyScope() {
    this.setData({ visibleCandidates: this.data.candidates || [] });
  },

  changeScope(e) {
    this.setData({ scopeIndex: Number(e.detail.value || 0) });
    this.load();
  },

  inputQuery(e) {
    this.setData({ query: e.detail.value || "" });
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => this.load(), 350);
  },

  search() {
    if (searchTimer) clearTimeout(searchTimer);
    this.load();
  },

  clearSearch() {
    if (searchTimer) clearTimeout(searchTimer);
    this.setData({ query: "" });
    this.load();
  },

  studentSchedulingUrl(studentId) {
    let url = "/pages/staff-student-scheduling/staff-student-scheduling?id=" + encodeURIComponent(studentId);
    if (this.data.preferredDate) url += "&date=" + encodeURIComponent(this.data.preferredDate);
    if (this.data.preferredTime) url += "&time=" + encodeURIComponent(this.data.preferredTime);
    return url;
  },

  openCandidate(e) {
    const studentId = e.currentTarget.dataset.id;
    if (!studentId) return;
    wx.navigateTo({ url: this.studentSchedulingUrl(studentId) });
  }
});
