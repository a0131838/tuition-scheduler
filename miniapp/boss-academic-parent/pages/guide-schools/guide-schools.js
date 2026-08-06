const api = require("../../utils/api");
const FAVORITES_KEY = "schoolGuideFavorites";

Page({
  data: {
    loading: true,
    query: "",
    activeCategory: "international",
    focus: "ALL",
    showAllSchools: false,
    categories: [],
    activeSections: [],
    allSchoolGroups: [],
    schools: []
  },

  onLoad() {
    api.request("/api/public/school-guide/catalog?v=r334")
      .then((data) => {
        const categories = data.directoryCategories || [];
        const schools = data.schoolGroups || data.schools || [];
        this.setData({
          categories,
          activeSections: (categories.find((item) => item.id === "international") || {}).sections || [],
          allSchoolGroups: schools,
          schools: this.buildVisibleSchools(schools, "", this.loadFavorites(), "ALL")
        });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  onShow() {
    if (!this.data.allSchoolGroups.length) return;
    this.setData({
      schools: this.buildVisibleSchools(this.data.allSchoolGroups, this.data.query, this.loadFavorites(), this.data.focus)
    });
  },

  loadFavorites() {
    const favorites = wx.getStorageSync(FAVORITES_KEY);
    return Array.isArray(favorites) ? favorites : [];
  },

  buildVisibleSchools(allSchools, query, favorites, focus) {
    const lower = String(query || "").trim().toLowerCase();
    return allSchools
      .filter((school) => !lower || [school.name, school.nameZh]
        .concat((school.campusProfiles || []).flatMap((campus) => [campus.name, campus.nameZh]))
        .some((value) => String(value || "").toLowerCase().includes(lower)))
      .filter((school) => focus === "ALL" || (school.directoryTags || []).includes(focus))
      .sort((a, b) => (a.editorialTier === 1 ? 0 : 1) - (b.editorialTier === 1 ? 0 : 1))
      .map((school) => ({
        ...school,
        campusCountText: (school.campusProfiles || []).length > 1 ? `${school.campusProfiles.length}个收录校区` : "",
        favorite: [school.slug].concat(school.memberSlugs || []).some((slug) => favorites.includes(slug))
      }));
  },

  inputQuery(event) {
    const query = String(event.detail.value || "");
    this.setData({
      query,
      showAllSchools: false,
      activeCategory: "international",
      activeSections: (this.data.categories.find((item) => item.id === "international") || {}).sections || [],
      schools: this.buildVisibleSchools(this.data.allSchoolGroups, query, this.loadFavorites(), this.data.focus)
    });
  },

  selectCategory(event) {
    const activeCategory = event.currentTarget.dataset.id || "international";
    const category = this.data.categories.find((item) => item.id === activeCategory) || {};
    this.setData({
      activeCategory,
      showAllSchools: false,
      activeSections: category.sections || []
    });
  },

  setFocus(event) {
    const focus = event.currentTarget.dataset.focus || "ALL";
    this.setData({
      focus,
      showAllSchools: false,
      schools: this.buildVisibleSchools(this.data.allSchoolGroups, this.data.query, this.loadFavorites(), focus)
    });
  },

  showAllSchools() {
    this.setData({ showAllSchools: true });
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
      schools: this.buildVisibleSchools(this.data.allSchoolGroups, this.data.query, next, this.data.focus)
    });
    api.toast(next.includes(slug) ? "已加入我的方案" : "已移出方案");
  },

  onShareAppMessage() {
    return { title: "新加坡学校与教育机构官方指南", path: "/pages/guide-schools/guide-schools" };
  }
});
