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
    const statusIndex = Math.max(0, statuses.findIndex((item) => item.value === row.status));
    return Object.assign({}, row, {
      statusIndex,
      riskLabel: riskLabels[row.riskLevel] || row.riskLevel,
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
    return api.requestStaff(`/api/miniapp/staff/renewals?status=${this.data.filter}&limit=300`, { timeout: 30000 })
      .then((data) => {
        const tasks = present(data.tasks);
        const now = Date.now();
        const filterOptions = this.data.filterOptions.map((item) => Object.assign({}, item, { className: item.value === this.data.filter ? "active" : "" }));
        this.setData({
          tasks,
          filterOptions,
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
    wx.setClipboardData({ data: row.parentMessage || "", success: () => api.toast("文案已复制，请核对后发到家长群") });
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
    const status = statuses[row.statusIndex].value;
    if (status === "PARENT_NOTIFIED" && !row.hasEvidence) return api.toast("请先上传微信群发送截图");
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
