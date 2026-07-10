const api = require("../../utils/api");

Page({
  data: {
    token: "",
    parentName: "",
    phone: "",
    relationships: ["监护人", "爸爸", "妈妈", "其他"],
    relationshipIndex: 0,
    loading: false
  },

  onLoad(options) {
    if (options && options.token) this.setData({ token: decodeURIComponent(options.token) });
  },

  onTokenInput(e) {
    this.setData({ token: e.detail.value });
  },

  onNameInput(e) {
    this.setData({ parentName: e.detail.value });
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  onRelationshipChange(e) {
    this.setData({ relationshipIndex: Number(e.detail.value || 0) });
  },

  bindInvite() {
    if (!this.data.token.trim()) {
      api.toast("请填写邀请码");
      return;
    }
    this.setData({ loading: true });
    const ensureLogin = getApp().globalData.token ? Promise.resolve() : api.loginWithWeChat();
    ensureLogin.then(() => api.request("/api/miniapp/auth/bind-invite", {
      method: "POST",
      data: {
        token: this.data.token.trim(),
        relationship: this.data.relationships[this.data.relationshipIndex],
        parentName: this.data.parentName.trim(),
        phone: this.data.phone.trim()
      }
    }))
      .then(() => {
        wx.showToast({ title: "绑定成功", icon: "success" });
        wx.switchTab({ url: "/pages/students/students" });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  }
});
