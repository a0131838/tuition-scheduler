const api = require("../../utils/api");

function draftKey(report) { return "teacher_report_draft_" + report.kind + "_" + report.id; }

function tabState(tab) {
  return {
    tab,
    noticesTabClass: tab === "notices" ? "active" : "",
    feedbackTabClass: tab === "feedback" ? "active" : "",
    reportsTabClass: tab === "reports" ? "active" : "",
    showNotices: tab === "notices",
    showFeedback: tab === "feedback",
    showReports: tab === "reports"
  };
}

function decorate(data) {
  const summary = data.summary || {};
  const notices = (data.notices || []).map((item) => Object.assign({}, item, {
    cardClass: !item.read && item.important ? "alert" : "",
    titleDisplay: item.titleZh || item.titleEn,
    readText: item.read ? "已读" : "未读",
    needsRead: !item.read
  }));
  const managerFeedbacks = (data.managerFeedbacks || []).map((item) => Object.assign({}, item, {
    cardClass: item.requiresAck && !item.acknowledgedAt ? "alert" : "",
    ackText: item.acknowledgedAt ? "已确认" : "待确认",
    needsAck: item.requiresAck && !item.acknowledgedAt
  }));
  const reports = (data.reports || []).map((item) => Object.assign({}, item, {
    editableText: item.editable ? "可编辑" : "只读",
    actionText: item.editable ? "填写 / 查看" : "查看报告"
  }));
  return {
    summary,
    unreadNoticesText: summary.unreadNotices || "",
    pendingManagerFeedbackText: summary.pendingManagerFeedback || "",
    pendingReportsText: summary.pendingReports || "",
    notices,
    managerFeedbacks,
    reports,
    recommendations: data.recommendations || [],
    noNotices: notices.length === 0,
    noManagerFeedbacks: managerFeedbacks.length === 0,
    noReports: reports.length === 0
  };
}

Page({
  data: Object.assign({ loading: false, saving: false, summary: {}, unreadNoticesText: "", pendingManagerFeedbackText: "", pendingReportsText: "", notices: [], managerFeedbacks: [], reports: [], recommendations: [], selected: null, isMidterm: false, draft: {}, localDraftRestored: false, recommendationIndex: 0 }, tabState("notices")),
  onShow() { if (!this.data.selected) this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  load() {
    this.setData({ loading: true });
    return api.requestStaff("/api/miniapp/staff/teacher/reports", { timeout: 30000 })
      .then((data) => this.setData(decorate(data)))
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },
  switchTab(e) { this.setData(Object.assign(tabState(e.currentTarget.dataset.tab), { selected: null, isMidterm: false })); },
  acknowledgeNotice(e) { this.performAck("ACK_NOTICE", e.currentTarget.dataset.id); },
  acknowledgeFeedback(e) { this.performAck("ACK_MANAGER_FEEDBACK", e.currentTarget.dataset.id); },
  performAck(action, id) {
    api.requestStaff("/api/miniapp/staff/teacher/reports", { method: "POST", data: { action, id }, timeout: 30000 })
      .then(() => { wx.showToast({ title: "已确认", icon: "success" }); return this.load(); })
      .catch((err) => api.toast(err.message));
  },
  editReport(e) {
    const report = this.data.reports.find((row) => row.id === e.currentTarget.dataset.id && row.kind === e.currentTarget.dataset.kind);
    if (!report) return;
    const local = wx.getStorageSync(draftKey(report));
    const draft = local && typeof local === "object" ? Object.assign({}, report.draft || {}, local) : Object.assign({}, report.draft || {});
    const recommendationIndex = Math.max(0, this.data.recommendations.indexOf(draft.recommendedNextStep || ""));
    this.setData({ selected: report, isMidterm: report.kind === "MIDTERM", draft: Object.assign({}, draft, { recommendedNextStepDisplay: draft.recommendedNextStep || "请选择" }), localDraftRestored: Boolean(local), recommendationIndex });
  },
  closeEditor() { this.setData({ selected: null, isMidterm: false, draft: {}, localDraftRestored: false }); },
  inputDraft(e) {
    const key = e.currentTarget.dataset.key;
    const draft = Object.assign({}, this.data.draft, { [key]: e.detail.value || "" });
    this.setData({ draft });
    if (this.data.selected) wx.setStorageSync(draftKey(this.data.selected), draft);
  },
  changeRecommendation(e) {
    const index = Number(e.detail.value || 0);
    const value = this.data.recommendations[index] || "";
    const draft = Object.assign({}, this.data.draft, { recommendedNextStep: value, recommendedNextStepDisplay: value || "请选择" });
    this.setData({ recommendationIndex: index, draft });
    if (this.data.selected) wx.setStorageSync(draftKey(this.data.selected), draft);
  },
  saveDraft() { this.save(false); },
  submitReport() {
    wx.showModal({ title: "确认提交报告", content: "提交后教务会在网页端审核和转发。请先确认内容完整。", confirmText: "确认提交", success: (res) => { if (res.confirm) this.save(true); } });
  },
  save(submit) {
    const report = this.data.selected;
    if (!report || !report.editable) return api.toast("该报告已锁定");
    this.setData({ saving: true });
    api.requestStaff("/api/miniapp/staff/teacher/reports", { method: "POST", data: { action: submit ? "SUBMIT_REPORT" : "SAVE_REPORT", id: report.id, kind: report.kind, draft: this.data.draft, reportPeriodLabel: report.reportPeriodLabel || "" }, timeout: 30000 })
      .then(() => {
        wx.removeStorageSync(draftKey(report));
        wx.showToast({ title: submit ? "已提交" : "草稿已保存", icon: "success" });
        this.closeEditor();
        return this.load();
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ saving: false }));
  }
});
