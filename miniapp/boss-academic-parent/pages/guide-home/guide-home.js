const api = require("../../utils/api");

Page({
  data: {
    loading: true,
    version: "",
    schools: [],
    pathways: [],
    popularSchools: [],
    planCount: 0
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    const favorites = wx.getStorageSync("schoolGuideFavorites");
    this.setData({ planCount: Array.isArray(favorites) ? favorites.length : 0 });
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh());
  },

  loadData() {
    this.setData({ loading: true });
    return api.request("/api/public/school-guide/catalog?v=r334")
      .then((data) => this.setData({
        version: data.version || "",
        schools: data.schools || [],
        pathways: data.pathways || [],
        popularSchools: (data.schoolGroups || data.schools || []).filter((item) => item.editorialTier === 1 && item.dataStatus === "VERIFIED").slice(0, 3)
      }))
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  goSchools() {
    wx.navigateTo({ url: "/pages/guide-schools/guide-schools" });
  },

  goAssessment() {
    wx.navigateTo({ url: "/pages/guide-assessment/guide-assessment" });
  },

  goAcademicAssessment() {
    wx.navigateTo({ url: "/pages/guide-academic-assessment/guide-academic-assessment" });
  },

  goAssessmentHub() {
    wx.navigateTo({ url: "/pages/guide-assessments/guide-assessments" });
  },

  goPathways() {
    wx.pageScrollTo({ selector: "#admission-pathways", duration: 320 });
  },

  goCompare() {
    wx.navigateTo({ url: "/pages/guide-compare/guide-compare" });
  },

  goConsult() {
    wx.navigateTo({ url: "/pages/guide-consult/guide-consult" });
  },

  goCases() {
    wx.navigateTo({ url: "/pages/guide-cases/guide-cases" });
  },

  goPlan() {
    wx.navigateTo({ url: "/pages/guide-plan/guide-plan" });
  },

  openSchool(event) {
    wx.navigateTo({ url: "/pages/guide-school-detail/guide-school-detail?slug=" + encodeURIComponent(event.currentTarget.dataset.slug) });
  },

  openPathway(event) {
    wx.navigateTo({ url: "/pages/guide-pathway/guide-pathway?slug=" + encodeURIComponent(event.currentTarget.dataset.slug) });
  },

  onShareAppMessage() {
    return {
      title: "新加坡学校指南｜先看清路径，再选择学校",
      path: "/pages/guide-home/guide-home"
    };
  }
});
