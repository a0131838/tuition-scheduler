const api = require("../../utils/api");

const roleLabels = {
  ADMIN: "管理",
  TEACHER: "老师",
  CS: "家长服务",
  FINANCE: "财务",
  SALES: "课程顾问"
};

Page({
  data: {
    staffName: "",
    staffNameText: "员工工作台",
    role: "",
    roleText: "员工",
    isTeacher: false,
    pendingCount: 0,
    todaySessionCount: 0,
    coordinationCount: 0,
    coordinationOverdueCount: 0,
    canManageCoordination: false,
    firstSchedulingCount: 0,
    firstSchedulingReadyCount: 0,
    firstSchedulingFirstCount: 0,
    firstSchedulingAttentionCount: 0,
    canManageFirstScheduling: false,
    reminderAttentionCount: 0,
    canViewReminderAttention: false,
    teacherAvailabilityCount: 0,
    teacherUpcomingCount: 0,
    teacherCompletedCount: 0,
    teacherExpenseCount: 0,
    loading: false
  },

  onShow() {
    this.load();
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },

  load() {
    this.setData({
      loading: true,
      staffNameText: this.data.staffNameText || "员工工作台",
      roleText: this.data.roleText || "员工"
    });

    const meTask = api.requestStaff("/api/miniapp/staff/me", { timeout: 12000 })
      .then((me) => {
        const staff = me.staff || {};
        this.setData({
          staffName: staff.name || "",
          staffNameText: staff.name || "员工工作台",
          role: staff.role || "",
          roleText: roleLabels[staff.role] || "员工",
          isTeacher: staff.role === "TEACHER"
        });
      })
      .catch((err) => {
        if (String(err.message || "").toLowerCase().includes("unauthorized")) {
          wx.redirectTo({ url: "/pages/staff-login/staff-login" });
          return;
        }
        api.toast("员工信息加载失败");
      });

    return meTask.then(() => {
      const scheduleTask = api.requestStaff("/api/miniapp/staff/schedule", { timeout: 12000 })
        .then((schedule) => this.setData({ todaySessionCount: schedule.summary ? schedule.summary.visibleSessions : 0 }))
        .catch(() => this.setData({ todaySessionCount: 0 }));

      if (this.data.isTeacher) {
        const teacherTask = api.requestStaff("/api/miniapp/staff/teacher/dashboard", { timeout: 12000 })
          .then((data) => this.setData({
            teacherAvailabilityCount: data.availabilityCount || 0,
            teacherUpcomingCount: data.upcomingCount || 0,
            teacherCompletedCount: data.completedThisMonth || 0,
            teacherExpenseCount: (data.expenseNeedsAction || 0) + (data.expenseInProgress || 0)
          }))
          .catch(() => this.setData({ teacherAvailabilityCount: 0, teacherUpcomingCount: 0, teacherCompletedCount: 0, teacherExpenseCount: 0 }));
        return Promise.allSettled([scheduleTask, teacherTask]);
      }

      const requestsTask = api.requestStaff("/api/miniapp/staff/parent-requests?limit=200", { timeout: 12000 })
      .then((requests) => this.setData({ pendingCount: requests.total || 0 }))
      .catch(() => this.setData({ pendingCount: 0 }));

    const coordinationTask = api.requestStaff("/api/miniapp/staff/scheduling-coordination?limit=1", { timeout: 12000 })
      .then((data) => this.setData({
        canManageCoordination: true,
        coordinationCount: data.summary ? data.summary.totalOpen : 0,
        coordinationOverdueCount: data.summary ? data.summary.overdue : 0
      }))
      .catch(() => this.setData({ canManageCoordination: false, coordinationCount: 0, coordinationOverdueCount: 0 }));

    const reminderTask = api.requestStaff("/api/miniapp/staff/reminder-attention", { timeout: 12000 })
      .then((data) => this.setData({ canViewReminderAttention: true, reminderAttentionCount: data.total || 0 }))
      .catch(() => this.setData({ canViewReminderAttention: false, reminderAttentionCount: 0 }));

    const firstSchedulingTask = api.requestStaff("/api/miniapp/staff/first-scheduling?limit=1", { timeout: 12000 })
      .then((data) => this.setData({
        canManageFirstScheduling: true,
        firstSchedulingCount: data.summary ? data.summary.total : 0,
        firstSchedulingReadyCount: data.summary ? data.summary.ready : 0,
        firstSchedulingFirstCount: data.summary ? data.summary.first : 0,
        firstSchedulingAttentionCount: data.summary ? data.summary.attention : 0
      }))
      .catch(() => this.setData({ canManageFirstScheduling: false, firstSchedulingCount: 0, firstSchedulingReadyCount: 0, firstSchedulingFirstCount: 0, firstSchedulingAttentionCount: 0 }));

      return Promise.allSettled([requestsTask, scheduleTask, coordinationTask, reminderTask, firstSchedulingTask]);
    }).finally(() => this.setData({ loading: false }));
  },

  goRequests() {
    wx.navigateTo({ url: "/pages/staff-requests/staff-requests" });
  },

  goNewRequest() {
    wx.navigateTo({ url: "/pages/staff-request-new/staff-request-new" });
  },

  goSchedule() {
    wx.navigateTo({ url: "/pages/staff-schedule/staff-schedule" });
  },

  goCoordination() {
    wx.navigateTo({ url: "/pages/staff-coordination/staff-coordination" });
  },

  goFirstScheduling() {
    wx.navigateTo({ url: "/pages/staff-first-scheduling/staff-first-scheduling" });
  },

  goReminderAttention() {
    wx.navigateTo({ url: "/pages/staff-reminder-attention/staff-reminder-attention" });
  },

  goTeacherLeave() {
    wx.navigateTo({ url: "/pages/staff-teacher-leave/staff-teacher-leave" });
  },

  goTeacherAvailability() {
    wx.navigateTo({ url: "/pages/staff-teacher-availability/staff-teacher-availability" });
  },

  goTeacherExpenses() {
    wx.navigateTo({ url: "/pages/staff-teacher-expenses/staff-teacher-expenses" });
  },

  goTeacherHistory() {
    wx.navigateTo({ url: "/pages/staff-teacher-history/staff-teacher-history" });
  },

  logout() {
    getApp().setStaffSession("", null);
    wx.redirectTo({ url: "/pages/staff-login/staff-login" });
  }
});
