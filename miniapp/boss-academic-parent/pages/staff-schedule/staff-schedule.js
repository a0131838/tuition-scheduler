const api = require("../../utils/api");

const scopes = [
  { label: "全部课程", value: "all" },
  { label: "我的课程", value: "mine" }
];

function todayStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + (offsetDays || 0));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

Page({
  data: {
    scopes,
    scopeIndex: 0,
    date: todayStr(0),
    sessions: [],
    summary: {},
    summaryVisibleSessions: 0,
    summaryVisibleStudentCount: 0,
    teacherOnly: false,
    loading: false
  },

  onShow() {
    this.load();
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },

  load() {
    const scope = scopes[this.data.scopeIndex].value;
    const qs = `date=${encodeURIComponent(this.data.date)}&scope=${encodeURIComponent(scope)}`;
    this.setData({ loading: true });
    return api.requestStaff("/api/miniapp/staff/schedule?" + qs)
      .then((data) => {
        const summary = data.summary || {};
        const sessions = (data.sessions || []).map((item) => {
          const teacher = item.teacher || {};
          return Object.assign({}, item, {
            teacherNameText: teacher.name || "-",
            studentTextValue: item.studentText || "-",
            locationTextValue: item.locationText || "-"
          });
        });
        this.setData({
          sessions,
          summary,
          summaryVisibleSessions: summary.visibleSessions || 0,
          summaryVisibleStudentCount: summary.visibleStudentCount || 0,
          teacherOnly: Boolean(data.teacherOnly),
          scopeIndex: data.teacherOnly ? 1 : this.data.scopeIndex
        });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  changeScope(e) {
    this.setData({ scopeIndex: Number(e.detail.value || 0) });
    this.load();
  },

  setToday() {
    this.setData({ date: todayStr(0) });
    this.load();
  },

  setTomorrow() {
    this.setData({ date: todayStr(1) });
    this.load();
  },

  changeDate(e) {
    this.setData({ date: e.detail.value });
    this.load();
  },

  openSession(e) {
    wx.navigateTo({ url: "/pages/staff-session-detail/staff-session-detail?id=" + e.currentTarget.dataset.id });
  }
});
