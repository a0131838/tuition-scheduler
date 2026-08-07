const api = require("../../utils/api");
const POPULAR_COMPARE_SLUGS = [
  "singapore-american-school", "dulwich-college-singapore-8", "united-world-college-of-south-east-asia-38", "tanglin-trust-school-36",
  "north-london-collegiate-school-singapore-21", "acs-international-singapore-1", "hwa-chong-international-school-16", "st-joseph-s-institution-international-ltd-34"
];

Page({
  data: {
    query: "",
    allSchools: [],
    schools: [],
    selectedSlugs: [],
    compared: []
  },

  onLoad(options) {
    api.request("/api/public/school-guide/catalog?v=r350")
      .then((data) => {
        const rawSchools = data.schoolGroups || data.schools || [];
        const allSchools = options && options.preset === "popular"
          ? POPULAR_COMPARE_SLUGS.map((slug) => rawSchools.find((item) => item.slug === slug || (item.memberSlugs || []).includes(slug))).filter(Boolean).concat(rawSchools.filter((item) => !POPULAR_COMPARE_SLUGS.includes(item.slug)))
          : rawSchools;
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
