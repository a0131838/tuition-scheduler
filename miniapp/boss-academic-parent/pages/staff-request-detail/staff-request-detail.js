const api = require("../../utils/api");

Page({
  data: {
    id: "",
    request: {},
    hasAttachments: false,
    attachments: [],
    attachmentLoading: false,
    loading: false,
    completionResult: "",
    canComplete: false,
    completionBlockReason: "",
    isCompleted: false
    ,schedulingActions: []
    ,hasSchedulingActions: false
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
        const attachments = request.attachments || [];
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
          attachments: attachments.map((item) => Object.assign({}, item, { localPath: "" })),
          hasAttachments: attachments.length > 0,
          completionResult: request.completionResult || "",
          schedulingActions: data.schedulingActions || [],
          hasSchedulingActions: Boolean(data.schedulingActions && data.schedulingActions.length),
          canComplete: capabilities.canComplete === true,
          completionBlockReason: capabilities.completionBlockReason || "",
          isCompleted: request.status === "Completed" || request.status === "Cancelled"
        });
        this.loadAttachmentThumbnails(attachments);
      })
      .catch((err) => api.toast(err.message));
  },

  onCompletionResultInput(e) {
    this.setData({ completionResult: e.detail.value });
  },

  loadAttachmentThumbnails(attachments) {
    (attachments || []).forEach((attachment, index) => {
      if (!attachment.isImage) return;
      api.downloadStaffFile(attachment.previewUrl)
        .then((localPath) => this.setData({ [`attachments[${index}].localPath`]: localPath }))
        .catch(() => {});
    });
  },

  previewAttachment(e) {
    const index = Number(e.currentTarget.dataset.index);
    const selected = this.data.attachments[index];
    if (!selected || this.data.attachmentLoading) return;
    this.setData({ attachmentLoading: true });
    if (!selected.isImage) {
      api.openStaffDocument(selected.previewUrl, selected.name)
        .catch((err) => api.toast(err.message))
        .finally(() => this.setData({ attachmentLoading: false }));
      return;
    }
    const images = this.data.attachments.filter((item) => item.isImage);
    Promise.all(images.map((item) => item.localPath ? Promise.resolve(item.localPath) : api.downloadStaffFile(item.previewUrl)))
      .then((paths) => {
        const selectedImageIndex = images.findIndex((item) => item.url === selected.url);
        wx.previewImage({ current: paths[Math.max(0, selectedImageIndex)], urls: paths });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ attachmentLoading: false }));
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
