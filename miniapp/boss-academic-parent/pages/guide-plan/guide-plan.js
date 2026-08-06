const api = require("../../utils/api");
const favoritesKey = "schoolGuideFavorites";
const metaKey = "schoolGuidePlanMeta";

Page({
  data: { loading: true, schools: [], statusOptions: ["关注中", "准备咨询", "准备申请"] },
  onShow() { this.load(); },
  load() {
    const favorites = wx.getStorageSync(favoritesKey);
    const meta = wx.getStorageSync(metaKey) || {};
    api.request("/api/public/school-guide/catalog?v=r341").then((data) => {
      const groups = data.schoolGroups || data.schools || [];
      const selected = (Array.isArray(favorites) ? favorites : []).map((slug) => groups.find((school) => school.slug === slug || (school.memberSlugs || []).includes(slug))).filter(Boolean).filter((school, index, all) => all.findIndex((item) => item.slug === school.slug) === index).map((school) => ({
        ...school,
        status: (meta[school.slug] || {}).status || "关注中",
        note: (meta[school.slug] || {}).note || "",
        curriculumText: school.comparison ? school.comparison.curriculum : school.category,
        costText: school.costProfile ? "S$" + school.costProfile.fixedFirstYearLow.toLocaleString() + "–S$" + school.costProfile.fixedFirstYearHigh.toLocaleString() : "费用待查看"
      }));
      this.setData({ schools: selected });
    }).catch((err) => api.toast(err.message)).finally(() => this.setData({ loading: false }));
  },
  openSchool(event) { wx.navigateTo({ url: "/pages/guide-school-detail/guide-school-detail?slug=" + encodeURIComponent(event.currentTarget.dataset.slug) }); },
  setStatus(event) {
    const slug = event.currentTarget.dataset.slug;
    const status = this.data.statusOptions[Number(event.detail.value)];
    const meta = wx.getStorageSync(metaKey) || {};
    meta[slug] = { ...(meta[slug] || {}), status };
    wx.setStorageSync(metaKey, meta); this.load();
  },
  setNote(event) {
    const slug = event.currentTarget.dataset.slug;
    const meta = wx.getStorageSync(metaKey) || {};
    meta[slug] = { ...(meta[slug] || {}), note: event.detail.value };
    wx.setStorageSync(metaKey, meta);
  },
  remove(event) {
    const slug = event.currentTarget.dataset.slug;
    const favorites = wx.getStorageSync(favoritesKey);
    wx.setStorageSync(favoritesKey, (Array.isArray(favorites) ? favorites : []).filter((item) => item !== slug));
    this.load();
  },
  goAssessment() { wx.navigateTo({ url: "/pages/guide-assessment/guide-assessment" }); },
  goConsult() { wx.navigateTo({ url: "/pages/guide-consult/guide-consult" }); }
});
