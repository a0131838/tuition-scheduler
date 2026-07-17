const api = require("../../utils/api");

Page({
  data: {
    loading: true,
    error: "",
    report: {},
    prioritySections: [],
    detailSections: [],
    acknowledging: false,
    questions: [],
    questionText: "",
    submittingQuestion: false
  },

  onLoad(options) {
    this.reportId = options.id || "";
    this.load();
  },

  load() {
    const studentId = api.requireStudentPage();
    if (!studentId || !this.reportId) return Promise.resolve();
    this.setData({ loading: true, error: "" });
    return Promise.all([
      api.request(`/api/miniapp/students/${studentId}/care-reports/${this.reportId}`),
      api.request(`/api/miniapp/students/${studentId}/care-reports/${this.reportId}/questions`)
    ])
      .then(([data, questionData]) => {
        const report = data.report || {};
        const priorityDefinitions = [
          ["已完成行动", "actionsCompleted"], ["下一阶段计划", "nextPlan"],
          ["学生需要完成", "studentActions"], ["家长需要配合", "parentActions"]
        ];
        const detailDefinitions = [
          ["学业进展", "academicSummary"], ["学校沟通", "schoolSummary"], ["生活与状态", "lifeSummary"],
          ["风险与专业判断", "riskSummary"], ["服务交付证据", "evidenceSummary"]
        ];
        const sections = (definitions) => definitions
          .filter((row) => report[row[1]])
          .map((row) => ({ title: row[0], body: report[row[1]] }));
        this.setData({
          report,
          questions: questionData.items || [],
          prioritySections: sections(priorityDefinitions),
          detailSections: sections(detailDefinitions)
        });
      })
      .catch((err) => this.setData({ error: err.message || "报告读取失败" }))
      .finally(() => this.setData({ loading: false }));
  },

  acknowledge() {
    if (this.data.acknowledging || this.data.report.acknowledged) return;
    const studentId = api.requireStudentPage();
    if (!studentId) return;
    this.setData({ acknowledging: true });
    api.request(`/api/miniapp/students/${studentId}/care-reports/${this.reportId}`, { method: "POST" })
      .then(() => {
        this.setData({ "report.acknowledged": true });
        wx.showToast({ title: "已确认收到", icon: "success" });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ acknowledging: false }));
  },

  onQuestionInput(event) {
    this.setData({ questionText: event.detail.value || "" });
  },

  submitQuestion() {
    const question = (this.data.questionText || "").trim();
    if (!question || this.data.submittingQuestion) return;
    const studentId = api.requireStudentPage();
    if (!studentId) return;
    this.setData({ submittingQuestion: true });
    api.request(`/api/miniapp/students/${studentId}/care-reports/${this.reportId}/questions`, { method: "POST", data: { question } })
      .then(() => {
        this.setData({ questionText: "" });
        wx.showToast({ title: "已提交", icon: "success" });
        return this.load();
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ submittingQuestion: false }));
  },

  closeQuestion(event) {
    const questionId = event.currentTarget.dataset.id;
    const studentId = api.requireStudentPage();
    if (!studentId || !questionId) return;
    api.request(`/api/miniapp/students/${studentId}/care-reports/${this.reportId}/questions/${questionId}`, { method: "POST" })
      .then(() => {
        wx.showToast({ title: "已关闭", icon: "success" });
        return this.load();
      })
      .catch((err) => api.toast(err.message));
  },

  openPdf() {
    const studentId = api.requireStudentPage();
    if (!studentId) return;
    wx.showLoading({ title: "正在生成" });
    api.downloadPdf(`/api/miniapp/students/${studentId}/care-reports/${this.reportId}/pdf`)
      .catch((err) => api.toast(err.message))
      .finally(() => wx.hideLoading());
  }
});
