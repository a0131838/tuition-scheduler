const api = require("../../utils/api");

Page({
  data: {
    pathway: null,
    sources: []
  },

  onLoad(options) {
    const slug = decodeURIComponent(options.slug || "");
    api.request("/api/public/school-guide/catalog?v=r334")
      .then((data) => {
        const pathway = (data.pathways || []).find((item) => item.slug === slug);
        if (!pathway) throw new Error("没有找到申请路径");
        const sources = (data.sources || []).filter((source) => (pathway.sourceIds || []).includes(source.id));
        this.setData({ pathway, sources });
        wx.setNavigationBarTitle({ title: pathway.title || "申请路径" });
      })
      .catch((err) => api.toast(err.message));
  },

  copyLink(event) {
    wx.setClipboardData({ data: event.currentTarget.dataset.url || "" });
  },

  onShareAppMessage() {
    const pathway = this.data.pathway || {};
    return {
      title: pathway.title ? pathway.title + "｜官方路径" : "新加坡学校申请路径",
      path: "/pages/guide-pathway/guide-pathway?slug=" + encodeURIComponent(pathway.slug || "")
    };
  }
});
