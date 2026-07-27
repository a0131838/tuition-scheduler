const api = require("../../utils/api");

Page({
  data: {
    school: null,
    sources: []
  },

  onLoad(options) {
    const slug = decodeURIComponent(options.slug || "");
    api.request("/api/public/school-guide/catalog")
      .then((data) => {
        const school = (data.schools || []).find((item) => item.slug === slug);
        const sources = (data.sources || []).filter((source) => school && (school.sourceIds || []).includes(source.id));
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
        this.setData({ school: { ...school, costProfile }, sources });
        wx.setNavigationBarTitle({ title: school.name || "学校官方资料" });
      })
      .catch((err) => api.toast(err.message));
  },

  copyLink(event) {
    const url = event.currentTarget.dataset.url;
    if (!url) {
      api.toast("该项官网链接仍待核实");
      return;
    }
    wx.setClipboardData({
      data: url,
      success() {
        wx.showModal({
          title: "官方链接已复制",
          content: "由于微信小程序不能直接打开所有外部官网，请在浏览器粘贴访问。",
          showCancel: false
        });
      }
    });
  },

  onShareAppMessage() {
    const school = this.data.school || {};
    return {
      title: school.name ? school.name + "｜官方资料" : "新加坡学校官方资料",
      path: "/pages/guide-school-detail/guide-school-detail?slug=" + encodeURIComponent(school.slug || "")
    };
  }
});
