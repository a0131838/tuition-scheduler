const api = require("../../utils/api");

Page({
  data: {
    id: "",
    request: {},
    hasAttachments: false,
    loading: false,
    completionResult: "",
    canComplete: false,
    completionBlockReason: "",
    isCompleted: false
  },

  onLoad(options) {
    this.setData({ id: options.id || "" });
    this.load();
  },

  load() {
    if (!this.data.id) return Promise.resolve();
    return api.requestStaff("/api/miniapp/staff/parent-requests/" + this.data.id)
      .then((data) => {
        const request = data.request || {};
        const capabilities = data.capabilities || {};
        const attachmentUrls = request.attachmentUrls || [];
        this.setData({
          request: Object.assign({}, request, {
            ticketNoText: request.ticketNo || "请求处理",
            studentNameText: request.studentName || "-",
            typeText: request.type || "-",
            statusLabelText: request.statusLabel || "-",
            contentText: request.content || request.title || "-",
            internalContentText: request.internalContent || "",
            communicationSourceText: request.communicationSource || "",
            createdByNameText: request.createdByName || "",
            requestedActionText: request.requestedAction || "-",
            completionResultText: request.completionResult || "",
            ownerText: request.owner || request.mainOwner || "-",
            closeOwnerText: request.closeOwner || "-"
          }),
          hasAttachments: attachmentUrls.length > 0,
          completionResult: request.completionResult || "",
          canComplete: capabilities.canComplete === true,
          completionBlockReason: capabilities.completionBlockReason || "",
          isCompleted: request.status === "Completed" || request.status === "Cancelled"
        });
      })
      .catch((err) => api.toast(err.message));
  },

  onCompletionResultInput(e) {
    this.setData({ completionResult: e.detail.value });
  },

  updateStatus(e) {
    const status = e.currentTarget.dataset.status;
    if (!status || !this.data.id) return;
    const completionResult = this.data.completionResult.trim();
    if (status === "Completed" && !completionResult) {
      api.toast("请先填写对外处理结果");
      return;
    }
    this.setData({ loading: true });
    api.requestStaff("/api/miniapp/staff/parent-requests/" + this.data.id, {
      method: "PATCH",
      data: status === "Completed" ? { status, completionResult } : { status }
    })
      .then((data) => {
        const request = data.request || this.data.request;
        const capabilities = data.capabilities || {};
        this.setData({
          request: Object.assign({}, request, {
            ticketNoText: request.ticketNo || "请求处理",
            studentNameText: request.studentName || "-",
            typeText: request.type || "-",
            statusLabelText: request.statusLabel || "-",
            contentText: request.content || request.title || "-",
            internalContentText: request.internalContent || "",
            communicationSourceText: request.communicationSource || "",
            createdByNameText: request.createdByName || "",
            requestedActionText: request.requestedAction || "-",
            completionResultText: request.completionResult || "",
            ownerText: request.owner || request.mainOwner || "-",
            closeOwnerText: request.closeOwner || "-"
          }),
          canComplete: capabilities.canComplete === true,
          completionBlockReason: capabilities.completionBlockReason || "",
          isCompleted: request.status === "Completed" || request.status === "Cancelled"
        });
        wx.showToast({ title: "已更新", icon: "success" });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  }
});
