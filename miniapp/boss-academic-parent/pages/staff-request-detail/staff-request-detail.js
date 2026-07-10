const api = require("../../utils/api");

Page({
  data: {
    id: "",
    request: {},
    hasAttachments: false,
    loading: false
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
            ownerText: request.owner || request.mainOwner || "-",
            closeOwnerText: request.closeOwner || "-"
          }),
          hasAttachments: attachmentUrls.length > 0
        });
      })
      .catch((err) => api.toast(err.message));
  },

  updateStatus(e) {
    const status = e.currentTarget.dataset.status;
    if (!status || !this.data.id) return;
    this.setData({ loading: true });
    api.requestStaff("/api/miniapp/staff/parent-requests/" + this.data.id, {
      method: "PATCH",
      data: { status }
    })
      .then((data) => {
        const request = data.request || this.data.request;
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
            ownerText: request.owner || request.mainOwner || "-",
            closeOwnerText: request.closeOwner || "-"
          })
        });
        wx.showToast({ title: "已更新", icon: "success" });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  }
});
