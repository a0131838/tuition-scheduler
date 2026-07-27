Page({
  onShareAppMessage() {
    return { title: "新加坡择校真实案例", path: "/pages/guide-cases/guide-cases" };
  },
  goAssessment() {
    wx.navigateTo({ url: "/pages/guide-assessment/guide-assessment" });
  }
});
