const api = require("../../utils/api");
const presentation = require("../../utils/parent-presentation");

Page({
  data: {
    loading: true, error: "", viewMode: "updates", student: {}, service: {}, period: {}, summary: {}, permissions: {},
    responsiblePerson: "", nextStep: {}, care: {}, reassurance: {}, timeline: [], parentAction: null, detailsExpanded: false,
    parentStatus: presentation.parentStatus(null), lessonBalanceText: "暂无剩余课时", hasFormalReports: false
  },
  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  load() {
    const studentId = api.requireStudentPage();
    if (!studentId) return Promise.resolve();
    const loadSeq = (this.loadSeq || 0) + 1;
    this.loadSeq = loadSeq;
    this.setData({ loading: true, error: "" });
    return api.request(`/api/miniapp/students/${studentId}/dashboard`)
      .then((dashboard) => {
        if (loadSeq !== this.loadSeq) return;
        const data = dashboard.progress || {};
        const home = dashboard.home || {};
        const permissions = data.permissions || home.permissions || {};
        const hasFormalReports = Boolean(permissions.canViewReports && ((data.care || {}).active || (home.student || {}).servicePlanType === "ACADEMIC_MANAGEMENT"));
        this.setData({
          student: data.student || home.student || {}, service: data.service || {}, period: data.period || {}, summary: data.summary || {}, permissions,
          responsiblePerson: data.responsiblePerson || "博思服务团队", nextStep: data.nextStep || {}, care: data.care || {}, reassurance: data.reassurance || {},
          timeline: data.timeline || [], parentAction: (data.parentActions || [])[0] || null,
          parentStatus: presentation.parentStatus((home.student || {}).academicRiskLevel || (data.student || {}).riskLabel, permissions.canViewReports),
          lessonBalanceText: presentation.lessonBalance((home.financeSummary || {}).totalRemainingMinutes),
          loading: false,
          hasFormalReports,
          viewMode: !hasFormalReports && this.data.viewMode === "reports" ? "updates" : this.data.viewMode
        });
      })
      .catch((err) => { if (loadSeq === this.loadSeq) this.setData({ loading: false, error: err.message || "服务进度加载失败" }); });
  },
  changeView(e) { this.setData({ viewMode: e.currentTarget.dataset.mode || "updates" }); },
  toggleDetails() { this.setData({ detailsExpanded: !this.data.detailsExpanded }); },
  goSchedule() { wx.switchTab({ url: "/pages/schedule/schedule" }); },
  goFeedbacks() { wx.navigateTo({ url: "/pages/feedbacks/feedbacks" }); },
  goCareReports() { wx.navigateTo({ url: "/pages/care-reports/care-reports" }); },
  openLatestReport() { const report = this.data.care.latestReport; if (report && report.id) wx.navigateTo({ url: `/pages/care-report-detail/care-report-detail?id=${report.id}` }); },
  goRequests() { wx.navigateTo({ url: "/pages/requests/requests" }); },
  goNewRequest() { wx.navigateTo({ url: "/pages/request-new/request-new" }); },
  goFinance() { wx.navigateTo({ url: "/pages/finance/finance" }); }
});
