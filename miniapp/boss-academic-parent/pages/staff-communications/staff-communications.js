const api = require("../../utils/api");

const kindLabels = {
  FEEDBACK: "课后反馈",
  COURSE_REMINDER_PARENT: "发给家长",
  COURSE_REMINDER_TEACHER: "发给老师",
  COURSE_CHANGE: "更正通知"
};
const statusLabels = {
  PENDING_REVIEW: "待审核",
  READY_TO_SEND: "待发送",
  CLAIMED: "处理中",
  RETURNED: "已退回老师",
  ATTENTION: "需更正",
  COMPLETED: "已发送",
  WAIVED: "无需发送"
};
const feedbackSectionLabels = [
  ["lessonFocus", "本节课重点"],
  ["currentFinding", "当前发现"],
  ["classPerformance", "课堂表现"],
  ["nextPlan", "下一步计划"],
  ["parentNote", "家长需要知道"]
];

function teacherRecipient(name) {
  const value = String(name || "").trim();
  if (!value) return "老师";
  return value.endsWith("老师") ? value : `${value}老师`;
}

function shareInfo(item) {
  if (item.kind === "FEEDBACK" && item.feedbackId && item.studentId) {
    return { canShareCard: Boolean(item.feedback && item.feedback.reviewStatus === "PUBLISHED"), shareTitle: `${item.student && item.student.name ? item.student.name : "学生"}课后反馈`, sharePath: `/pages/feedbacks/feedbacks?studentId=${encodeURIComponent(item.studentId)}&feedbackId=${encodeURIComponent(item.feedbackId)}` };
  }
  if (item.kind === "COURSE_REMINDER_TEACHER") {
    const date = item.dueAt ? String(item.dueAt).slice(0, 10) : "";
    return { canShareCard: true, shareTitle: item.title || "老师课程提醒", sharePath: `/pages/staff-schedule/staff-schedule${date ? `?date=${date}` : ""}` };
  }
  if (item.studentId) return { canShareCard: true, shareTitle: item.title || "课程安排提醒", sharePath: `/pages/schedule/schedule?studentId=${encodeURIComponent(item.studentId)}` };
  return { canShareCard: false, shareTitle: "", sharePath: "" };
}

Page({
  data: {
    tasks: [],
    summary: {},
    kindSummary: {},
    loading: false,
    filter: "OPEN",
    kind: "FEEDBACK",
    expandedId: "",
    workstreams: [
      { value: "FEEDBACK", label: "课后反馈", count: 0 },
      { value: "COURSE_REMINDER_PARENT", label: "发给家长", count: 0 },
      { value: "COURSE_REMINDER_TEACHER", label: "发给老师", count: 0 },
      { value: "COURSE_CHANGE", label: "更正通知", count: 0 }
    ],
    filters: [
      { value: "OPEN", label: "待处理" },
      { value: "PENDING_REVIEW", label: "待审核" },
      { value: "READY_TO_SEND", label: "待发送" },
      { value: "ATTENTION", label: "需更正" },
      { value: "COMPLETED", label: "已完成" }
    ]
  },

  onLoad(options) {
    const allowedKinds = this.data.workstreams.map((item) => item.value);
    const allowedStatuses = this.data.filters.map((item) => item.value);
    const kind = options && allowedKinds.includes(options.kind) ? options.kind : this.data.kind;
    const filter = options && allowedStatuses.includes(options.status) ? options.status : this.data.filter;
    this.setData({ kind, filter });
  },

  onShow() { this.load(true); },
  onPullDownRefresh() { this.load(true).finally(() => wx.stopPullDownRefresh()); },

  onShareAppMessage(options) {
    const index = options && options.target && options.target.dataset ? Number(options.target.dataset.index || 0) : -1;
    const row = index >= 0 ? this.data.tasks[index] : null;
    if (!row || !row.canShareCard) return { title: "博思学业管家", path: "/pages/home/home" };
    api.requestStaff(`/api/miniapp/staff/communications/${row.id}`, { method: "PATCH", data: { action: "share_card", data: { destination: row.groupDraft || (row.isTeacherReminder ? "老师微信" : "家长微信群") } } }).catch(() => null);
    return { title: row.shareTitle, path: row.sharePath };
  },

  load(sync) {
    this.setData({ loading: true });
    const syncTask = sync ? api.requestStaff("/api/miniapp/staff/communications", { method: "POST", timeout: 30000 }) : Promise.resolve();
    return syncTask.then(() => api.requestStaff(`/api/miniapp/staff/communications?status=${this.data.filter}&kind=${this.data.kind}&limit=300`, { timeout: 30000 }))
      .then((data) => {
        const kindSummary = data.kindSummary || {};
        const workstreams = this.data.workstreams.map((item) => Object.assign({}, item, { count: kindSummary[item.value] || 0 }));
        const tasks = (data.tasks || []).map((item) => {
          const sections = item.feedback && item.feedback.sections ? item.feedback.sections : {};
          const feedbackSectionRows = feedbackSectionLabels.map(([key, label]) => ({ key, label, value: sections[key] || "未填写" }));
          if (item.feedback) {
            feedbackSectionRows.push({ key: "homework", label: "本次作业", value: item.feedback.homework || "未填写" });
            feedbackSectionRows.push({ key: "previousHomework", label: "上次作业完成情况", value: item.feedback.previousHomeworkDone === true ? "已完成" : item.feedback.previousHomeworkDone === false ? "未完成" : "未填写" });
          }
          return Object.assign({}, item, shareInfo(item), {
            kindLabel: kindLabels[item.kind] || item.kind,
            statusLabel: statusLabels[item.status] || item.status,
            isFeedback: item.kind === "FEEDBACK",
            isTeacherReminder: item.kind === "COURSE_REMINDER_TEACHER",
            recipientLabel: item.kind === "COURSE_REMINDER_TEACHER" ? teacherRecipient(item.teacher && item.teacher.name) : (item.student && item.student.name ? `${item.student.name}家长` : "家长"),
            feedbackNeedsPublish: item.kind === "FEEDBACK" && item.feedback && item.feedback.reviewStatus !== "PUBLISHED",
            feedbackFlowLabel: item.kind !== "FEEDBACK" ? "" : item.status === "COMPLETED" ? "已完成：小程序发布 + 微信群发送" : item.feedback && item.feedback.reviewStatus === "PUBLISHED" ? "第2步：发到家长微信群" : "第1步：审核并发布",
            needsReview: item.status === "PENDING_REVIEW" || item.status === "RETURNED",
            canSend: ["READY_TO_SEND", "CLAIMED", "ATTENTION", "COMPLETED"].includes(item.status),
            isCompleted: item.status === "COMPLETED",
            isAttention: item.status === "ATTENTION",
            parentContentDraft: item.feedback ? (item.feedback.parentContent || item.feedback.content || "") : "",
            groupDraft: item.wechatGroupName || "",
            noteDraft: item.note || "",
            feedbackSectionRows,
            completenessLabel: item.feedback && item.feedback.completeness ? `${item.feedback.completeness.completed}/${item.feedback.completeness.total}` : "",
            missingText: item.feedback && item.feedback.completeness && item.feedback.completeness.missing.length ? `缺少：${item.feedback.completeness.missing.join("、")}` : "",
            latestHistoryText: item.history && item.history[0] ? `${item.history[0].actorName || item.history[0].actorEmail} · ${item.history[0].action}` : "",
            automaticStatusText: ({ SENT: "自动提醒已发送", PENDING: "自动提醒待发送/待授权", PROCESSING: "自动提醒发送中", FAILED: "自动提醒失败", SKIPPED: "旧自动提醒已失效", NOT_QUEUED: "自动提醒未入队" })[(item.automaticNotification || {}).status] || ""
          });
        });
        this.setData({ tasks, summary: data.summary || {}, kindSummary, workstreams });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  changeKind(e) { this.setData({ kind: e.currentTarget.dataset.value, filter: "OPEN", expandedId: "" }, () => this.load(false)); },
  changeFilter(e) { this.setData({ filter: e.currentTarget.dataset.value, expandedId: "" }, () => this.load(false)); },
  toggleTask(e) { const id = e.currentTarget.dataset.id; this.setData({ expandedId: this.data.expandedId === id ? "" : id }); },
  inputParentContent(e) { this.setData({ [`tasks[${e.currentTarget.dataset.index}].parentContentDraft`]: e.detail.value }); },
  inputGroup(e) { this.setData({ [`tasks[${e.currentTarget.dataset.index}].groupDraft`]: e.detail.value }); },
  inputNote(e) { this.setData({ [`tasks[${e.currentTarget.dataset.index}].noteDraft`]: e.detail.value }); },

  patch(id, action, data, nextState) {
    this.setData({ loading: true });
    return api.requestStaff(`/api/miniapp/staff/communications/${id}`, { method: "PATCH", data: { action, data: data || {} }, timeout: 30000 })
      .then(() => new Promise((resolve) => nextState ? this.setData(nextState, resolve) : resolve()))
      .then(() => this.load(false))
      .then(() => true)
      .catch((err) => { api.toast(err.message); return false; })
      .finally(() => this.setData({ loading: false }));
  },

  claim(e) { this.patch(e.currentTarget.dataset.id, "claim"); },
  publish(e) {
    const row = this.data.tasks[e.currentTarget.dataset.index];
    if (!row.parentContentDraft.trim()) return api.toast("请先填写完整的家长展示版反馈");
    if (row.missingText) return api.toast(row.missingText);
    wx.showModal({
      title: "确认发布第1步",
      content: `${row.recipientLabel}\n${row.dateLabel || "课程日期待确认"}\n发布后家长可在小程序查看；接下来仍要人工发送到家长微信群。`,
      success: (res) => {
        if (!res.confirm) return;
        this.patch(row.id, "publish_feedback", { parentContent: row.parentContentDraft }, { filter: "READY_TO_SEND", expandedId: row.id })
          .then((ok) => ok && wx.showModal({ title: "第1步已完成", content: "已自动切换到待发送。请继续复制文案或保存图片，发到家长微信群后确认已发送。", showCancel: false }));
      }
    });
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
    const target = row.isTeacherReminder ? "老师微信" : "家长微信群";
    wx.showModal({ title: `确认已发送到${target}`, content: `${row.dateLabel || "课程日期待确认"}\n请只在实际发送完成后确认，系统会记录操作人和时间。`, success: (res) => res.confirm && this.patch(row.id, "manual_sent", { wechatGroupName: row.groupDraft, note: row.noteDraft, channel: row.isTeacherReminder ? "WECHAT_DIRECT" : "WECHAT_GROUP" }) });
  },
  retry(e) { this.patch(e.currentTarget.dataset.id, "retry_auto"); }
});
