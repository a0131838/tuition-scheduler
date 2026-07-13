const api = require("../../utils/api");

function todayText() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

Page({
  data: {
    summary: { total: 0, submitted: 0, approved: 0, rejected: 0, paid: 0 }, claims: [],
    types: [], currencies: ["SGD", "CNY", "USD", "HKD", "THB"], typeIndex: 0, currencyIndex: 0,
    expenseDate: todayText(), description: "", studentName: "", location: "", amount: "", gstAmount: "", remarks: "",
    receiptPath: "", receiptName: "", saving: false
  },
  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  load() {
    return api.requestStaff("/api/miniapp/staff/teacher/expenses", { timeout: 12000 })
      .then((data) => this.setData({ summary: data.summary || this.data.summary, claims: data.claims || [], types: data.options ? data.options.types || [] : [], currencies: data.options ? data.options.currencies || this.data.currencies : this.data.currencies }))
      .catch((err) => api.toast(err.message));
  },
  changeDate(e) { this.setData({ expenseDate: e.detail.value }); },
  changeType(e) { this.setData({ typeIndex: Number(e.detail.value || 0) }); },
  changeCurrency(e) { this.setData({ currencyIndex: Number(e.detail.value || 0) }); },
  inputDescription(e) { this.setData({ description: e.detail.value }); },
  inputStudent(e) { this.setData({ studentName: e.detail.value }); },
  inputLocation(e) { this.setData({ location: e.detail.value }); },
  inputAmount(e) { this.setData({ amount: e.detail.value }); },
  inputGst(e) { this.setData({ gstAmount: e.detail.value }); },
  inputRemarks(e) { this.setData({ remarks: e.detail.value }); },
  chooseReceiptFile() {
    wx.chooseMessageFile({ count: 1, type: "all", success: (res) => { const file = (res.tempFiles || [])[0]; if (file) this.setData({ receiptPath: file.path, receiptName: file.name || "已选择附件" }); } });
  },
  chooseReceiptPhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success: (res) => {
        const file = (res.tempFiles || [])[0];
        if (file) this.setData({ receiptPath: file.tempFilePath, receiptName: "收据照片" });
      }
    });
  },
  submit() {
    const type = this.data.types[this.data.typeIndex];
    const currency = this.data.currencies[this.data.currencyIndex];
    if (!type || !this.data.description.trim() || !this.data.amount.trim()) return api.toast("请完整填写类型、说明和金额");
    if (!this.data.receiptPath) return api.toast("请上传收据或发票");
    if (type.code === "TRANSPORT" && !this.data.location.trim()) return api.toast("交通报销必须填写地点");
    if (this.data.saving) return;
    this.setData({ saving: true });
    api.uploadStaffForm("/api/miniapp/staff/teacher/expenses", this.data.receiptPath, "receiptFile", {
      expenseDate: this.data.expenseDate, expenseTypeCode: type.code, currencyCode: currency,
      description: this.data.description.trim(), studentName: this.data.studentName.trim(), location: this.data.location.trim(),
      amount: this.data.amount.trim(), gstAmount: this.data.gstAmount.trim(), remarks: this.data.remarks.trim()
    }).then(() => {
      wx.showToast({ title: "已提交", icon: "success" });
      this.setData({ description: "", studentName: "", location: "", amount: "", gstAmount: "", remarks: "", receiptPath: "", receiptName: "" });
      return this.load();
    }).catch((err) => api.toast(err.message)).finally(() => this.setData({ saving: false }));
  }
});
