const api = require("../../utils/api");

const kindLabels = {
  FEEDBACK: "课后反馈",
  COURSE_REMINDER_PARENT: "家长课程提醒",
  COURSE_REMINDER_TEACHER: "老师课程提醒",
  COURSE_CHANGE: "课程更正"
};
const statusLabels = {
  PENDING_REVIEW: "待审核",
  READY_TO_SEND: "待发微信群",
  CLAIMED: "处理中",
  RETURNED: "已退回老师",
  ATTENTION: "需更正",
  COMPLETED: "已人工发送",
  WAIVED: "无需发送"
};

Page({
  data: {
    tasks: [],
    summary: {},
    totalOpen: 0,
    loading: false,
    filter: "OPEN",
    filters: [
      { value: "OPEN", label: "待处理" },
      { value: "PENDING_REVIEW", label: "待审核" },
      { value: "READY_TO_SEND", label: "待发群" },
      { value: "ATTENTION", label: "需更正" },
      { value: "COMPLETED", label: "已发送" }
    ]
  },

  onShow() { this.load(true); },
  onPullDownRefresh() { this.load(true).finally(() => wx.stopPullDownRefresh()); },

  load(sync) {
    this.setData({ loading: true });
    const syncTask = sync ? api.requestStaff("/api/miniapp/staff/communications", { method: "POST", timeout: 30000 }) : Promise.resolve();
    return syncTask.then(() => api.requestStaff(`/api/miniapp/staff/communications?status=${this.data.filter}&limit=300`, { timeout: 30000 }))
      .then((data) => {
        const summary = data.summary || {};
        const tasks = (data.tasks || []).map((item) => Object.assign({}, item, {
          kindLabel: kindLabels[item.kind] || item.kind,
          statusLabel: statusLabels[item.status] || item.status,
          isFeedback: item.kind === "FEEDBACK",
          feedbackNeedsPublish: item.kind === "FEEDBACK" && item.feedback && item.feedback.reviewStatus !== "PUBLISHED",
          needsReview: item.status === "PENDING_REVIEW" || item.status === "RETURNED",
          canSend: ["READY_TO_SEND", "CLAIMED", "ATTENTION", "COMPLETED"].includes(item.status),
          isCompleted: item.status === "COMPLETED",
          isAttention: item.status === "ATTENTION",
          parentContentDraft: item.feedback ? (item.feedback.parentContent || item.feedback.content || "") : "",
          groupDraft: item.wechatGroupName || "",
          noteDraft: item.note || "",
          latestHistoryText: item.history && item.history[0] ? `${item.history[0].actorName || item.history[0].actorEmail} · ${item.history[0].action}` : "",
          automaticStatusText: ({ SENT: "自动提醒已发送", PENDING: "自动提醒待发送/待授权", PROCESSING: "自动提醒发送中", FAILED: "自动提醒失败", SKIPPED: "旧自动提醒已失效", NOT_QUEUED: "自动提醒未入队" })[(item.automaticNotification || {}).status] || ""
        }));
        const totalOpen = ["PENDING_REVIEW", "READY_TO_SEND", "CLAIMED", "RETURNED", "ATTENTION"].reduce((sum, key) => sum + (summary[key] || 0), 0);
        this.setData({ tasks, summary, totalOpen });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  changeFilter(e) { this.setData({ filter: e.currentTarget.dataset.value }, () => this.load(false)); },
  inputParentContent(e) { this.setData({ [`tasks[${e.currentTarget.dataset.index}].parentContentDraft`]: e.detail.value }); },
  inputGroup(e) { this.setData({ [`tasks[${e.currentTarget.dataset.index}].groupDraft`]: e.detail.value }); },
  inputNote(e) { this.setData({ [`tasks[${e.currentTarget.dataset.index}].noteDraft`]: e.detail.value }); },

  patch(id, action, data) {
    this.setData({ loading: true });
    return api.requestStaff(`/api/miniapp/staff/communications/${id}`, { method: "PATCH", data: { action, data: data || {} }, timeout: 30000 })
      .then(() => this.load(false))
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  claim(e) { this.patch(e.currentTarget.dataset.id, "claim"); },
  publish(e) {
    const row = this.data.tasks[e.currentTarget.dataset.index];
    if (!row.parentContentDraft.trim()) return api.toast("请先填写家长展示版反馈");
    wx.showModal({ title: "确认发布", content: "发布后家长可在小程序查看，并进入自动提醒和微信群转发流程。", success: (res) => res.confirm && this.patch(row.id, "publish_feedback", { parentContent: row.parentContentDraft }) });
  },
  returnFeedback(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({ title: "退回老师补充", editable: true, placeholderText: "请写清需要补充什么", success: (res) => res.confirm && res.content && this.patch(id, "return_feedback", { note: res.content }) });
  },
  copyMessage(e) {
    const row = this.data.tasks[e.currentTarget.dataset.index];
    wx.setClipboardData({ data: row.messageText, success: () => this.patch(row.id, "copy") });
  },
  saveImage(e) {
    const id = e.currentTarget.dataset.id;
    api.saveStaffImage(`/api/miniapp/staff/communications/${id}/share-image`)
      .then(() => api.toast("转发图片已保存到相册"))
      .catch((err) => api.toast(err.message));
  },
  uploadEvidence(e) {
    const id = e.currentTarget.dataset.id;
    wx.chooseMedia({ count: 1, mediaType: ["image"], sourceType: ["album"], success: (res) => {
      const path = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath;
      if (!path) return;
      api.uploadStaffForm(`/api/miniapp/staff/communications/${id}/evidence`, path, "files", {})
        .then(() => { api.toast("发送截图已上传"); this.load(false); })
        .catch((err) => api.toast(err.message));
    }});
  },
  markSent(e) {
    const row = this.data.tasks[e.currentTarget.dataset.index];
    const target = row.kind === "COURSE_REMINDER_TEACHER" ? "老师微信" : "家长微信群";
    wx.showModal({ title: `确认已发送到${target}`, content: "请只在实际发送完成后确认。系统会永久记录操作人和时间。", success: (res) => res.confirm && this.patch(row.id, "manual_sent", { wechatGroupName: row.groupDraft, note: row.noteDraft, channel: row.kind === "COURSE_REMINDER_TEACHER" ? "WECHAT_DIRECT" : "WECHAT_GROUP" }) });
  },
  retry(e) { this.patch(e.currentTarget.dataset.id, "retry_auto"); }
});
