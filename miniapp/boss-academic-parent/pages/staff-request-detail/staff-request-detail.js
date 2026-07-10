const api = require("../../utils/api");

Page({
  data: {
    id: "",
    request: {},
    loading: false
  },

  onLoad(options) {
    this.setData({ id: options.id || "" });
    this.load();
  },

  load() {
    if (!this.data.id) return Promise.resolve();
    return api.requestStaff("/api/miniapp/staff/parent-requests/" + this.data.id)
      .then((data) => this.setData({ request: data.request || {} }))
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
        this.setData({ request: data.request || this.data.request });
        wx.showToast({ title: "已更新", icon: "success" });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  }
});
