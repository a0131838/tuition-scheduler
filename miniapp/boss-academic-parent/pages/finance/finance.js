const api = require("../../utils/api");

function dateText(value) {
  if (!value) return "签署时间未记录";
  const date = new Date(value); if (Number.isNaN(date.getTime())) return "签署时间未记录";
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return `${shifted.getUTCFullYear()}年${shifted.getUTCMonth() + 1}月${shifted.getUTCDate()}日签署`;
}

Page({
  data: { studentName: "", note: "", summary: {}, packages: [], fullCareContracts: [], tuitionContracts: [] },
  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  load() {
    const studentId = api.requireStudentPage(); if (!studentId) return Promise.resolve();
    this.setData({ studentName: getApp().globalData.currentStudentName || "当前学生" });
    return api.request(`/api/miniapp/students/${studentId}/finance`).then((data) => {
      const contracts = (data.contracts || []).map((item) => Object.assign({}, item, { signedAtText: dateText(item.signedAt) }));
      this.setData({
        note: data.note || "",
        summary: data.summary || {},
        packages: data.packages || [],
        fullCareContracts: contracts.filter((item) => item.contractGroup === "FULL_CARE"),
        tuitionContracts: contracts.filter((item) => item.contractGroup !== "FULL_CARE")
      });
    }).catch((err) => api.toast(err.message));
  },
  openInvoice(e) { api.downloadPdf(e.currentTarget.dataset.url).catch((err) => api.toast(err.message)); },
  openReceipt(e) { api.downloadPdf(e.currentTarget.dataset.url).catch((err) => api.toast(err.message)); },
  openContract(e) { api.downloadPdf(e.currentTarget.dataset.url).catch((err) => api.toast(err.message)); },
  contactFinance() { wx.navigateTo({ url: "/pages/request-new/request-new?type=" + encodeURIComponent("财务问题") }); }
});
