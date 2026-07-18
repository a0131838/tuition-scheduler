const api = require("../../utils/api");

const roleLabels = {
  ADMIN: "管理工作台",
  TEACHER: "老师工作台",
  CS: "教务工作台",
  FINANCE: "财务工作台",
  SALES: "课程顾问工作台"
};

function todayLabel() {
  const date = new Date();
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${date.getMonth() + 1}月${date.getDate()}日 · ${weekdays[date.getDay()]}`;
}

Page({
  data: {
    staffName: "",
    staffNameText: "员工工作台",
    role: "",
    roleText: "员工工作台",
    todayText: todayLabel(),
    isTeacher: false,
    isManager: false,
    isAcademic: false,
    workspaceSubtitle: "课程、请求与服务事务",
    workSectionTitle: "工作入口",
    workSectionHint: "按优先级处理今天的工作",
    priorityLabel: "今日重点",
    priorityTitle: "正在同步工作状态",
    priorityMeta: "下拉可刷新最新数据",
    priorityAction: "查看工作台",
    priorityTone: "tone-calm",
    priorityTarget: "schedule",
    pendingCount: 0,
    hasPendingRequests: false,
    todaySessionCount: 0,
    coordinationCount: 0,
    coordinationOverdueCount: 0,
    hasCoordinationOverdue: false,
    canManageCoordination: false,
    firstSchedulingCount: 0,
    firstSchedulingReadyCount: 0,
    firstSchedulingFirstCount: 0,
    firstSchedulingAttentionCount: 0,
    canManageFirstScheduling: false,
    reminderAttentionCount: 0,
    hasReminderAttention: false,
    canViewReminderAttention: false,
    teacherAvailabilityCount: 0,
    teacherUpcomingCount: 0,
    teacherCompletedCount: 0,
    teacherExpenseCount: 0,
    teacherTodoCount: 0,
    teacherUrgentCount: 0,
    teacherPayrollPending: 0,
    teacherUnreadFeedbackCount: 0,
    nextTeacherSession: null,
    hasNextTeacherSession: false,
    nextTeacherSessionText: "",
    loading: false
  },

  onShow() {
    this.load();
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },

  refreshPresentation() {
    const data = this.data;
    if (data.isTeacher) {
      const next = data.nextTeacherSession;
      const hasUrgent = data.teacherUrgentCount > 0;
      this.setData({
        workspaceSubtitle: "下一节课、课后反馈与个人教学事务",
        workSectionTitle: "教学事务",
        workSectionHint: "课程优先，课后及时完成点名与反馈",
        priorityLabel: hasUrgent ? "需要你处理" : next ? "下一项教学" : "教学安排",
        priorityTitle: hasUrgent ? `${data.teacherUrgentCount} 项教学事务待完成` : next ? `${next.timeText} · ${next.courseLabel}` : "未来 30 天暂无已排课程",
        priorityMeta: hasUrgent ? `工资 ${data.teacherPayrollPending} · 新交接反馈 ${data.teacherUnreadFeedbackCount}` : next ? `${next.studentText} · ${next.locationText}` : "如需更新可用时间，请进入教学事务设置",
        priorityAction: hasUrgent ? "打开我的待办" : next ? "打开课程" : "查看我的课表",
        priorityTone: hasUrgent ? "tone-risk" : "tone-calm",
        priorityTarget: hasUrgent ? "teacher-todos" : next ? "next-session" : "schedule",
        hasNextTeacherSession: Boolean(next),
        nextTeacherSessionText: next ? `${next.timeText} · ${next.studentText}` : ""
      });
      return;
    }

    if (data.isManager) {
      const hasRisk = data.coordinationOverdueCount > 0 || data.reminderAttentionCount > 0;
      this.setData({
        workspaceSubtitle: "先看异常，再看进度与分配",
        workSectionTitle: "运营入口",
        workSectionHint: "异常、排课与家长服务集中处理",
        priorityLabel: hasRisk ? "需要管理关注" : "今日运营",
        priorityTitle: data.coordinationOverdueCount > 0 ? `${data.coordinationOverdueCount} 条排课工单已逾期` : "当前没有逾期排课工单",
        priorityMeta: `${data.coordinationCount} 条开放排课 · ${data.reminderAttentionCount} 条提醒异常`,
        priorityAction: data.coordinationOverdueCount > 0 ? "处理逾期" : "查看课程工作台",
        priorityTone: hasRisk ? "tone-risk" : "tone-calm",
        priorityTarget: data.coordinationOverdueCount > 0 ? "coordination" : "schedule"
      });
      return;
    }

    const hasRequest = data.pendingCount > 0;
    this.setData({
      workspaceSubtitle: data.isAcademic ? "家长请求、排课与学生安排" : "课程、请求与服务事务",
      workSectionTitle: data.isAcademic ? "教务处理" : "工作入口",
      workSectionHint: "从待办进入，处理结果留在系统",
      priorityLabel: hasRequest ? "优先处理" : "今日服务",
      priorityTitle: hasRequest ? `${data.pendingCount} 条家长请求待查看` : "当前没有待处理家长请求",
      priorityMeta: `${data.coordinationCount} 条开放排课 · ${data.firstSchedulingAttentionCount} 名学生需关注`,
      priorityAction: hasRequest ? "处理家长请求" : "查看课程工作台",
      priorityTone: data.coordinationOverdueCount > 0 ? "tone-watch" : "tone-calm",
      priorityTarget: hasRequest ? "requests" : "schedule"
    });
  },

  load() {
    this.setData({ loading: true, todayText: todayLabel() });

    const meTask = api.requestStaff("/api/miniapp/staff/me", { timeout: 12000 })
      .then((me) => {
        const staff = me.staff || {};
        this.setData({
          staffName: staff.name || "",
          staffNameText: staff.name || "员工工作台",
          role: staff.role || "",
          roleText: roleLabels[staff.role] || "员工工作台",
          isTeacher: staff.role === "TEACHER",
          isManager: staff.role === "ADMIN",
          isAcademic: staff.role === "CS"
        });
        this.refreshPresentation();
      })
      .catch((err) => {
        if (String(err.message || "").toLowerCase().includes("unauthorized")) {
          getApp().setStaffSession("", null);
          wx.redirectTo({ url: "/pages/staff-login/staff-login" });
          return;
        }
        api.toast("员工信息加载失败");
      });

    return meTask.then(() => {
      const scheduleTask = api.requestStaff("/api/miniapp/staff/schedule", { timeout: 12000 })
        .then((schedule) => {
          this.setData({ todaySessionCount: schedule.summary ? schedule.summary.visibleSessions : 0 });
          this.refreshPresentation();
        })
        .catch(() => this.setData({ todaySessionCount: 0 }));

      if (this.data.isTeacher) {
        const teacherTask = api.requestStaff("/api/miniapp/staff/teacher/dashboard", { timeout: 12000 })
          .then((data) => {
            const nextTeacherSession = (data.upcoming || [])[0] || null;
            this.setData({
              teacherAvailabilityCount: data.availabilityCount || 0,
              teacherUpcomingCount: data.upcomingCount || 0,
              teacherCompletedCount: data.completedThisMonth || 0,
              teacherExpenseCount: (data.expenseNeedsAction || 0) + (data.expenseInProgress || 0),
              nextTeacherSession
            });
            this.refreshPresentation();
          })
          .catch(() => {
            this.setData({ teacherAvailabilityCount: 0, teacherUpcomingCount: 0, teacherCompletedCount: 0, teacherExpenseCount: 0, nextTeacherSession: null });
            this.refreshPresentation();
          });
        const todoTask = api.requestStaff("/api/miniapp/staff/teacher/todos", { timeout: 30000 })
          .then((data) => {
            const summary = data.summary || {};
            const teacherUrgentCount = (summary.payrollPending || 0) + (summary.attendancePending || 0) + (summary.feedbackPending || 0) + (summary.rejectedExpenses || 0);
            this.setData({
              teacherTodoCount: data.total || 0,
              teacherUrgentCount,
              teacherPayrollPending: summary.payrollPending || 0,
              teacherUnreadFeedbackCount: summary.unreadOtherFeedback || 0
            });
            this.refreshPresentation();
          })
          .catch(() => {
            this.setData({ teacherTodoCount: 0, teacherUrgentCount: 0, teacherPayrollPending: 0, teacherUnreadFeedbackCount: 0 });
            this.refreshPresentation();
          });
        return Promise.allSettled([scheduleTask, teacherTask, todoTask]);
      }

      const requestsTask = api.requestStaff("/api/miniapp/staff/parent-requests?limit=200", { timeout: 12000 })
        .then((requests) => {
          const pendingCount = requests.total || 0;
          this.setData({ pendingCount, hasPendingRequests: pendingCount > 0 });
          this.refreshPresentation();
        })
        .catch(() => this.setData({ pendingCount: 0, hasPendingRequests: false }));

      const coordinationTask = api.requestStaff("/api/miniapp/staff/scheduling-coordination?limit=1", { timeout: 12000 })
        .then((data) => {
          const summary = data.summary || {};
          const coordinationOverdueCount = summary.overdue || 0;
          this.setData({
            canManageCoordination: true,
            coordinationCount: summary.totalOpen || 0,
            coordinationOverdueCount,
            hasCoordinationOverdue: coordinationOverdueCount > 0
          });
          this.refreshPresentation();
        })
        .catch(() => this.setData({ canManageCoordination: false, coordinationCount: 0, coordinationOverdueCount: 0, hasCoordinationOverdue: false }));

      const reminderTask = api.requestStaff("/api/miniapp/staff/reminder-attention", { timeout: 12000 })
        .then((data) => {
          const reminderAttentionCount = data.total || 0;
          this.setData({ canViewReminderAttention: true, reminderAttentionCount, hasReminderAttention: reminderAttentionCount > 0 });
          this.refreshPresentation();
        })
        .catch(() => this.setData({ canViewReminderAttention: false, reminderAttentionCount: 0, hasReminderAttention: false }));

      const firstSchedulingTask = api.requestStaff("/api/miniapp/staff/first-scheduling?limit=1", { timeout: 12000 })
        .then((data) => {
          const summary = data.summary || {};
          this.setData({
            canManageFirstScheduling: true,
            firstSchedulingCount: summary.total || 0,
            firstSchedulingReadyCount: summary.ready || 0,
            firstSchedulingFirstCount: summary.first || 0,
            firstSchedulingAttentionCount: summary.attention || 0
          });
          this.refreshPresentation();
        })
        .catch(() => this.setData({ canManageFirstScheduling: false, firstSchedulingCount: 0, firstSchedulingReadyCount: 0, firstSchedulingFirstCount: 0, firstSchedulingAttentionCount: 0 }));

      return Promise.allSettled([requestsTask, scheduleTask, coordinationTask, reminderTask, firstSchedulingTask]);
    }).finally(() => this.setData({ loading: false }));
  },

  goPriority() {
    if (this.data.priorityTarget === "next-session") return this.goNextTeacherSession();
    if (this.data.priorityTarget === "teacher-todos") return this.goTeacherTodos();
    if (this.data.priorityTarget === "coordination") return this.goCoordination();
    if (this.data.priorityTarget === "requests") return this.goRequests();
    return this.goSchedule();
  },

  goNextTeacherSession() {
    const next = this.data.nextTeacherSession;
    if (next && next.id) wx.navigateTo({ url: `/pages/staff-session-detail/staff-session-detail?id=${next.id}` });
  },

  goRequests() { wx.navigateTo({ url: "/pages/staff-requests/staff-requests" }); },
  goNewRequest() { wx.navigateTo({ url: "/pages/staff-request-new/staff-request-new" }); },
  goSchedule() { wx.navigateTo({ url: "/pages/staff-schedule/staff-schedule" }); },
  goCoordination() { wx.navigateTo({ url: "/pages/staff-coordination/staff-coordination" }); },
  goFirstScheduling() { wx.navigateTo({ url: "/pages/staff-first-scheduling/staff-first-scheduling" }); },
  goReminderAttention() { wx.navigateTo({ url: "/pages/staff-reminder-attention/staff-reminder-attention" }); },
  goTeacherLeave() { wx.navigateTo({ url: "/pages/staff-teacher-leave/staff-teacher-leave" }); },
  goTeacherAvailability() { wx.navigateTo({ url: "/pages/staff-teacher-availability/staff-teacher-availability" }); },
  goTeacherExpenses() { wx.navigateTo({ url: "/pages/staff-teacher-expenses/staff-teacher-expenses" }); },
  goTeacherHistory() { wx.navigateTo({ url: "/pages/staff-teacher-history/staff-teacher-history" }); },
  goTeacherTodos() { wx.navigateTo({ url: "/pages/staff-teacher-todos/staff-teacher-todos" }); },
  goTeacherPayroll() { wx.navigateTo({ url: "/pages/staff-teacher-payroll/staff-teacher-payroll" }); },
  goTeacherFeedbacks() { wx.navigateTo({ url: "/pages/staff-teacher-feedbacks/staff-teacher-feedbacks" }); },
  goAccountSwitch() { wx.navigateTo({ url: "/pages/staff-account-switch/staff-account-switch" }); },

  logout() {
    getApp().setStaffSession("", null);
    wx.redirectTo({ url: "/pages/staff-login/staff-login" });
  },

  goParentPortal() {
    getApp().setCurrentPortal("parent");
    wx.reLaunch({ url: "/pages/login/login" });
  }
});
