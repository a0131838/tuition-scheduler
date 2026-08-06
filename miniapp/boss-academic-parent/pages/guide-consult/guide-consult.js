const api = require("../../utils/api");

Page({
  data: {
    summary: "",
    consent: false,
    loading: false
  },

  onLoad(options) {
    this.setData({ summary: decodeURIComponent(options.summary || "") });
  },

  toggleConsent(event) {
    this.setData({ consent: (event.detail.value || []).includes("yes") });
  },

  openPrivacy() {
    wx.navigateTo({ url: "/pages/guide-privacy/guide-privacy" });
  },

  submit(event) {
    const values = event.detail.value || {};
    if (!String(values.parentName || "").trim() || !String(values.studentName || "").trim()) {
      api.toast("请填写家长称呼和孩子称呼");
      return;
    }
    if (!String(values.parentWechat || "").trim()) {
      api.toast("请填写微信号");
      return;
    }
    if (!String(values.needs || "").trim()) {
      api.toast("请填写目前最想解决的问题");
      return;
    }
    if (!this.data.consent) {
      api.toast("请确认资料使用授权");
      return;
    }
    this.setData({ loading: true });
    api.request("/api/public/school-guide/inquiries", {
      method: "POST",
      data: {
        parentName: values.parentName,
        studentName: values.studentName,
        parentWechat: values.parentWechat,
        needs: values.needs,
        assessmentSummary: this.data.summary,
        consent: "yes",
        website: ""
      }
    })
      .then((data) => {
        wx.showModal({
          title: "已收到",
          content: data.duplicate ? "已补充到原有咨询记录。" : "咨询编号：" + (data.leadNo || "-"),
          showCancel: false,
          success: () => wx.navigateBack()
        });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  }
});
