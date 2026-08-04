const api = require("../../utils/api");
const presentation = require("../../utils/parent-presentation");

function buildSubscriptionActions(groups) {
  const labels = {
    service: ["开启请求状态提醒", "开启待付提醒"],
    documents: ["开启发票提醒", "开启收据提醒"],
    learning: ["开启课后反馈提醒"]
  };
  return groups.reduce((actions, group) => {
    if (!group.configured) return actions;
    if (group.key === "course") {
      actions.push(Object.assign({}, group, { groupKey: group.key }));
      return actions;
    }
    (group.templateIds || []).forEach((templateId, index) => {
      actions.push({
        key: `${group.key}:${index}`,
        groupKey: group.key,
        label: (labels[group.key] || [])[index] || group.label,
        templateIds: [templateId]
      });
    });
    return actions;
  }, []);
}

Page({
  data: {
    student: {},
    nextSession: null,
    latestFeedback: null,
    financeSummary: {},
    requestSummary: {},
    requestCountText: "-",
    permissions: {},
    metricClass: "three",
    serviceSummary: {},
    progressAvailable: false,
    completedLessonText: "-",
    feedbackCountText: "-",
    nextStep: {},
    care: {},
    parentActions: [],
    primaryParentAction: null,
    parentStatus: presentation.parentStatus(null),
    lessonBalanceText: "暂无剩余课时",
    subscriptionGroups: [],
    courseReminder: null,
    monthlyScheduling: null,
    hasMonthlyScheduling: false,
    hasSubscriptionGroups: false,
    subscriptionLoadingKey: "",
    subscriptionLoading: false
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
    this.setData({
      student: {},
      nextSession: null,
      latestFeedback: null,
      financeSummary: {},
      requestSummary: {},
      requestCountText: "-",
      permissions: {},
      metricClass: "three",
      parentStatus: presentation.parentStatus(null, false),
      serviceSummary: {},
      nextStep: {},
      care: {},
      parentActions: [],
      primaryParentAction: null,
      progressAvailable: false,
      completedLessonText: "-",
      feedbackCountText: "-",
      lessonBalanceText: "暂无剩余课时",
      subscriptionGroups: [],
      courseReminder: null,
      monthlyScheduling: null,
      hasMonthlyScheduling: false,
      hasSubscriptionGroups: false
    });
    const homeTask = api.request(`/api/miniapp/students/${studentId}/home`)
      .then((data) => {
        if (loadSeq !== this.loadSeq) return;
        const permissions = data.permissions || {};
        const metricCount = [permissions.canViewSchedule, permissions.canViewFeedback, permissions.canCreateRequests].filter(Boolean).length;
        this.setData({
          student: data.student || {},
          nextSession: data.nextSession || null,
          latestFeedback: data.latestFeedback || null,
          financeSummary: data.financeSummary || {},
          requestSummary: data.requestSummary || {},
          requestCountText: permissions.canCreateRequests
            ? String((data.requestSummary || {}).openCount || 0)
            : "-",
          permissions,
          metricClass: metricCount <= 1 ? "one" : metricCount === 2 ? "two" : "three",
          parentStatus: presentation.parentStatus(
            (data.student || {}).academicRiskLevel,
            permissions.canViewReports
          ),
          lessonBalanceText: presentation.lessonBalance((data.financeSummary || {}).totalRemainingMinutes)
        });
      })
      .catch((err) => {
        if (loadSeq === this.loadSeq) api.toast(err.message);
      });
    const progressTask = api.request(`/api/miniapp/students/${studentId}/service-progress`)
      .then((data) => {
        if (loadSeq !== this.loadSeq) return;
        this.setData({
          serviceSummary: data.summary || {},
          nextStep: data.nextStep || {},
          care: data.care || {},
          parentActions: data.parentActions || [],
          primaryParentAction: (data.parentActions || [])[0] || null,
          progressAvailable: true,
          completedLessonText: String((data.summary || {}).completedLessons || 0),
          feedbackCountText: (data.permissions || {}).canViewFeedback
            ? String((data.summary || {}).feedbackCount || 0)
            : "-"
        });
      })
      .catch(() => {
        if (loadSeq !== this.loadSeq) return;
        this.setData({
          serviceSummary: {}, nextStep: {}, care: {}, parentActions: [], primaryParentAction: null,
          progressAvailable: false, completedLessonText: "-", feedbackCountText: "-"
        });
      });
    const subscriptionTask = api.request(`/api/miniapp/subscriptions/intent?studentId=${encodeURIComponent(studentId)}`)
      .then((data) => {
        if (loadSeq !== this.loadSeq) return;
        const groups = (data.groups || []).filter((group) => group.configured);
        const actions = buildSubscriptionActions(groups);
        this.setData({ subscriptionGroups: actions, courseReminder: data.courseReminder || null, hasSubscriptionGroups: actions.length > 0 });
      })
      .catch(() => {
        if (loadSeq === this.loadSeq) this.setData({ subscriptionGroups: [], courseReminder: null, hasSubscriptionGroups: false });
      });
    const monthlySchedulingTask = api.request("/api/miniapp/monthly-scheduling")
      .then((data) => {
        if (loadSeq !== this.loadSeq) return;
        const rows = data.items || [];
        const relevant = rows.filter((row) => row.student && row.student.id === studentId);
        const pending = relevant.filter((row) => !["SUBMITTED", "MATCHED", "SCHEDULED", "PAUSED"].includes(row.status));
        this.setData({
          hasMonthlyScheduling: relevant.length > 0,
          monthlyScheduling: relevant.length ? { month: relevant[0].month, total: relevant.length, pending: pending.length, dueText: relevant[0].dueText } : null
        });
      })
      .catch(() => {
        if (loadSeq === this.loadSeq) this.setData({ monthlyScheduling: null, hasMonthlyScheduling: false });
      });
    return Promise.allSettled([homeTask, progressTask, subscriptionTask, monthlySchedulingTask]);
  },

  goFeedbacks() {
    wx.navigateTo({ url: "/pages/feedbacks/feedbacks" });
  },

  goProgress() {
    wx.switchTab({ url: "/pages/progress/progress" });
  },

  goSchedule() {
    wx.switchTab({ url: "/pages/schedule/schedule" });
  },

  goMonthlyScheduling() {
    wx.navigateTo({ url: "/pages/monthly-scheduling/monthly-scheduling" });
  },

  goLatestReport() {
    const report = this.data.care.latestReport;
    if (report && report.id) {
      wx.navigateTo({ url: `/pages/care-report-detail/care-report-detail?id=${report.id}` });
      return;
    }
    wx.navigateTo({ url: "/pages/care-reports/care-reports" });
  },

  goNewRequest() {
    wx.navigateTo({ url: "/pages/request-new/request-new" });
  },

  goStudents() {
    wx.switchTab({ url: "/pages/students/students" });
  },

  requestSubscription(e) {
    const key = e.currentTarget.dataset.key;
    const group = this.data.subscriptionGroups.find((item) => item.key === key);
    if (!group || !group.templateIds || !group.templateIds.length || this.data.subscriptionLoadingKey) return;
    this.setData({ subscriptionLoadingKey: key, subscriptionLoading: true });
    wx.requestSubscribeMessage({
      tmplIds: group.templateIds.slice(0, 3),
      success: (result) => {
        const studentId = api.currentStudentId();
        api.request("/api/miniapp/subscriptions/intent", { method: "POST", data: { groupKey: group.groupKey || key, studentId, result } })
          .then((data) => {
            if (data.courseReminder) this.setData({ courseReminder: data.courseReminder });
            api.toast(data.message || "提醒设置已记录");
          })
          .catch((err) => api.toast(err.message))
          .finally(() => this.setData({ subscriptionLoadingKey: "", subscriptionLoading: false }));
      },
      fail: (err) => {
        api.toast(err.errMsg || "未能打开提醒授权");
        this.setData({ subscriptionLoadingKey: "", subscriptionLoading: false });
      }
    });
  }
});
