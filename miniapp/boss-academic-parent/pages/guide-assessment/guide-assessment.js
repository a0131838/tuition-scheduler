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
    budgetOptions: ["暂不限制", "S$30,000", "S$40,000", "S$50,000", "S$60,000", "S$70,000"],
    budgetValues: [0, 30000, 40000, 50000, 60000, 70000],
    budgetIndex: 0,
    curriculumOptions: ["保持开放", "IB", "英式", "美式", "法式", "澳洲体系"],
    curriculumValues: ["ANY", "IB", "BRITISH", "AMERICAN", "FRENCH", "AUSTRALIAN"],
    curriculumIndex: 0,
    englishSupportNeeded: false,
    boardingNeeded: false,
    loading: false,
    result: null,
    pathways: [],
    schools: []
  },

  onLoad() {
    api.request("/api/public/school-guide/catalog?v=r338")
      .then((data) => this.setData({ pathways: data.pathways || [], schools: data.schoolGroups || data.schools || [] }))
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

  setBudget(event) { this.setData({ budgetIndex: Number(event.detail.value), result: null }); },
  setCurriculum(event) { this.setData({ curriculumIndex: Number(event.detail.value), result: null }); },
  setEnglishSupport(event) { this.setData({ englishSupportNeeded: event.detail.value, result: null }); },
  setBoarding(event) { this.setData({ boardingNeeded: event.detail.value, result: null }); },

  matchSchools() {
    const curriculum = this.data.curriculumValues[this.data.curriculumIndex];
    const budget = this.data.budgetValues[this.data.budgetIndex];
    const terms = {
      IB: ["IB", "PYP", "MYP", "DP"],
      BRITISH: ["英国", "IGCSE", "A Level"],
      AMERICAN: ["美式", "AP", "American"],
      FRENCH: ["法国", "French"],
      AUSTRALIAN: ["澳洲", "HSC", "Australian"]
    };
    const seen = {};
    return this.data.schools.filter((school) => {
      if (school.dataStatus !== "VERIFIED" || !school.comparison || !school.costProfile || seen[school.name]) return false;
      seen[school.name] = true;
      return true;
    }).map((school) => {
      let score = school.editorialTier === 1 ? 2 : 0;
      const reasons = [];
      const cautions = [];
      const schoolCurriculum = school.comparison.curriculum || "";
      if (curriculum === "ANY") reasons.push("课程偏好保持开放");
      else if ((terms[curriculum] || []).some((term) => schoolCurriculum.indexOf(term) >= 0)) {
        score += 3; reasons.push("课程方向符合：" + schoolCurriculum);
      } else { score -= 2; cautions.push("课程方向与当前偏好不完全一致"); }
      if (budget) {
        if (school.costProfile.fixedFirstYearLow <= budget) { score += 2; reasons.push("首年固定费用低值在预算内"); }
        else { score -= 4; cautions.push("首年固定费用低值已高于预算"); }
      }
      if (this.data.englishSupportNeeded) {
        if (/EAL|ELL|English|英语|语言|Foundation|Passerelle/i.test(school.comparison.englishSupport || "")) {
          score += 1; reasons.push("学校官网列有英语支持");
        } else cautions.push("英语支持安排需要向学校确认");
      }
      if (this.data.boardingNeeded) {
        if (!/无寄宿/.test(school.comparison.boarding || "")) { score += 2; reasons.push("学校有寄宿信息"); }
        else { score -= 5; cautions.push("学校不提供寄宿"); }
      }
      const band = score >= 4 ? "优先了解" : score >= 0 ? "可以比较" : "需要谨慎";
      return { ...school, score, band, reasons, cautions };
    }).sort((a, b) => b.score - a.score).slice(0, 6);
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
        result.schoolMatches = this.matchSchools();
        this.setData({ result });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  openSchool(event) {
    wx.navigateTo({ url: "/pages/guide-school-detail/guide-school-detail?slug=" + encodeURIComponent(event.currentTarget.dataset.slug) });
  },

  addToPlan(event) {
    const slug = event.currentTarget.dataset.slug;
    const current = wx.getStorageSync("schoolGuideFavorites");
    const favorites = Array.isArray(current) ? current : [];
    if (!favorites.includes(slug)) wx.setStorageSync("schoolGuideFavorites", favorites.concat(slug));
    api.toast("已加入我的方案");
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

  goAcademicAssessment() {
    wx.navigateTo({ url: "/pages/guide-academic-assessment/guide-academic-assessment" });
  },

  onShareAppMessage() {
    return { title: "新加坡学校路径测评", path: "/pages/guide-assessment/guide-assessment" };
  }
});
