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

  setSession(token) {
    this.globalData.token = token || "";
    if (token) {
      wx.setStorageSync("parent_token", token);
      this.setCurrentPortal("parent");
    }
    else wx.removeStorageSync("parent_token");
  },

  setStaffSession(token, staff) {
    this.globalData.staffToken = token || "";
    this.globalData.staffName = staff && staff.name ? staff.name : "";
    if (token) {
      wx.setStorageSync("staff_token", token);
      this.setCurrentPortal("staff");
    }
    else wx.removeStorageSync("staff_token");
    if (this.globalData.staffName) wx.setStorageSync("staff_name", this.globalData.staffName);
    else wx.removeStorageSync("staff_name");
  },

  setCurrentPortal(portal) {
    const value = portal === "staff" || portal === "parent" ? portal : "";
    this.globalData.currentPortal = value;
    if (value) wx.setStorageSync("current_portal", value);
    else wx.removeStorageSync("current_portal");
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
