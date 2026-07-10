const api = require("../../utils/api");

Page({
  data: {
    id: "",
    request: {
      attachmentUrls: [],
      ticketNoText: "请求详情",
      typeText: "-",
      statusLabelText: "-",
      contentText: "-",
      requestedActionText: "-",
      ownerText: "-"
    }
  },

  onLoad(options) {
    this.setData({ id: options.id || "" });
    this.load();
  },

  load() {
    if (!this.data.id) return;
    api.request(`/api/miniapp/requests/${this.data.id}`)
      .then((data) => {
        const request = data.request || {};
        this.setData({
          request: Object.assign({}, request, {
            attachmentUrls: request.attachmentUrls || [],
            ticketNoText: request.ticketNo || "请求详情",
            typeText: request.type || "-",
            statusLabelText: request.statusLabel || "-",
            contentText: request.content || request.title || "-",
            requestedActionText: request.requestedAction || "-",
            completionResultText: request.completionResult || "",
            ownerText: (request.owner || request.mainOwner || "-") + " · 关闭负责人 " + (request.closeOwner || "-")
          })
        });
      })
      .catch((err) => api.toast(err.message));
  }
});
