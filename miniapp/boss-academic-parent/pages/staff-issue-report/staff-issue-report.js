const api = require("../../utils/api");
const config = require("../../utils/config");

Page({
  data: { severityOptions: ["一般", "影响工作", "紧急"], severityIndex: 1, severity: "影响工作", page: "", description: "", expected: "", screenshotPath: "", screenshotName: "", submitting: false },
  onLoad(query) {
    const pages = getCurrentPages();
    const previous = pages.length > 1 ? pages[pages.length - 2] : null;
    this.setData({ page: String(query.page || (previous && previous.route) || "未知页面") });
  },
  changeSeverity(e) { const index = Number(e.detail.value || 0); this.setData({ severityIndex: index, severity: this.data.severityOptions[index] }); },
  inputDescription(e) { this.setData({ description: e.detail.value || "" }); },
  inputExpected(e) { this.setData({ expected: e.detail.value || "" }); },
  chooseScreenshot() { wx.chooseMedia({ count: 1, mediaType: ["image"], sourceType: ["album", "camera"], success: (res) => { const file = res.tempFiles && res.tempFiles[0]; if (file) this.setData({ screenshotPath: file.tempFilePath, screenshotName: "问题截图" }); } }); },
  submit() {
    if (this.data.submitting || this.data.description.trim().length < 5) return api.toast("请至少用 5 个字说明问题");
    const system = wx.getSystemInfoSync();
    this.setData({ submitting: true });
    api.requestStaff("/api/miniapp/staff/issues", { method: "POST", timeout: 30000, data: { severity: this.data.severity, page: this.data.page, description: this.data.description, expected: this.data.expected, context: { clientVersion: config.clientVersion, platform: system.platform, system: system.system, model: system.model, wechatVersion: system.version, SDKVersion: system.SDKVersion, recentOperations: api.recentOperations() } } })
      .then((data) => {
        if (!this.data.screenshotPath) return data;
        return api.uploadFiles(`/api/miniapp/staff/parent-requests/${encodeURIComponent(data.ticket.id)}/attachments?scope=all`, [this.data.screenshotPath], { staff: true }).then(() => data);
      })
      .then((data) => wx.showModal({ title: "已提交", content: `问题编号：${data.ticket.ticketNo}\n技术人员可以看到版本、页面和最近操作。`, showCancel: false, success: () => wx.navigateBack() }))
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ submitting: false }));
  }
});
