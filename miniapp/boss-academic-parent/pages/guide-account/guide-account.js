Page({
  data: {
    planCount: 0,
    parentLoggedIn: false,
    staffLoggedIn: false,
    currentStudentName: "",
    hasAssessmentRequest: false,
    hasAssessmentSession: false
  },

  onShow() {
    const app = getApp();
    const favorites = wx.getStorageSync("schoolGuideFavorites");
    this.setData({
      planCount: Array.isArray(favorites) ? favorites.length : 0,
      parentLoggedIn: Boolean(app.globalData.token || wx.getStorageSync("parent_token")),
      staffLoggedIn: Boolean(app.globalData.staffToken || wx.getStorageSync("staff_token")),
      currentStudentName: app.globalData.currentStudentName || wx.getStorageSync("current_student_name") || "",
      hasAssessmentRequest: Boolean(wx.getStorageSync("school_guide_academic_assessment_request_token")),
      hasAssessmentSession: Boolean(wx.getStorageSync("school_guide_academic_assessment_token"))
    });
  },

  goPlan() { wx.navigateTo({ url: "/pages/guide-plan/guide-plan" }); },
  goAssessment() { wx.navigateTo({ url: "/pages/guide-academic-assessment/guide-academic-assessment" }); },
  goConsult() { wx.navigateTo({ url: "/pages/guide-consult/guide-consult" }); },
  openPrivacy() { wx.navigateTo({ url: "/pages/guide-privacy/guide-privacy" }); },

  goParent() {
    const app = getApp();
    app.setCurrentPortal("parent");
    if (this.data.parentLoggedIn) {
      wx.switchTab({ url: "/pages/home/home" });
      return;
    }
    wx.navigateTo({ url: "/pages/login/login" });
  },

  goStaff() {
    const app = getApp();
    app.setCurrentPortal("staff");
    wx.navigateTo({ url: this.data.staffLoggedIn ? "/pages/staff-home/staff-home" : "/pages/staff-login/staff-login" });
  }
});
