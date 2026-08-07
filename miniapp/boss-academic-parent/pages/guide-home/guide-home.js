const api = require("../../utils/api");
const POPULAR_COMPARE_SLUGS = [
  "singapore-american-school",
  "dulwich-college-singapore-8",
  "united-world-college-of-south-east-asia-38",
  "tanglin-trust-school-36",
  "north-london-collegiate-school-singapore-21",
  "acs-international-singapore-1",
  "hwa-chong-international-school-16",
  "st-joseph-s-institution-international-ltd-34"
];
const HOME_PATHWAY_SLUGS = ["aeis-primary", "aeis-secondary", "s-aeis", "international-school-direct"];
const SCHOOL_IDENTITIES = {
  "singapore-american-school": { shortMark: "SAS", tone: "navy" },
  "dulwich-college-singapore-8": { shortMark: "DCSG", tone: "red" },
  "united-world-college-of-south-east-asia-38": { shortMark: "UWC", tone: "blue" },
  "tanglin-trust-school-36": { shortMark: "TTS", tone: "green" },
  "north-london-collegiate-school-singapore-21": { shortMark: "NLCS", tone: "gold" },
  "acs-international-singapore-1": { shortMark: "ACS", tone: "navy" },
  "hwa-chong-international-school-16": { shortMark: "HCIS", tone: "crimson" },
  "st-joseph-s-institution-international-ltd-34": { shortMark: "SJI", tone: "burgundy" }
};

Page({
  data: {
    loading: true,
    version: "",
    schools: [],
    pathways: [],
    popularSchools: [],
    planCount: 0
  },

  onLoad(options) {
    this.loadData();
    if (options && options.entry === "assessment") {
      wx.nextTick(() => wx.navigateTo({ url: "/pages/guide-academic-assessment/guide-academic-assessment" }));
    }
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
    return api.request("/api/public/school-guide/catalog?v=r345")
      .then((data) => {
        const schoolGroups = data.schoolGroups || data.schools || [];
        const pathways = data.pathways || [];
        this.setData({
        version: data.version || "",
        schools: data.schools || [],
        pathways: HOME_PATHWAY_SLUGS.map((slug) => pathways.find((item) => item.slug === slug)).filter(Boolean),
        popularSchools: POPULAR_COMPARE_SLUGS.map((slug) => schoolGroups.find((item) => item.slug === slug || (item.memberSlugs || []).includes(slug)))
          .filter(Boolean)
          .map((item) => {
            const identity = SCHOOL_IDENTITIES[item.slug] || { shortMark: String(item.nameZh || item.name || "校").slice(0, 2), tone: "navy" };
            return Object.assign({}, item, identity, { logoSrc: "" });
          })
      });
      })
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
    wx.navigateTo({ url: "/pages/guide-compare/guide-compare?preset=popular" });
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
