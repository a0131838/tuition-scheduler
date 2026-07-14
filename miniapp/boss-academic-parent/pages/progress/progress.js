const api = require("../../utils/api");

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
    timeline: []
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
    this.setData({ loading: true, error: "" });
    return api.request(`/api/miniapp/students/${studentId}/service-progress`)
      .then((data) => {
        this.setData({
          student: data.student || {},
          service: data.service || {},
          period: data.period || {},
          summary: data.summary || {},
          permissions: data.permissions || {},
          responsiblePerson: data.responsiblePerson || "博思服务团队",
          nextStep: data.nextStep || {},
          nextSession: data.nextSession || null,
          care: data.care || {},
          parentActions: data.parentActions || [],
          timeline: data.timeline || []
        });
      })
      .catch((err) => this.setData({ error: err.message || "服务进度加载失败" }))
      .finally(() => this.setData({ loading: false }));
  },

  goSchedule() {
    wx.switchTab({ url: "/pages/schedule/schedule" });
  },

  goFeedbacks() {
    wx.navigateTo({ url: "/pages/feedbacks/feedbacks" });
  },

  goRequests() {
    wx.switchTab({ url: "/pages/requests/requests" });
  },

  goNewRequest() {
    wx.navigateTo({ url: "/pages/request-new/request-new" });
  }
});
