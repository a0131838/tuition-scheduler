const api = require("../../utils/api");

function singaporeTimeText(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return `${shifted.getUTCMonth() + 1}月${shifted.getUTCDate()}日 ${String(shifted.getUTCHours()).padStart(2, "0")}:${String(shifted.getUTCMinutes()).padStart(2, "0")}`;
}

function parentAction(request) {
  if (request.status === "Waiting Parent") return "请补充团队所需的信息，提交后我们会继续处理。";
  if (request.status === "Completed") return "已处理完成，请查看下方最终结果。";
  if (request.status === "Cancelled") return "此请求已取消，目前无需操作。";
  if (request.status === "Exception") return "此请求已升级处理，团队会主动联系您。";
  if (request.status === "Waiting Teacher") return "正在等待老师确认，确认后会在这里更新。";
  return "团队正在处理，您暂时无需操作。";
}

Page({
  data: {
    id: "",
    detailsExpanded: false,
    attachmentsExpanded: false,
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
            ownerText: request.owner || request.mainOwner || "博思服务团队",
            actionText: parentAction(request),
            createdAtText: singaporeTimeText(request.createdAt),
            updatedAtText: singaporeTimeText(request.updatedAt)
          })
        });
      })
      .catch((err) => api.toast(err.message));
  },

  toggleDetails() { this.setData({ detailsExpanded: !this.data.detailsExpanded }); },
  toggleAttachments() { this.setData({ attachmentsExpanded: !this.data.attachmentsExpanded }); },
  goBack() { wx.navigateBack(); }
});
