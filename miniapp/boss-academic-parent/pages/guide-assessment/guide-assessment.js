const api = require("../../utils/api");

Page({
  data: {
    birthDate: "",
    targetEntryYear: String(new Date().getFullYear() + 1),
    residencyOptions: ["国际学生", "新加坡PR", "新加坡公民"],
    residencyValues: ["IS", "PR", "SC"],
    residencyIndex: 0,
    systemOptions: ["还不确定", "政府学校", "国际学校"],
    systemValues: ["UNSURE", "MOE", "INTERNATIONAL"],
    systemIndex: 0,
    loading: false,
    result: null,
    pathways: []
  },

  onLoad() {
    api.request("/api/public/school-guide/catalog")
      .then((data) => this.setData({ pathways: data.pathways || [] }))
      .catch((err) => api.toast(err.message));
  },

  setBirthDate(event) {
    this.setData({ birthDate: event.detail.value, result: null });
  },

  setYear(event) {
    this.setData({ targetEntryYear: event.detail.value, result: null });
  },

  setResidency(event) {
    this.setData({ residencyIndex: Number(event.detail.value), result: null });
  },

  setSystem(event) {
    this.setData({ systemIndex: Number(event.detail.value), result: null });
  },

  submit() {
    if (!this.data.birthDate || !this.data.targetEntryYear) {
      api.toast("请填写出生日期和目标入学年份");
      return;
    }
    const residency = this.data.residencyValues[this.data.residencyIndex];
    const preferredSystem = this.data.systemValues[this.data.systemIndex];
    this.setData({ loading: true });
    api.request("/api/public/school-guide/assessment", {
      method: "POST",
      data: {
        birthDate: this.data.birthDate,
        targetEntryYear: Number(this.data.targetEntryYear),
        residency,
        preferredSystem
      }
    })
      .then((data) => {
        const result = data.result || {};
        result.matchedPathways = this.data.pathways.filter((pathway) => (result.pathwaySlugs || []).includes(pathway.slug));
        this.setData({ result });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  openPathway(event) {
    wx.navigateTo({ url: "/pages/guide-pathway/guide-pathway?slug=" + encodeURIComponent(event.currentTarget.dataset.slug) });
  },

  goConsult() {
    const residency = this.data.residencyValues[this.data.residencyIndex];
    const preferredSystem = this.data.systemValues[this.data.systemIndex];
    const summary = [
      "出生日期:" + this.data.birthDate,
      "目标入学年:" + this.data.targetEntryYear,
      "身份:" + residency,
      "体系偏好:" + preferredSystem
    ].join("；");
    wx.navigateTo({ url: "/pages/guide-consult/guide-consult?summary=" + encodeURIComponent(summary) });
  },

  onShareAppMessage() {
    return { title: "新加坡学校路径测评", path: "/pages/guide-assessment/guide-assessment" };
  }
});
