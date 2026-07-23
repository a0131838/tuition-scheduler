const api = require("../../utils/api");

const statuses = [
  { value: "PENDING_CONTACT", label: "待联系家长" },
  { value: "PARENT_NOTIFIED", label: "已提醒家长" },
  { value: "PARENT_CONSIDERING", label: "家长考虑中" },
  { value: "RENEWAL_CONFIRMED", label: "已确认续费" },
  { value: "CONTRACT_BILLING", label: "合同/账单处理中" },
  { value: "PAYMENT_PENDING", label: "待确认付款" },
  { value: "PAYMENT_CONFIRMED", label: "已付款·待开通课包" },
  { value: "PACKAGE_ACTIVE", label: "新课包已生效" },
  { value: "NOT_RENEWING", label: "暂不续费" },
  { value: "PAUSED_SPECIAL", label: "停课/特殊处理" }
];
const xdfStatuses = statuses.map((item) => Object.assign({}, item, {
  label: {
    PENDING_CONTACT: "待联系新东方",
    PARENT_NOTIFIED: "已通知新东方",
    PARENT_CONSIDERING: "新东方确认中",
    RENEWAL_CONFIRMED: "已确认续课"
  }[item.value] || item.label
}));

const riskLabels = {
  YELLOW: "提前关注",
  ORANGE: "尽快联系",
  RED: "优先处理",
  EXHAUSTED: "课时已不足"
};

function formatMinutes(value) {
  const total = Number(value || 0);
  if (total <= 0) return "0小时";
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${hours ? `${hours}小时` : ""}${minutes ? `${minutes}分钟` : ""}`;
}

function formatDate(value) {
  if (!value) return "未计算";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未计算";
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function present(tasks) {
  return (tasks || []).map((row) => {
    const statusOptions = row.cohort === "XDF" ? xdfStatuses : statuses;
    const statusIndex = Math.max(0, statusOptions.findIndex((item) => item.value === row.status));
    return Object.assign({}, row, {
      statusIndex,
      statusOptions,
      riskLabel: riskLabels[row.riskLevel] || row.riskLevel,
      sourceBadge: row.cohort === "XDF" ? "新东方" : row.sourceLabel,
      communicationTitle: row.cohort === "XDF" ? "发到新东方对接群的文案" : "发到家长微信群的文案",
      groupFieldLabel: row.cohort === "XDF" ? "新东方对接群" : "家长微信群",
      responseFieldLabel: row.cohort === "XDF" ? "新东方回复" : "家长回复",
      groupPlaceholder: row.cohort === "XDF" ? "填写新东方项目对接群" : "填写实际群名",
      responsePlaceholder: row.cohort === "XDF" ? "记录项目负责人回复和下一步" : "记录家长原意、顾虑和下一步",
      balanceText: row.packageType === "MONTHLY" ? "有效期预警" : formatMinutes(row.remainingMinutes),
      scheduledText: formatMinutes(row.scheduledMinutes),
      weeklyText: formatMinutes(row.recentWeeklyMinutes),
      depletionText: formatDate(row.expectedDepletionAt),
      followUpText: formatDate(row.nextFollowUpAt),
      ownerDraft: row.ownerName || "Emily",
      groupDraft: row.parentWechatGroupName || "",
      responseDraft: row.parentResponse || "",
      noteDraft: row.note || "",
      nextFollowUpDraft: row.nextFollowUpAt ? String(row.nextFollowUpAt).slice(0, 16) : "",
      hasEvidence: Boolean(row.evidenceUrl),
      ownerDisplay: row.ownerName || "未分配",
      lessonsDisplay: row.lessonsRemaining === null ? "-" : row.lessonsRemaining,
      uploadLabel: row.evidenceUrl ? "重新上传微信群截图" : "从相册上传微信群截图",
      evidenceClass: row.evidenceUrl ? "done" : "",
      evidenceText: row.evidenceUrl ? "已上传发送截图" : "确认已提醒家长前必须上传截图",
      showDetail: false,
      cardClass: ["RED", "EXHAUSTED"].includes(row.riskLevel) ? "danger" : row.riskLevel === "ORANGE" ? "warning" : ""
    });
  });
}

Page({
  data: {
    tasks: [],
    statuses,
    loading: false,
    filter: "OPEN",
    cohort: "BOSS_OTHER",
    cohortOptions: [
      { value: "BOSS_OTHER", label: "博思及其他", count: 0, className: "active" },
      { value: "XDF", label: "新东方学生", count: 0, className: "" }
    ],
    cohortHint: "当前队列不包含新东方学生。",
    filterOptions: [
      { value: "OPEN", label: "待跟进", className: "active" },
      { value: "COMPLETED", label: "已结束", className: "" }
    ],
    expandedId: "",
    total: 0,
    urgent: 0,
    due: 0,
    showEmpty: false
  },

  onShow() { this.syncAndLoad(); },
  onPullDownRefresh() { this.syncAndLoad().finally(() => wx.stopPullDownRefresh()); },

  syncAndLoad() {
    this.setData({ loading: true });
    return api.requestStaff("/api/miniapp/staff/renewals", { method: "POST", timeout: 30000 })
      .then(() => this.load())
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false, showEmpty: this.data.tasks.length === 0 }));
  },

  load() {
    return api.requestStaff(`/api/miniapp/staff/renewals?status=${this.data.filter}&cohort=${this.data.cohort}&limit=300`, { timeout: 30000 })
      .then((data) => {
        const tasks = present(data.tasks);
        const now = Date.now();
        const filterOptions = this.data.filterOptions.map((item) => Object.assign({}, item, { className: item.value === this.data.filter ? "active" : "" }));
        const counts = data.cohortCounts || {};
        const cohortOptions = this.data.cohortOptions.map((item) => Object.assign({}, item, {
          count: Number(counts[item.value] || 0),
          className: item.value === this.data.cohort ? "active" : ""
        }));
        this.setData({
          tasks,
          filterOptions,
          cohortOptions,
          total: tasks.length,
          urgent: tasks.filter((row) => ["RED", "EXHAUSTED"].includes(row.riskLevel)).length,
          due: tasks.filter((row) => row.nextFollowUpAt && new Date(row.nextFollowUpAt).getTime() <= now).length,
          showEmpty: !this.data.loading && tasks.length === 0
        });
      });
  },

  changeFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.value, expandedId: "" }, () => this.load().catch((err) => api.toast(err.message)));
  },
  changeCohort(e) {
    const cohort = e.currentTarget.dataset.value;
    this.setData({
      cohort,
      expandedId: "",
      cohortHint: cohort === "XDF" ? "单独对接新东方项目负责人，不与普通家长续费混合。" : "当前队列不包含新东方学生。"
    }, () => this.load().catch((err) => api.toast(err.message)));
  },
  toggle(e) {
    const expandedId = this.data.expandedId === e.currentTarget.dataset.id ? "" : e.currentTarget.dataset.id;
    this.setData({ expandedId, tasks: this.data.tasks.map((item) => Object.assign({}, item, { showDetail: item.id === expandedId })) });
  },
  inputField(e) { this.setData({ [`tasks[${e.currentTarget.dataset.index}].${e.currentTarget.dataset.field}`]: e.detail.value }); },
  changeStatus(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ [`tasks[${index}].statusIndex`]: Number(e.detail.value) });
  },
  copyMessage(e) {
    const row = this.data.tasks[e.currentTarget.dataset.index];
    wx.setClipboardData({ data: row.parentMessage || "", success: () => api.toast(`文案已复制，请核对后发给${row.communicationAudience}`) });
  },
  uploadEvidence(e) {
    const row = this.data.tasks[e.currentTarget.dataset.index];
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album"],
      success: (res) => {
        const path = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath;
        if (!path) return;
        api.uploadStaffForm(`/api/miniapp/staff/renewals/${row.id}/evidence`, path, "files", {})
          .then(() => { api.toast("微信群截图已上传"); this.load(); })
          .catch((err) => api.toast(err.message));
      }
    });
  },
  save(e) {
    const row = this.data.tasks[e.currentTarget.dataset.index];
    const status = row.statusOptions[row.statusIndex].value;
    if (status === "PARENT_NOTIFIED" && !row.hasEvidence) return api.toast(`请先上传通知${row.communicationAudience}的微信群截图`);
    this.setData({ loading: true });
    api.requestStaff(`/api/miniapp/staff/renewals/${row.id}`, {
      method: "PATCH",
      timeout: 30000,
      data: {
        status,
        ownerName: row.ownerDraft,
        parentWechatGroupName: row.groupDraft,
        parentResponse: row.responseDraft,
        note: row.noteDraft,
        nextFollowUpAt: row.nextFollowUpDraft || null
      }
    })
      .then(() => { api.toast("已保存并记录日志"); return this.load(); })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  }
});
