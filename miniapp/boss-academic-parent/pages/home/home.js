const api = require("../../utils/api");

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
    subscriptionGroups: [],
    courseReminder: null,
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
    const homeTask = api.request(`/api/miniapp/students/${studentId}/home`)
      .then((data) => {
        this.setData({
          student: data.student || {},
          nextSession: data.nextSession || null,
          latestFeedback: data.latestFeedback || null,
          financeSummary: data.financeSummary || {},
          requestSummary: data.requestSummary || {}
        });
      })
      .catch((err) => api.toast(err.message));
    const subscriptionTask = api.request(`/api/miniapp/subscriptions/intent?studentId=${encodeURIComponent(studentId)}`)
      .then((data) => {
        const groups = (data.groups || []).filter((group) => group.configured);
        const actions = buildSubscriptionActions(groups);
        this.setData({ subscriptionGroups: actions, courseReminder: data.courseReminder || null, hasSubscriptionGroups: actions.length > 0 });
      })
      .catch(() => this.setData({ subscriptionGroups: [], courseReminder: null, hasSubscriptionGroups: false }));
    return Promise.allSettled([homeTask, subscriptionTask]);
  },

  goFeedbacks() {
    wx.navigateTo({ url: "/pages/feedbacks/feedbacks" });
  },

  goProgress() {
    wx.navigateTo({ url: "/pages/progress/progress" });
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
