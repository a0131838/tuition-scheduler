const api = require("../../utils/api");

Page({
  data: { loading: true, error: "", report: {}, sections: [], acknowledging: false },

  onLoad(options) {
    this.reportId = options.id || "";
    this.load();
  },

  load() {
    const studentId = api.requireStudentPage();
    if (!studentId || !this.reportId) return Promise.resolve();
    this.setData({ loading: true, error: "" });
    return api.request(`/api/miniapp/students/${studentId}/care-reports/${this.reportId}`)
      .then((data) => {
        const report = data.report || {};
        const definitions = [
          ["本期结论", "overallSummary"], ["学业进展", "academicSummary"], ["学校沟通", "schoolSummary"],
          ["生活与状态", "lifeSummary"], ["风险与专业判断", "riskSummary"], ["已完成行动", "actionsCompleted"],
          ["服务交付证据", "evidenceSummary"], ["下一阶段计划", "nextPlan"], ["学生需要完成", "studentActions"],
          ["家长需要配合", "parentActions"]
        ];
        this.setData({ report, sections: definitions.filter((row) => report[row[1]]).map((row) => ({ title: row[0], body: report[row[1]] })) });
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

  openPdf() {
    const studentId = api.requireStudentPage();
    if (!studentId) return;
    wx.showLoading({ title: "正在生成" });
    api.downloadPdf(`/api/miniapp/students/${studentId}/care-reports/${this.reportId}/pdf`)
      .catch((err) => api.toast(err.message))
      .finally(() => wx.hideLoading());
  }
});
