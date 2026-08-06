const api = require("../../utils/api");

Page({
  data: {
    pathway: null,
    samplePacks: [],
    loadingPack: ""
  },

  onLoad(options) {
    const slug = decodeURIComponent(options.slug || "");
    api.request("/api/public/school-guide/catalog?v=r336")
      .then((data) => {
        const pathway = (data.pathways || []).find((item) => item.slug === slug);
        if (!pathway) throw new Error("没有找到申请路径");
        const samplePacks = (data.samplePacks || []).filter((pack) => (pathway.samplePackSlugs || []).includes(pack.slug));
        this.setData({ pathway, samplePacks });
        wx.setNavigationBarTitle({ title: pathway.title || "申请路径" });
      })
      .catch((err) => api.toast(err.message));
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

  onShareAppMessage() {
    const pathway = this.data.pathway || {};
    return {
      title: pathway.title ? pathway.title + "｜官方路径" : "新加坡学校申请路径",
      path: "/pages/guide-pathway/guide-pathway?slug=" + encodeURIComponent(pathway.slug || "")
    };
  }
});
