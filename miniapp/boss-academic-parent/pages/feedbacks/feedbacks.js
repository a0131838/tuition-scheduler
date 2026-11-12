const api = require("../../utils/api");

Page({
  data: {
    studentName: "",
    feedbacks: [],
    focusFeedbackId: "",
    scrollTarget: "",
    course: "",
    from: "",
    to: "",
    hasHomeworkFiles: false,
    showFilters: false,
    page: 1,
    hasMore: false,
    loading: false,
    error: ""
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

  toggleFilters() { this.setData({ showFilters: !this.data.showFilters }); },

  inputCourse(e) { this.setData({ course: e.detail.value }); },
  chooseFrom(e) { this.setData({ from: e.detail.value }); },
  chooseTo(e) { this.setData({ to: e.detail.value }); },

  search() {
    const { course, from, to, hasHomeworkFiles } = this.data;
    if (from && to && from > to) {
      api.toast("开始日期应早于或等于结束日期");
      return Promise.resolve();
    }
    this.appliedFilters = { course: course.trim(), from, to, hasHomeworkFiles };
    this.setData({ focusFeedbackId: "", scrollTarget: "" });
    return this.load();
  },

  toggleHomework() {
    this.setData({ hasHomeworkFiles: !this.data.hasHomeworkFiles });
    return this.search();
  },

  resetFilters() {
    this.setData({ course: "", from: "", to: "", hasHomeworkFiles: false });
    return this.search();
  },

  loadMore() {
    if (!this.data.loading && this.data.hasMore) return this.load(true);
  },

  load(append = false) {
    const studentId = api.requireStudentPage();
    if (!studentId) return Promise.resolve();
    const { focusFeedbackId } = this.data;
    const { course, from, to, hasHomeworkFiles } = this.appliedFilters || {};
    const page = append ? this.data.page + 1 : 1;
    const filters = { page, feedbackId: focusFeedbackId, course, from, to, hasHomeworkFiles: hasHomeworkFiles ? "1" : "" };
    const query = Object.keys(filters).filter(key => filters[key]).map(key => key + "=" + encodeURIComponent(filters[key])).join("&");
    const requestId = (this.requestId || 0) + 1;
    this.requestId = requestId;
    this.setData({ studentName: getApp().globalData.currentStudentName || "当前学生", loading: true, error: "", ...(!append ? { feedbacks: [], hasMore: false } : {}) });
    return api.request(`/api/miniapp/students/${encodeURIComponent(studentId)}/feedbacks?${query}`)
      .then((data) => {
        if (requestId !== this.requestId) return;
        const feedbacks = (data.items || []).map(row => Object.assign({}, row, {
          attachments: (row.attachments || []).map(file => Object.assign({}, file, {
            isImage: /^image\//.test(file.mimeType || "") || /\.(jpe?g|png|webp)$/i.test(file.name)
          }))
        }));
        const target = feedbacks.some(item => item.id === focusFeedbackId) ? "feedback-" + focusFeedbackId : "";
        this.setData({ feedbacks: append ? this.data.feedbacks.concat(feedbacks) : feedbacks, scrollTarget: target, page, hasMore: Boolean(data.hasMore) });
      })
      .catch(err => { if (requestId === this.requestId) this.setData({ error: err.message || "读取失败，请重试" }); })
      .finally(() => { if (requestId === this.requestId) this.setData({ loading: false }); });
  },

  openAttachment(e) {
    const { feedbackIndex, attachmentIndex, save } = e.currentTarget.dataset;
    const feedback = this.data.feedbacks[Number(feedbackIndex)];
    const attachment = feedback && feedback.attachments[Number(attachmentIndex)];
    if (!attachment) return;
    api.openParentDocument(attachment.viewUrl, attachment.name, attachment.mimeType, Boolean(save))
      .then(() => { if (save) api.toast("已保存到相册"); })
      .catch(err => api.toast(err.message));
  }
});
