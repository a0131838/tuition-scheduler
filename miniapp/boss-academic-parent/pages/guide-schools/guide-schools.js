const api = require("../../utils/api");
const FAVORITES_KEY = "schoolGuideFavorites";

Page({
  data: {
    loading: true,
    query: "",
    tier: "ALL",
    sectorGroups: [],
    allSchools: [],
    schools: []
  },

  onLoad() {
    api.request("/api/public/school-guide/catalog")
      .then((data) => {
        const schools = data.schools || [];
        this.setData({
          sectorGroups: this.buildSectorGroups(data.sectors || []),
          allSchools: schools,
          schools: this.buildVisibleSchools(schools, "", this.loadFavorites(), "ALL")
        });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  onShow() {
    if (!this.data.allSchools.length) return;
    this.setData({
      schools: this.buildVisibleSchools(this.data.allSchools, this.data.query, this.loadFavorites(), this.data.tier)
    });
  },

  loadFavorites() {
    const favorites = wx.getStorageSync(FAVORITES_KEY);
    return Array.isArray(favorites) ? favorites : [];
  },

  buildSectorGroups(sectors) {
    return ["学前", "小学", "中学", "高中与专上", "特殊与其他"]
      .map((stage) => ({
        stage,
        sectors: sectors
          .filter((item) => item.stage === stage)
          .map((item) => ({ ...item, includesText: (item.includes || []).join(" · ") }))
      }))
      .filter((group) => group.sectors.length);
  },

  buildVisibleSchools(allSchools, query, favorites, tier) {
    const lower = String(query || "").trim().toLowerCase();
    return allSchools
      .filter((school) => !lower || String(school.name || "").toLowerCase().includes(lower))
      .filter((school) => tier === "ALL" || (tier === "FIRST" ? school.editorialTier === 1 : school.editorialTier === null))
      .sort((a, b) => (a.editorialTier === 1 ? 0 : 1) - (b.editorialTier === 1 ? 0 : 1))
      .map((school) => ({ ...school, favorite: favorites.includes(school.slug) }));
  },

  inputQuery(event) {
    const query = String(event.detail.value || "");
    this.setData({
      query,
      schools: this.buildVisibleSchools(this.data.allSchools, query, this.loadFavorites(), this.data.tier)
    });
  },

  setTier(event) {
    const tier = event.currentTarget.dataset.tier || "ALL";
    this.setData({
      tier,
      schools: this.buildVisibleSchools(this.data.allSchools, this.data.query, this.loadFavorites(), tier)
    });
  },

  openSector(event) {
    const id = event.currentTarget.dataset.id;
    const url = event.currentTarget.dataset.url;
    if (id === "international-schools") {
      wx.pageScrollTo({ selector: "#international-directory", duration: 300 });
      return;
    }
    if (!url) return;
    wx.setClipboardData({
      data: url,
      success: () => api.toast("官方链接已复制，请在浏览器打开")
    });
  },

  openSchool(event) {
    wx.navigateTo({ url: "/pages/guide-school-detail/guide-school-detail?slug=" + encodeURIComponent(event.currentTarget.dataset.slug) });
  },

  toggleFavorite(event) {
    const slug = event.currentTarget.dataset.slug;
    const favorites = this.loadFavorites();
    const next = favorites.includes(slug)
      ? favorites.filter((item) => item !== slug)
      : favorites.concat(slug);
    wx.setStorageSync(FAVORITES_KEY, next);
    this.setData({
      schools: this.buildVisibleSchools(this.data.allSchools, this.data.query, next, this.data.tier)
    });
    api.toast(next.includes(slug) ? "已加入我的方案" : "已移出方案");
  },

  onShareAppMessage() {
    return { title: "新加坡学校与教育机构官方指南", path: "/pages/guide-schools/guide-schools" };
  }
});
