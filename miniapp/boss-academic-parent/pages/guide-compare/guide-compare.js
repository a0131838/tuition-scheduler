const api = require("../../utils/api");

Page({
  data: {
    query: "",
    allSchools: [],
    schools: [],
    selectedSlugs: [],
    compared: []
  },

  onLoad() {
    api.request("/api/public/school-guide/catalog?v=r336")
      .then((data) => {
        const allSchools = data.schoolGroups || data.schools || [];
        this.setData({
          allSchools,
          schools: this.buildVisibleSchools(allSchools, "", [])
        });
      })
      .catch((err) => api.toast(err.message));
  },

  buildVisibleSchools(allSchools, query, selectedSlugs) {
    const lower = String(query || "").trim().toLowerCase();
    return allSchools
      .filter((school) => !lower || [school.name, school.nameZh].some((value) => String(value || "").toLowerCase().includes(lower)))
      .slice(0, 18)
      .map((school) => ({
        ...school,
        selected: selectedSlugs.includes(school.slug)
      }));
  },

  buildCompared(allSchools, selectedSlugs) {
    return allSchools
      .filter((school) => selectedSlugs.includes(school.slug))
      .map((school) => {
        const cost = school.costProfile;
        return {
          ...school,
          costRangeText: cost
            ? "S$" + Number(cost.fixedFirstYearLow || 0).toLocaleString() +
              "–S$" + Number(cost.fixedFirstYearHigh || 0).toLocaleString()
            : "",
          costIncludesText: cost ? (cost.includes || []).join("、") : "",
          costOptionalText: cost ? (cost.optionalItems || []).join("、") : ""
        };
      });
  },

  inputQuery(event) {
    const query = String(event.detail.value || "");
    this.setData({
      query,
      schools: this.buildVisibleSchools(this.data.allSchools, query, this.data.selectedSlugs)
    });
  },

  toggle(event) {
    const slug = event.currentTarget.dataset.slug;
    let selected = this.data.selectedSlugs.slice();
    if (selected.includes(slug)) selected = selected.filter((item) => item !== slug);
    else if (selected.length < 4) selected.push(slug);
    else {
      api.toast("最多比较4所学校");
      return;
    }
    this.setData({
      selectedSlugs: selected,
      schools: this.buildVisibleSchools(this.data.allSchools, this.data.query, selected),
      compared: this.buildCompared(this.data.allSchools, selected)
    });
  },

  onShareAppMessage() {
    return { title: "新加坡学校官方资料比较", path: "/pages/guide-compare/guide-compare" };
  }
});
