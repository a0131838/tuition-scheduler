const api = require("../../utils/api");

Page({
  data: {
    student: {},
    nextSession: null,
    latestFeedback: null,
    financeSummary: {},
    requestSummary: {},
    subscriptionGroups: [],
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
    const subscriptionTask = api.request("/api/miniapp/subscriptions/intent")
      .then((data) => {
        const groups = (data.groups || []).filter((group) => group.configured);
        this.setData({ subscriptionGroups: groups, hasSubscriptionGroups: groups.length > 0 });
      })
      .catch(() => this.setData({ subscriptionGroups: [], hasSubscriptionGroups: false }));
    return Promise.allSettled([homeTask, subscriptionTask]);
  },

  goFeedbacks() {
    wx.navigateTo({ url: "/pages/feedbacks/feedbacks" });
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
        api.request("/api/miniapp/subscriptions/intent", { method: "POST", data: { groupKey: key, result } })
          .then((data) => api.toast(data.message || "提醒设置已记录"))
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
