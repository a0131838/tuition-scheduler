const api = require("../../utils/api");

Page({
  data: { loading: true, saving: false, templates: [], categories: [], categoryIndex: 0, visibleTemplates: [], templateIndex: 0, selected: null, variables: [], messageText: "" },
  onLoad() { this.load(); },
  load() {
    this.setData({ loading: true });
    return api.requestStaff("/api/miniapp/staff/communication-templates", { timeout: 15000 })
      .then((data) => {
        const templates = data.templates || [];
        const categories = Array.from(new Set(templates.map((row) => row.category)));
        this.setData({ templates, categories, categoryIndex: 0 });
        this.selectCategory(0);
      }).catch((err) => api.toast(err.message)).finally(() => this.setData({ loading: false }));
  },
  selectCategory(index) {
    const category = this.data.categories[index] || "";
    const visibleTemplates = this.data.templates.filter((row) => row.category === category);
    this.setData({ categoryIndex: index, visibleTemplates, templateIndex: 0 });
    this.selectTemplate(0, visibleTemplates);
  },
  changeCategory(e) { this.selectCategory(Number(e.detail.value || 0)); },
  selectTemplate(index, rows) {
    const selected = (rows || this.data.visibleTemplates)[index] || null;
    const variables = selected ? (selected.variables || []).map((row) => Object.assign({}, row, { value: "" })) : [];
    this.setData({ templateIndex: index, selected, variables, messageText: "" });
  },
  changeTemplate(e) { this.selectTemplate(Number(e.detail.value || 0)); },
  inputVariable(e) { this.setData({ [`variables[${Number(e.currentTarget.dataset.index)}].value`]: e.detail.value }); },
  renderAndCopy() {
    if (!this.data.selected || this.data.saving) return;
    const variables = {};
    this.data.variables.forEach((row) => { variables[row.key] = row.value; });
    this.setData({ saving: true });
    api.requestStaff("/api/miniapp/staff/communication-templates", { method: "POST", timeout: 15000, data: { code: this.data.selected.code, variables } })
      .then((data) => new Promise((resolve, reject) => wx.setClipboardData({ data: data.messageText, success: () => resolve(data), fail: reject })))
      .then((data) => { this.setData({ messageText: data.messageText }); wx.showToast({ title: "已复制", icon: "success" }); })
      .catch((err) => api.toast(err.message || "生成失败"))
      .finally(() => this.setData({ saving: false }));
  }
});
