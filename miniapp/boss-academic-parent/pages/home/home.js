const api = require("../../utils/api");
const presentation = require("../../utils/parent-presentation");

function singaporeTimeText(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "刚刚";
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const nowShifted = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const sameDay = shifted.toISOString().slice(0, 10) === nowShifted.toISOString().slice(0, 10);
  const time = `${String(shifted.getUTCHours()).padStart(2, "0")}:${String(shifted.getUTCMinutes()).padStart(2, "0")}`;
  return sameDay ? `今天 ${time}` : `${shifted.getUTCMonth() + 1}月${shifted.getUTCDate()}日 ${time}`;
}

function latestUpdate(progress, home) {
  const careUpdate = progress.care && progress.care.latestPublishedUpdate;
  if (careUpdate) return { kind: careUpdate.kind || "服务动态", title: careUpdate.title, summary: careUpdate.summary, timeText: careUpdate.occurredAtText || singaporeTimeText(careUpdate.occurredAt) };
  if (home.latestFeedback) return { kind: "课后反馈", title: `${home.latestFeedback.teacherName || "老师"}已发布反馈`, summary: home.latestFeedback.summary || "本次课程反馈已更新", timeText: singaporeTimeText(home.latestFeedback.sessionStartAt) };
  const item = (progress.timeline || [])[0];
  if (item) return { kind: item.kindLabel || "服务动态", title: item.title, summary: item.summary, timeText: item.occurredAtText || singaporeTimeText(item.occurredAt) };
  return { kind: "服务动态", title: "当前服务按计划推进", summary: "有新的课程、反馈或服务进展后会在这里更新。", timeText: "等待更新" };
}

function primaryAction(progress, monthly) {
  const parentAction = (progress.parentActions || [])[0];
  if (parentAction) return { type: "CARE", title: parentAction.summary, meta: parentAction.dueAtText ? `请于 ${parentAction.dueAtText} 前处理` : "服务团队正在等待您的回复" };
  if (monthly.pendingCount) return { type: "MONTHLY", title: `${monthly.month || "下月"}排课还有 ${monthly.pendingCount} 项待确认`, meta: monthly.dueText ? `请于 ${monthly.dueText} 前完成` : "点击确认安排" };
  const report = progress.care && progress.care.latestReport;
  if (report && !report.acknowledged) return { type: "REPORT", title: `请确认收到《${report.title}》`, meta: report.periodLabel || "最新正式报告" };
  return null;
}

Page({
  data: {
    loading: true,
    error: "",
    student: {},
    permissions: {},
    summary: {},
    care: {},
    nextSession: null,
    latestUpdate: {},
    nextUpdateText: "",
    parentStatus: presentation.parentStatus(null),
    primaryAction: null,
    freshness: {},
    lessonBalanceText: "暂无剩余课时", hasFormalReports: false,
    lastUpdatedText: "刚刚"
  },

  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },

  load() {
    const studentId = api.requireStudentPage();
    if (!studentId) return Promise.resolve();
    const loadSeq = (this.loadSeq || 0) + 1;
    this.loadSeq = loadSeq;
    this.setData({ loading: true, error: "", student: {}, care: {} });
    return api.request(`/api/miniapp/students/${studentId}/dashboard`)
      .then((data) => {
        if (loadSeq !== this.loadSeq) return;
        const home = data.home || {};
        const progress = data.progress || {};
        const permissions = home.permissions || progress.permissions || {};
        const care = progress.care || {};
        this.setData({
          student: home.student || progress.student || {},
          permissions,
          summary: progress.summary || {},
          care,
          nextSession: home.nextSession || progress.nextSession || null,
          latestUpdate: latestUpdate(progress, home),
          nextUpdateText: care.active && care.nextUpdate ? care.nextUpdate.dateText : "",
          parentStatus: presentation.parentStatus((home.student || {}).academicRiskLevel, permissions.canViewReports),
          hasFormalReports: Boolean(permissions.canViewReports && (care.active || (home.student || {}).servicePlanType === "ACADEMIC_MANAGEMENT")),
          primaryAction: primaryAction(progress, data.monthlyScheduling || {}),
          freshness: data.freshness || {},
          lessonBalanceText: presentation.lessonBalance((home.financeSummary || {}).totalRemainingMinutes),
          lastUpdatedText: singaporeTimeText((data.freshness || {}).serverTime),
          loading: false
        });
        api.request(`/api/miniapp/students/${studentId}/dashboard`, { method: "POST" }).catch(() => null);
      })
      .catch((err) => {
        if (loadSeq === this.loadSeq) this.setData({ loading: false, error: err.message || "家长看板加载失败" });
      });
  },

  goStudents() { wx.switchTab({ url: "/pages/students/students" }); },
  goProgress() { wx.switchTab({ url: "/pages/progress/progress" }); },
  goSchedule() { wx.switchTab({ url: "/pages/schedule/schedule" }); },
  goFeedbacks() { wx.navigateTo({ url: "/pages/feedbacks/feedbacks" }); },
  goFinance() { wx.navigateTo({ url: "/pages/finance/finance" }); },
  goReports() { wx.navigateTo({ url: "/pages/care-reports/care-reports" }); },
  goNewRequest() { wx.navigateTo({ url: "/pages/request-new/request-new" }); },
  goPrimaryAction() {
    if (!this.data.primaryAction) return;
    if (this.data.primaryAction.type === "MONTHLY") wx.navigateTo({ url: "/pages/monthly-scheduling/monthly-scheduling" });
    else if (this.data.primaryAction.type === "REPORT") this.goReports();
    else this.goProgress();
  }
});
