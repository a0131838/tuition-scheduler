const api = require("../../utils/api");

Page({
  data: {
    token: "",
    loading: false
  },

  onLoad(options) {
    if (options && options.token) this.setData({ token: decodeURIComponent(options.token) });
  },

  onInput(e) {
    this.setData({ token: e.detail.value });
  },

  submit() {
    const token = (this.data.token || "").trim();
    if (!token) {
      api.toast("请输入员工绑定码");
      return;
    }
    this.setData({ loading: true });
    api.bindStaffInvite(token)
      .then(() => {
        wx.showToast({ title: "绑定成功", icon: "success" });
        wx.reLaunch({ url: "/pages/staff-home/staff-home" });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  }
});
