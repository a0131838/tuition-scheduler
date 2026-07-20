const api = require("../../utils/api");

Page({
  data: {
    studentName: "",
    feedbacks: [],
    focusFeedbackId: "",
    scrollTarget: ""
  },

  onLoad(query) {
    const studentId = String(query.studentId || "");
    if (studentId) getApp().setCurrentStudent({ id: studentId, name: getApp().globalData.currentStudentName || "当前学生" });
    this.setData({ focusFeedbackId: String(query.feedbackId || "") });
  },

  onShow() {
    this.load();
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },

  load() {
    const studentId = api.requireStudentPage();
    if (!studentId) return Promise.resolve();
    this.setData({ studentName: getApp().globalData.currentStudentName || "当前学生" });
    return api.request(`/api/miniapp/students/${studentId}/feedbacks`)
      .then((data) => {
        const feedbacks = data.items || [];
        const target = feedbacks.some((item) => item.id === this.data.focusFeedbackId) ? "feedback-" + this.data.focusFeedbackId : "";
        this.setData({ feedbacks, scrollTarget: target });
      })
      .catch((err) => api.toast(err.message));
  },

  openAttachment(e) {
    const feedback = this.data.feedbacks[Number(e.currentTarget.dataset.feedbackIndex || 0)];
    const attachment = feedback && feedback.attachments ? feedback.attachments[Number(e.currentTarget.dataset.attachmentIndex || 0)] : null;
    if (!attachment) return;
    api.openParentDocument(attachment.viewUrl, attachment.name).catch((err) => api.toast(err.message));
  }
});
