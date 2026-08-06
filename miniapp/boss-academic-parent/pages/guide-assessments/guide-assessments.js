Page({
  data: { hasRequest: false, hasSession: false },

  onShow() {
    this.setData({
      hasRequest: Boolean(wx.getStorageSync("school_guide_academic_assessment_request_token")),
      hasSession: Boolean(wx.getStorageSync("school_guide_academic_assessment_token"))
    });
  },

  goSelection() {
    wx.navigateTo({ url: "/pages/guide-assessment/guide-assessment" });
  },

  goReadiness() {
    wx.navigateTo({ url: "/pages/guide-academic-assessment/guide-academic-assessment" });
  },

  onShareAppMessage() {
    return { title: "新加坡学校指南｜选校与学习准备度测评", path: "/pages/guide-assessments/guide-assessments" };
  }
});
