const api = require("../../utils/api");

Page({
  data: { id: "", loading: false, saving: false, capabilities: {}, session: null, manualQuestions: [], scores: {}, reviewerNote: "", durationMinutes: 0 },

  onLoad(options) {
    this.setData({ id: options.id || "" });
    this.load();
  },

  load() {
    this.setData({ loading: true });
    return api.requestStaff("/api/miniapp/staff/academic-assessments/" + encodeURIComponent(this.data.id), { timeout: 15000 })
      .then((data) => {
        const session = data.session || {};
        const manualQuestions = (session.questions || []).filter((item) => item.requiresReviewer);
        const scores = {};
        manualQuestions.forEach((item) => { scores[item.id] = { score: item.manualScore, note: item.reviewerNote || "" }; });
        this.setData({ capabilities: data.capabilities || {}, session, manualQuestions, scores, reviewerNote: session.reviewerNote || "", durationMinutes: Math.round((session.durationSeconds || 0) / 60) });
      }).catch((err) => api.toast(err.message)).finally(() => this.setData({ loading: false }));
  },

  setScore(event) {
    const id = event.currentTarget.dataset.id;
    const scores = Object.assign({}, this.data.scores);
    scores[id] = Object.assign({}, scores[id] || {}, { score: event.detail.value });
    this.setData({ scores });
  },

  setQuestionNote(event) {
    const id = event.currentTarget.dataset.id;
    const scores = Object.assign({}, this.data.scores);
    scores[id] = Object.assign({}, scores[id] || {}, { note: event.detail.value });
    this.setData({ scores });
  },

  setReviewerNote(event) { this.setData({ reviewerNote: event.detail.value }); },

  submitReview() {
    this.setData({ saving: true });
    api.requestStaff("/api/miniapp/staff/academic-assessments/" + encodeURIComponent(this.data.id), {
      method: "PATCH",
      data: { scores: this.data.scores, reviewerNote: this.data.reviewerNote },
      timeout: 20000
    }).then((data) => {
      api.toast(data.message);
      this.load();
    }).catch((err) => api.toast(err.message)).finally(() => this.setData({ saving: false }));
  }
});
