const api = require("../../utils/api");

Page({
  data: { studentName: "", types: ["普通反馈", "给老师的话", "排课要求", "请假/取消", "财务问题", "学校事务", "投诉", "其他"], typeIndex: 0, urgency: "ROUTINE", content: "", files: [], loading: false },
  onLoad(options) { const preset = options && options.type ? decodeURIComponent(options.type) : ""; const idx = this.data.types.indexOf(preset); if (idx >= 0) this.setData({ typeIndex: idx }); },
  onShow() { this.setData({ studentName: getApp().globalData.currentStudentName || "当前学生" }); },
  onTypeChange(e) { this.setData({ typeIndex: Number(e.detail.value || 0) }); },
  setUrgency(e) { this.setData({ urgency: e.currentTarget.dataset.value === "URGENT" ? "URGENT" : "ROUTINE" }); },
  onContentInput(e) { this.setData({ content: e.detail.value }); },
  chooseFiles() { wx.chooseMessageFile({ count: 9, type: "all", success: (res) => this.setData({ files: res.tempFiles || [] }), fail: () => {} }); },
  submit() {
    const studentId = api.requireStudentPage(); if (!studentId) return;
    if (!this.data.content.trim()) { api.toast("请填写需要我们了解的情况"); return; }
    this.setData({ loading: true });
    api.request(`/api/miniapp/students/${studentId}/requests`, { method: "POST", data: { type: this.data.types[this.data.typeIndex], urgency: this.data.urgency, content: this.data.content.trim() } })
      .then((data) => { const req = data.request; const paths = this.data.files.map((file) => file.path).filter(Boolean); if (!req || !req.id || !paths.length) return data; return api.uploadFiles(`/api/miniapp/requests/${req.id}/attachments`, paths).then(() => data); })
      .then((data) => { wx.showToast({ title: "已提交", icon: "success" }); setTimeout(() => { const id = data.request && data.request.id; wx.redirectTo({ url: id ? `/pages/request-detail/request-detail?id=${id}` : "/pages/requests/requests" }); }, 500); })
      .catch((err) => api.toast(err.message)).finally(() => this.setData({ loading: false }));
  }
});
