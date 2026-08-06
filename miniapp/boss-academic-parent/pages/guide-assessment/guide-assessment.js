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
    currentSchoolOptions: ["国际学校", "新加坡政府学校", "私立或教会学校", "中国或其他国家本地学校", "幼儿园或学前", "暂未入学"],
    currentSchoolValues: ["INTERNATIONAL", "MOE", "PRIVATE", "OVERSEAS_LOCAL", "PRESCHOOL", "NOT_ENROLLED"],
    currentSchoolIndex: 5,
    currentCurriculumOptions: ["不确定", "IB", "英式", "美式", "新加坡MOE", "中国课程", "其他"],
    currentCurriculumValues: ["ANY", "IB", "BRITISH", "AMERICAN", "MOE", "CHINA", "OTHER"],
    currentCurriculumIndex: 0,
    academicLevelOptions: ["需要较多支持", "正在接近年级要求", "基本达到年级要求", "目前表现较强"],
    academicLevelValues: ["NEEDS_SUPPORT", "DEVELOPING", "ON_LEVEL", "STRONG"],
    academicLevelIndex: 2,
    assessmentScore: null,
    assessmentEvidence: "",
    englishSupportNeeded: false,
    boardingNeeded: false,
    loading: false,
    result: null,
    pathways: [],
    schools: []
  },

  onLoad() {
    api.request("/api/public/school-guide/catalog?v=r340")
      .then((data) => this.setData({ pathways: data.pathways || [], schools: data.schoolGroups || data.schools || [] }))
      .catch((err) => api.toast(err.message));
    const token = wx.getStorageSync("school_guide_academic_assessment_token") || "";
    if (token) {
      api.request("/api/public/school-guide/academic-assessment/session", { method: "POST", data: { action: "load", sessionToken: token }, timeout: 15000 })
        .then((data) => {
          const session = data.session || {};
          if (session.status === "COMPLETED" && typeof session.overallScore === "number") {
            this.setData({ assessmentScore: session.overallScore, assessmentEvidence: `已使用系统测评结果：${session.overallScore}分` });
          }
        }).catch(() => {});
    }
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
  setCurrentSchool(event) { this.setData({ currentSchoolIndex: Number(event.detail.value), result: null }); },
  setCurrentCurriculum(event) { this.setData({ currentCurriculumIndex: Number(event.detail.value), result: null }); },
  setAcademicLevel(event) { this.setData({ academicLevelIndex: Number(event.detail.value), result: null }); },
  setEnglishSupport(event) { this.setData({ englishSupportNeeded: event.detail.value, result: null }); },
  setBoarding(event) { this.setData({ boardingNeeded: event.detail.value, result: null }); },

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
        preferredSystem,
        budgetMax: this.data.budgetValues[this.data.budgetIndex],
        curriculum: this.data.curriculumValues[this.data.curriculumIndex],
        englishSupportNeeded: this.data.englishSupportNeeded,
        boardingNeeded: this.data.boardingNeeded,
        currentSchoolType: this.data.currentSchoolValues[this.data.currentSchoolIndex],
        currentCurriculum: this.data.currentCurriculumValues[this.data.currentCurriculumIndex],
        academicLevel: this.data.academicLevelValues[this.data.academicLevelIndex],
        assessmentScore: this.data.assessmentScore
      }
    })
      .then((data) => {
        const result = data.result || {};
        result.matchedPathways = this.data.pathways.filter((pathway) => (result.pathwaySlugs || []).includes(pathway.slug));
        result.schoolMatches = data.schoolMatches || [];
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
      "希望顾问专业分析智能选校结果",
      "出生日期:" + this.data.birthDate,
      "目标入学年:" + this.data.targetEntryYear,
      "身份:" + residency,
      "体系偏好:" + preferredSystem,
      "当前学校:" + this.data.currentSchoolOptions[this.data.currentSchoolIndex],
      "当前课程:" + this.data.currentCurriculumOptions[this.data.currentCurriculumIndex],
      this.data.assessmentScore === null ? "家长自评:" + this.data.academicLevelOptions[this.data.academicLevelIndex] : "系统测评:" + this.data.assessmentScore + "分",
      "推荐学校:" + (((this.data.result || {}).schoolMatches || []).map((item) => item.nameZh || item.name).slice(0, 8).join("、") || "待生成")
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
