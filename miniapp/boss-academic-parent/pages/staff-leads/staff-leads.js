const api = require("../../utils/api");

function initialForm() {
  const due = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return { studentName: "", parentName: "", parentWechat: "", parentPhone: "", grade: "", school: "", needs: "", initialContent: "", nextAction: "联系家长确认学生情况和课程需求", nextActionDue: due.toISOString().slice(0, 10), sourceType: "自媒体咨询", sourcePlatform: "微信", intentLevel: "Warm" };
}

function presentLeads(rows) {
  return (rows || []).map((item) => Object.assign({}, item, {
    cardClass: item.overdue ? "alert" : "",
    badgeText: item.overdue ? "逾期" : item.status,
    contactText: item.parentName || "家长",
    contactValue: item.parentWechat || item.parentPhone || "未填联系方式",
    nextActionDisplay: item.nextAction || "待安排",
    nextActionTextDisplay: item.nextActionText || "未设日期",
    canCreateTicket: !item.schedulingTicketId
  }));
}

Page({
  data: { loading: false, saving: false, creating: false, createButtonText: "＋ 微信有新家长，立即录入", leads: [], showEmpty: false, options: {}, query: "", form: initialForm(), evidencePath: "", evidenceName: "", sourceTypeIndex: 0, intentIndex: 1 },
  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  load() {
    this.setData({ loading: true });
    return api.requestStaff("/api/miniapp/staff/leads?limit=100&q=" + encodeURIComponent(this.data.query || ""), { timeout: 30000 })
      .then((data) => {
        const leads = presentLeads(data.leads);
        this.setData({ leads, showEmpty: leads.length === 0, options: data.options || {} });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },
  toggleCreate() {
    const creating = !this.data.creating;
    this.setData({ creating, createButtonText: creating ? "收起录入表" : "＋ 微信有新家长，立即录入" });
  },
  inputQuery(e) { this.setData({ query: e.detail.value || "" }); },
  inputField(e) { this.setData({ ["form." + e.currentTarget.dataset.key]: e.detail.value || "" }); },
  changeSource(e) {
    const index = Number(e.detail.value || 0);
    const values = this.data.options.sourceTypes || [];
    this.setData({ sourceTypeIndex: index, "form.sourceType": values[index] || "自媒体咨询" });
  },
  changeIntent(e) {
    const index = Number(e.detail.value || 0);
    const values = this.data.options.intentLevels || ["Hot", "Warm", "Cold"];
    this.setData({ intentIndex: index, "form.intentLevel": values[index] || "Warm" });
  },
  chooseAlbum() {
    wx.chooseMedia({ count: 1, mediaType: ["image"], sourceType: ["album"], success: (res) => { const file = res.tempFiles && res.tempFiles[0]; if (file) this.setData({ evidencePath: file.tempFilePath, evidenceName: "相册截图" }); } });
  },
  chooseWechat() {
    wx.chooseMessageFile({ count: 1, type: "image", success: (res) => { const file = res.tempFiles && res.tempFiles[0]; if (file) this.setData({ evidencePath: file.path, evidenceName: file.name || "微信截图" }); } });
  },
  submit(forceDuplicate) {
    const form = Object.assign({}, this.data.form, { forceDuplicate: Boolean(forceDuplicate) });
    if (!form.studentName.trim() || !form.initialContent.trim()) return api.toast("请填写学生姓名和咨询内容");
    this.setData({ saving: true });
    api.requestStaff("/api/miniapp/staff/leads", { method: "POST", data: form, timeout: 30000 })
      .then((data) => {
        const lead = data.lead || {};
        const upload = this.data.evidencePath && lead.id
          ? api.uploadStaffForm("/api/miniapp/staff/leads/" + encodeURIComponent(lead.id) + "/evidence", this.data.evidencePath, "file", {})
          : Promise.resolve();
        return upload.then(() => {
          wx.showModal({ title: "新咨询已入系统", content: lead.leadNo || "已创建", showCancel: false });
          this.setData({ form: initialForm(), evidencePath: "", evidenceName: "", creating: false, createButtonText: "＋ 微信有新家长，立即录入" });
          return this.load();
        });
      })
      .catch((err) => {
        if (String(err.message || "").includes("duplicate") && !forceDuplicate) {
          wx.showModal({ title: "可能重复咨询", content: "相同微信或电话已存在。请先核对，确定是新咨询才继续。", confirmText: "仍然创建", success: (res) => { if (res.confirm) this.submit(true); } });
        } else api.toast(err.message);
      })
      .finally(() => this.setData({ saving: false }));
  },
  createLead() { this.submit(false); },
  createTicket(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({ title: "创建排课协调工单", content: "这会把新咨询交给教务跟进，不会直接创建课程。", confirmText: "确认创建", success: (res) => {
      if (!res.confirm) return;
      api.requestStaff("/api/miniapp/staff/leads/" + encodeURIComponent(id) + "/scheduling-ticket", { method: "POST", data: {}, timeout: 30000 })
        .then((data) => { wx.showModal({ title: data.reused ? "已有工单" : "工单已创建", content: data.ticket.ticketNo || "可在排课与调课查看", showCancel: false }); return this.load(); })
        .catch((err) => api.toast(err.message));
    }});
  }
});
