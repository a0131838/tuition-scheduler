const api = require("./utils/api");

App({
  globalData: {
    token: "",
    staffToken: "",
    staffName: "",
    currentPortal: "",
    currentStudentId: "",
    currentStudentName: ""
  },

  onLaunch() {
    this.globalData.token = wx.getStorageSync("parent_token") || "";
    this.globalData.staffToken = wx.getStorageSync("staff_token") || "";
    this.globalData.staffName = wx.getStorageSync("staff_name") || "";
    const storedPortal = wx.getStorageSync("current_portal") || "";
    this.globalData.currentPortal = storedPortal || (this.globalData.staffToken && !this.globalData.token ? "staff" : this.globalData.token ? "parent" : "");
    this.globalData.currentStudentId = wx.getStorageSync("current_student_id") || "";
    this.globalData.currentStudentName = wx.getStorageSync("current_student_name") || "";
  },

  onShow() {
    this.staffReminderForeground = true;
    this.startStaffRescheduleReminder();
  },

  onHide() {
    this.staffReminderForeground = false;
    this.stopStaffRescheduleReminder();
  },

  observeRescheduleInbox(listener) {
    this.rescheduleListeners = this.rescheduleListeners || new Set();
    this.rescheduleListeners.add(listener);
    listener(this.rescheduleInbox || null);
    return () => this.rescheduleListeners.delete(listener);
  },

  stopStaffRescheduleReminder() {
    if (this.rescheduleReminderTimer) clearInterval(this.rescheduleReminderTimer);
    this.rescheduleReminderTimer = null;
  },

  startStaffRescheduleReminder() {
    this.stopStaffRescheduleReminder();
    if (!this.staffReminderForeground || this.globalData.currentPortal !== "staff" || !this.globalData.staffToken ||
      !["eva", "emily"].includes(this.globalData.staffName.toLowerCase())) return;
    this.pollStaffRescheduleReminder();
    this.rescheduleReminderTimer = setInterval(() => this.pollStaffRescheduleReminder(), 30000);
  },

  pollStaffRescheduleReminder() {
    if (this.rescheduleReminderLoading) return;
    const token = this.globalData.staffToken;
    this.rescheduleReminderLoading = true;
    api.requestStaff("/api/miniapp/staff/reschedule-notices", { timeout: 10000 }).then(data => {
      if (!this.staffReminderForeground || this.globalData.currentPortal !== "staff" || this.globalData.staffToken !== token) return;
      this.rescheduleInbox = data;
      (this.rescheduleListeners || []).forEach(listener => listener(data));
      const count = data.mine + data.takeover + data.urgent;
      const key = count ? [data.firstTaskId, data.mine, data.overdue, data.takeover, data.urgent].join(":") : "";
      if (key && key !== this.rescheduleReminderKey) {
        const title = data.takeover ? "有超时改课通知可接手" : data.overdue ? "改课通知已超时，请发群" : data.urgent ? "有改课通知需立即跟进" : "有改课通知待发群";
        wx.showToast({ title, icon: "none", duration: 3000 });
      }
      this.rescheduleReminderKey = key;
    }).catch(() => null).finally(() => { this.rescheduleReminderLoading = false; });
  },

  setSession(token) {
    this.globalData.token = token || "";
    if (token) {
      wx.setStorageSync("parent_token", token);
      this.setCurrentPortal("parent");
    }
    else wx.removeStorageSync("parent_token");
  },

  setStaffSession(token, staff) {
    this.rescheduleInbox = null;
    this.rescheduleReminderKey = "";
    this.globalData.staffToken = token || "";
    this.globalData.staffName = staff && staff.name ? staff.name : "";
    if (token) {
      wx.setStorageSync("staff_token", token);
      this.setCurrentPortal("staff");
    }
    else wx.removeStorageSync("staff_token");
    if (this.globalData.staffName) wx.setStorageSync("staff_name", this.globalData.staffName);
    else wx.removeStorageSync("staff_name");
    if (!token) this.stopStaffRescheduleReminder();
  },

  setCurrentPortal(portal) {
    const value = portal === "staff" || portal === "parent" ? portal : "";
    this.globalData.currentPortal = value;
    if (value) wx.setStorageSync("current_portal", value);
    else wx.removeStorageSync("current_portal");
    this.startStaffRescheduleReminder();
  },

  setCurrentStudent(student) {
    const id = student && student.id ? student.id : "";
    const name = student && student.name ? student.name : "";
    this.globalData.currentStudentId = id;
    this.globalData.currentStudentName = name;
    if (id) wx.setStorageSync("current_student_id", id);
    else wx.removeStorageSync("current_student_id");
    if (name) wx.setStorageSync("current_student_name", name);
    else wx.removeStorageSync("current_student_name");
  }
});
