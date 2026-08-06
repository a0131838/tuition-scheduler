const api = require("../../utils/api");

Page({
  data: {
    school: null,
    detailSections: []
  },

  onLoad(options) {
    const slug = decodeURIComponent(options.slug || "");
    api.request("/api/public/school-guide/catalog")
      .then((data) => {
        const school = (data.schools || []).find((item) => item.slug === slug);
        if (!school) throw new Error("没有找到学校记录");
        const costProfile = school.costProfile
          ? {
              ...school.costProfile,
              rangeText: "S$" + Number(school.costProfile.fixedFirstYearLow || 0).toLocaleString() +
                "–S$" + Number(school.costProfile.fixedFirstYearHigh || 0).toLocaleString(),
              includesText: (school.costProfile.includes || []).join("、"),
              optionalText: (school.costProfile.optionalItems || []).join("、")
            }
          : null;
        const comparison = school.comparison || {};
        const snapshot = [
          { label: "年龄与年级", value: comparison.ageAndGrades || "学校未公开" },
          { label: "课程体系", value: comparison.curriculum || school.category || "学校未公开" },
          { label: "校区", value: comparison.campuses || "学校未公开" },
          { label: "首年固定费用", value: costProfile ? costProfile.rangeText : "学校未公开" }
        ];
        const detailSections = (school.detailSections || []).map((section, index) => ({
          ...section,
          open: index === 0
        }));
        this.setData({
          school: {
            ...school,
            costProfile,
            snapshot,
            communityMetrics: school.communityMetrics || [],
            academicRecords: school.academicResults ? school.academicResults.records || [] : [],
            universityOutcomes: school.universityOutcomes || []
          },
          detailSections
        });
        wx.setNavigationBarTitle({ title: school.nameZh || school.name || "学校档案" });
      })
      .catch((err) => api.toast(err.message));
  },

  toggleSection(event) {
    const index = Number(event.currentTarget.dataset.index);
    const detailSections = this.data.detailSections.map((section, sectionIndex) =>
      sectionIndex === index ? { ...section, open: !section.open } : section
    );
    this.setData({ detailSections });
  },

  goAssessment() {
    wx.navigateTo({ url: "/pages/guide-assessments/guide-assessments" });
  },

  goConsult() {
    const school = this.data.school || {};
    const summary = `希望了解${school.nameZh || school.name || "该学校"}的申请与准备方案`;
    wx.navigateTo({ url: "/pages/guide-consult/guide-consult?summary=" + encodeURIComponent(summary) });
  },

  onShareAppMessage() {
    const school = this.data.school || {};
    return {
      title: school.nameZh ? school.nameZh + "｜新加坡学校指南" : "新加坡学校指南",
      path: "/pages/guide-school-detail/guide-school-detail?slug=" + encodeURIComponent(school.slug || "")
    };
  }
});
