const api = require("../../utils/api");

Page({
  data: {
    id: "",
    request: {
      attachmentUrls: []
    }
  },

  onLoad(options) {
    this.setData({ id: options.id || "" });
    this.load();
  },

  load() {
    if (!this.data.id) return;
    api.request(`/api/miniapp/requests/${this.data.id}`)
      .then((data) => this.setData({ request: data.request || { attachmentUrls: [] } }))
      .catch((err) => api.toast(err.message));
  }
});
