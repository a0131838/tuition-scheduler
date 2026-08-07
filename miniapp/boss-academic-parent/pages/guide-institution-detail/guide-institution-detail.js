const api = require("../../utils/api");

Page({
  data: { institution: null, sections: [], pathways: [], samplePacks: [], loadingPack: "" },

  onLoad(options) {
    const slug = decodeURIComponent(options.slug || "");
    Promise.all([
      api.request("/api/public/school-guide/institutions?slug=" + encodeURIComponent(slug) + "&v=r346"),
      api.request("/api/public/school-guide/catalog?v=r346")
    ]).then(([detail, catalog]) => {
      const institution = Object.assign({}, detail.institution, {
        partnerProgrammes: (detail.institution.partnerProgrammes || []).map((partner) => Object.assign({}, partner, { open: false }))
      });
      const pathways = (catalog.pathways || []).filter((item) => (institution.pathwaySlugs || []).includes(item.slug));
      const samplePacks = (catalog.samplePacks || []).filter((item) => (institution.samplePackSlugs || []).includes(item.slug));
      this.setData({
        institution,
        sections: (institution.sections || []).map((section) => Object.assign({}, section, { open: false })),
        pathways,
        samplePacks
      });
      wx.setNavigationBarTitle({ title: institution.nameZh || institution.name || "学校详情" });
    }).catch((err) => api.toast(err.message));
  },

  toggleSection(event) {
    const index = Number(event.currentTarget.dataset.index);
    this.setData({ sections: this.data.sections.map((item, itemIndex) => Object.assign({}, item, { open: itemIndex === index ? !item.open : item.open })) });
  },

  togglePartner(event) {
    const index = Number(event.currentTarget.dataset.index);
    const institution = Object.assign({}, this.data.institution, {
      partnerProgrammes: (this.data.institution.partnerProgrammes || []).map((partner, partnerIndex) =>
        Object.assign({}, partner, { open: partnerIndex === index ? !partner.open : partner.open })
      )
    });
    this.setData({ institution });
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

  goAssessment() {
    wx.navigateTo({ url: "/pages/guide-academic-assessment/guide-academic-assessment" });
  },

  goConsult() {
    const institution = this.data.institution || {};
    wx.navigateTo({ url: "/pages/guide-consult/guide-consult?summary=" + encodeURIComponent("希望了解" + (institution.nameZh || institution.name || "该学校") + "的申请与准备方案") });
  },

  onShareAppMessage() {
    const institution = this.data.institution || {};
    return { title: (institution.nameZh || institution.name || "学校资料") + "｜新加坡学校指南", path: "/pages/guide-institution-detail/guide-institution-detail?slug=" + encodeURIComponent(institution.slug || "") };
  }
});
