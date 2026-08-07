const api = require("../../utils/api");

Page({
  data: {
    school: null,
    activeDetailTab: "OVERVIEW",
    overviewOpen: false,
    detailSections: [],
    pathways: [],
    samplePacks: [],
    loadingPack: ""
  },

  onLoad(options) {
    const slug = decodeURIComponent(options.slug || "");
    api.request("/api/public/school-guide/catalog?v=r349")
      .then((data) => {
        const groups = data.schoolGroups || data.schools || [];
        const school = groups.find((item) => item.slug === slug || (item.memberSlugs || []).includes(slug));
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
        const admissionProfile = school.admissionProfile || {};
        const snapshot = [
          { label: "年龄与年级", value: comparison.ageAndGrades || "学校未公开" },
          { label: "课程体系", value: comparison.curriculum || school.category || "学校未公开" },
          { label: "学生准证", value: school.studentPass ? school.studentPass.label : "需向学校书面确认" },
          { label: "首年固定费用", value: costProfile ? costProfile.rangeText : "学校未公开" }
        ];
        const detailSections = (school.detailSections || []).map((section) => ({
          ...section,
          open: false
        }));
        const pathways = (data.pathways || []).filter((item) => item.slug === "international-school-direct");
        const packSlug = comparison.ageAndGrades && /grade 6|year 7|secondary|中学|18岁/i.test(comparison.ageAndGrades)
          ? "international-secondary-sample"
          : "international-primary-sample";
        const samplePacks = (data.samplePacks || []).filter((item) => item.slug === packSlug).slice(0, 1);
        this.setData({
          school: {
            ...school,
            admissionProfile: {
              ...admissionProfile,
              curriculumText: (admissionProfile.curriculumFamilies || []).join("、"),
              entryPointsText: (admissionProfile.mainEntryPoints || []).join("、")
            },
            costProfile,
            snapshot,
            communityMetrics: school.communityMetrics || [],
            campusProfiles: school.campusProfiles || [],
            academicRecords: school.academicResults ? (school.academicResults.records || []).map((record) => ({
              ...record,
              displayScore: record.average || record.passRate || "已公布",
              displayLabel: record.scoreLabel || (record.average ? "平均分" : record.passRate ? "通过率" : "成绩摘要")
            })) : [],
            universityOutcomes: school.universityOutcomes || []
          },
          detailSections,
          pathways,
          samplePacks
        });
        wx.setNavigationBarTitle({ title: school.nameZh || school.name || "学校档案" });
      })
      .catch((err) => api.toast(err.message));
  },

  setDetailTab(event) {
    this.setData({ activeDetailTab: event.currentTarget.dataset.tab || "OVERVIEW" });
  },

  openPathway(event) {
    wx.navigateTo({ url: "/pages/guide-pathway/guide-pathway?slug=" + encodeURIComponent(event.currentTarget.dataset.slug || "") });
  },

  openPack(event) {
    const slug = event.currentTarget.dataset.slug || "";
    const pack = this.data.samplePacks.find((item) => item.slug === slug);
    if (!pack || this.data.loadingPack) return;
    this.setData({ loadingPack: slug });
    api.openParentDocument(pack.downloadUrl, pack.slug + ".pdf")
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loadingPack: "" }));
  },

  toggleSection(event) {
    const index = Number(event.currentTarget.dataset.index);
    const detailSections = this.data.detailSections.map((section, sectionIndex) =>
      sectionIndex === index ? { ...section, open: !section.open } : section
    );
    this.setData({ detailSections });
  },

  toggleOverview() {
    this.setData({ overviewOpen: !this.data.overviewOpen });
  },

  goAssessment() {
    wx.navigateTo({ url: "/pages/guide-academic-assessment/guide-academic-assessment" });
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
