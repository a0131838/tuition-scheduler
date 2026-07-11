const api = require("../../utils/api");

const communicationTargets = ["家长", "老师", "家长和老师", "内部协调"];

function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

Page({
  data: {
    id: "",
    ticket: null,
    communicationTargets,
    targetIndex: 0,
    statusOptions: [],
    statusIndex: 0,
    communicationResult: "",
    nextAction: "",
    nextActionDue: tomorrow(),
    hasAvailabilityUrl: false,
    hasHistory: false,
    loading: false,
    saving: false
  },

  onLoad(options) {
    this.setData({ id: options.id || "" });
    this.load();
  },

  load() {
    if (!this.data.id) return Promise.resolve();
    this.setData({ loading: true });
    return api.requestStaff("/api/miniapp/staff/scheduling-coordination/" + encodeURIComponent(this.data.id))
      .then((data) => {
        const ticket = data.ticket || null;
        const statusOptions = data.statusOptions || [];
        let statusIndex = statusOptions.findIndex((item) => item.value === (ticket ? ticket.status : ""));
        if (statusIndex < 0) statusIndex = 0;
        this.setData({
          ticket,
          statusOptions,
          statusIndex,
          nextAction: ticket ? ticket.nextAction : "",
          nextActionDue: ticket && ticket.nextActionDueDate ? ticket.nextActionDueDate : tomorrow(),
          hasAvailabilityUrl: Boolean(ticket && ticket.availabilityUrl),
          hasHistory: Boolean(ticket && ticket.communicationHistory),
          communicationResult: ""
        });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  changeTarget(e) {
    this.setData({ targetIndex: Number(e.detail.value || 0) });
  },

  changeStatus(e) {
    this.setData({ statusIndex: Number(e.detail.value || 0) });
  },

  inputResult(e) {
    this.setData({ communicationResult: e.detail.value });
  },

  inputNextAction(e) {
    this.setData({ nextAction: e.detail.value });
  },

  changeDueDate(e) {
    this.setData({ nextActionDue: e.detail.value });
  },

  copyAvailabilityLink() {
    if (!this.data.ticket || !this.data.ticket.availabilityUrl) return;
    wx.setClipboardData({ data: this.data.ticket.availabilityUrl });
  },

  save() {
    if (this.data.saving || !this.data.ticket) return;
    const communicationResult = this.data.communicationResult.trim();
    const nextAction = this.data.nextAction.trim();
    const selectedStatus = this.data.statusOptions[this.data.statusIndex];
    if (!communicationResult) {
      api.toast("请填写本次沟通结果");
      return;
    }
    if (!nextAction) {
      api.toast("请填写下一步动作");
      return;
    }
    if (!selectedStatus) {
      api.toast("请选择工单状态");
      return;
    }
    this.setData({ saving: true });
    api.requestStaff("/api/miniapp/staff/scheduling-coordination/" + encodeURIComponent(this.data.id), {
      method: "PATCH",
      data: {
        communicationTarget: communicationTargets[this.data.targetIndex],
        communicationResult,
        status: selectedStatus.value,
        nextAction,
        nextActionDue: this.data.nextActionDue
      }
    })
      .then(() => {
        wx.showToast({ title: "已保存", icon: "success" });
        return this.load();
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ saving: false }));
  }
});
