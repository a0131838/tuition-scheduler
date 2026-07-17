const api = require("../../utils/api");
const presentation = require("../../utils/parent-presentation");

Page({
  data: {
    loading: true,
    error: "",
    student: {},
    service: {},
    period: {},
    summary: {},
    permissions: {},
    responsiblePerson: "",
    nextStep: {},
    nextSession: null,
    care: {},
    parentActions: [],
    timeline: [],
    parentStatus: presentation.parentStatus(null),
    metricClass: "three"
  },

  onShow() {
    this.load();
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },

  load() {
    const studentId = api.requireStudentPage();
    if (!studentId) return Promise.resolve();
    const loadSeq = (this.loadSeq || 0) + 1;
    this.loadSeq = loadSeq;
    this.setData({ loading: true, error: "" });
    return api.request(`/api/miniapp/students/${studentId}/service-progress`)
      .then((data) => {
        if (loadSeq !== this.loadSeq) return;
        const permissions = data.permissions || {};
        const metricCount = [permissions.canViewSchedule, permissions.canViewFeedback, permissions.canCreateRequests].filter(Boolean).length;
        this.setData({
          student: data.student || {},
          service: data.service || {},
          period: data.period || {},
          summary: data.summary || {},
          permissions,
          responsiblePerson: data.responsiblePerson || "博思服务团队",
          nextStep: data.nextStep || {},
          nextSession: data.nextSession || null,
          care: data.care || {},
          parentActions: data.parentActions || [],
          timeline: data.timeline || [],
          parentStatus: presentation.parentStatus(
            (data.student || {}).riskLabel,
            permissions.canViewReports
          ),
          metricClass: metricCount <= 1 ? "one" : metricCount === 2 ? "two" : "three"
        });
      })
      .catch((err) => {
        if (loadSeq === this.loadSeq) this.setData({ error: err.message || "服务进度加载失败" });
      })
      .finally(() => {
        if (loadSeq === this.loadSeq) this.setData({ loading: false });
      });
  },

  goSchedule() {
    wx.switchTab({ url: "/pages/schedule/schedule" });
  },

  goFeedbacks() {
    wx.navigateTo({ url: "/pages/feedbacks/feedbacks" });
  },

  goCareReports() {
    wx.navigateTo({ url: "/pages/care-reports/care-reports" });
  },

  goRequests() {
    wx.navigateTo({ url: "/pages/requests/requests" });
  },

  goNewRequest() {
    wx.navigateTo({ url: "/pages/request-new/request-new" });
  }
});
