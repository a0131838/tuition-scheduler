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
    communicationCount: 0,
    hasCommunicationTasks: false,
    renewalCount: 0,
    renewalDetail: "博思及其他与新东方分开处理",
    hasRenewalTasks: false,
    monthlySchedulingCount: 0,
    hasMonthlySchedulingTasks: false,
    canViewReminderAttention: false,
    teacherAvailabilityCount: 0,
    teacherUpcomingCount: 0,
    teacherCompletedCount: 0,
    teacherExpenseCount: 0,
    teacherTodoCount: 0,
    teacherUrgentCount: 0,
    teacherMetricClass: "",
    teacherPayrollPending: 0,
    teacherUnreadFeedbackCount: 0,
    actionCenterCount: 0,
    assessmentAwaitingCount: 0,
    assessmentRequestCount: 0,
    assessmentActionCount: 0,
    assessmentDetail: "评估码申请、提交与老师复核集中处理",
    canViewAssessments: false,
    canOpenApprovals: false,
    canOpenLeads: false,
    canOpenStudentWorkspace: false,
    canOpenOperations: false,
    nextTeacherSession: null,
    hasNextTeacherSession: false,
    nextTeacherSessionText: "",
    loading: false,
    showAllTools: false
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
      const hasRisk = data.coordinationOverdueCount > 0 || data.reminderAttentionCount > 0 || data.communicationCount > 0;
      this.setData({
        workspaceSubtitle: "先看异常，再看进度与分配",
        workSectionTitle: "运营入口",
        workSectionHint: "异常、排课与家长服务集中处理",
        priorityLabel: hasRisk ? "需要管理关注" : "今日运营",
        priorityTitle: data.monthlySchedulingCount > 0 ? `${data.monthlySchedulingCount} 项下月排课待跟进` : data.communicationCount > 0 ? `${data.communicationCount} 项家长沟通待完成` : data.coordinationOverdueCount > 0 ? `${data.coordinationOverdueCount} 条排课工单已逾期` : "当前没有逾期排课工单",
        priorityMeta: `下月确认 ${data.monthlySchedulingCount} · 沟通 ${data.communicationCount} · 开放排课 ${data.coordinationCount}`,
        priorityAction: data.monthlySchedulingCount > 0 ? "打开下月排课" : data.communicationCount > 0 ? "打开沟通中心" : data.coordinationOverdueCount > 0 ? "处理逾期" : "查看课程工作台",
        priorityTone: hasRisk ? "tone-risk" : "tone-calm",
        priorityTarget: data.monthlySchedulingCount > 0 ? "monthly-scheduling" : data.communicationCount > 0 ? "communications" : data.coordinationOverdueCount > 0 ? "coordination" : "schedule"
      });
      return;
    }

    const hasRequest = data.pendingCount > 0;
    this.setData({
      workspaceSubtitle: data.isAcademic ? "家长请求、排课与学生安排" : "课程、请求与服务事务",
      workSectionTitle: data.isAcademic ? "教务处理" : "工作入口",
      workSectionHint: "从待办进入，处理结果留在系统",
      priorityLabel: hasRequest ? "优先处理" : "今日服务",
      priorityTitle: data.monthlySchedulingCount > 0 ? `${data.monthlySchedulingCount} 项下月排课待跟进` : data.communicationCount > 0 ? `${data.communicationCount} 项家长沟通待完成` : hasRequest ? `${data.pendingCount} 条家长请求待查看` : "当前没有待处理家长请求",
      priorityMeta: `下月确认 ${data.monthlySchedulingCount} · 沟通 ${data.communicationCount} · 开放排课 ${data.coordinationCount}`,
      priorityAction: data.monthlySchedulingCount > 0 ? "打开下月排课" : data.communicationCount > 0 ? "打开沟通中心" : hasRequest ? "处理家长请求" : "查看课程工作台",
      priorityTone: data.coordinationOverdueCount > 0 ? "tone-watch" : "tone-calm",
      priorityTarget: data.monthlySchedulingCount > 0 ? "monthly-scheduling" : data.communicationCount > 0 ? "communications" : hasRequest ? "requests" : "schedule"
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
      const actionCenterTask = api.requestStaff("/api/miniapp/staff/action-center", { timeout: 30000 })
        .then((data) => {
          const capabilities = data.capabilities || {};
          this.setData({
            actionCenterCount: data.total || 0,
            renewalCount: ((data.items || []).find((item) => item.key === "renewals") || {}).count || 0,
            renewalDetail: ((data.items || []).find((item) => item.key === "renewals") || {}).detail || "博思及其他与新东方分开处理",
            hasRenewalTasks: Boolean(((data.items || []).find((item) => item.key === "renewals") || {}).count),
            monthlySchedulingCount: ((data.items || []).find((item) => item.key === "monthly-scheduling") || {}).count || 0,
            hasMonthlySchedulingTasks: Boolean(((data.items || []).find((item) => item.key === "monthly-scheduling") || {}).count),
            canOpenApprovals: Boolean(capabilities.approvals),
            canOpenLeads: Boolean(capabilities.leads),
            canOpenStudentWorkspace: Boolean(capabilities.studentWorkspace),
            canOpenOperations: Boolean(capabilities.operations)
          });
        })
        .catch(() => this.setData({ actionCenterCount: 0, canOpenApprovals: false, canOpenLeads: false, canOpenStudentWorkspace: false, canOpenOperations: false }));
      const scheduleTask = api.requestStaff("/api/miniapp/staff/schedule", { timeout: 12000 })
        .then((schedule) => {
          this.setData({ todaySessionCount: schedule.summary ? schedule.summary.visibleSessions : 0 });
          this.refreshPresentation();
        })
        .catch(() => this.setData({ todaySessionCount: 0 }));
      const assessmentTask = api.requestStaff("/api/miniapp/staff/academic-assessments?limit=1", { timeout: 12000 })
        .then((data) => {
          const awaiting = data.awaitingCount || 0;
          const requests = data.requestOpenCount || 0;
          this.setData({
            assessmentAwaitingCount: awaiting,
            assessmentRequestCount: requests,
            assessmentActionCount: awaiting + requests,
            assessmentDetail: this.data.isTeacher ? "查看受控试测；有开放任务时按评分量表复核" : `申请 ${requests} · 待复核 ${awaiting}`,
            canViewAssessments: true
          });
        })
        .catch(() => this.setData({ assessmentAwaitingCount: 0, assessmentRequestCount: 0, assessmentActionCount: 0, canViewAssessments: false }));

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
              teacherMetricClass: teacherUrgentCount ? "metric-alert" : "",
              teacherPayrollPending: summary.payrollPending || 0,
              teacherUnreadFeedbackCount: summary.unreadOtherFeedback || 0
            });
            this.refreshPresentation();
          })
          .catch(() => {
            this.setData({ teacherTodoCount: 0, teacherUrgentCount: 0, teacherMetricClass: "", teacherPayrollPending: 0, teacherUnreadFeedbackCount: 0 });
            this.refreshPresentation();
          });
        return Promise.allSettled([scheduleTask, teacherTask, todoTask, actionCenterTask, assessmentTask]);
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

      const communicationTask = api.requestStaff("/api/miniapp/staff/communications?status=OPEN&limit=1", { timeout: 30000 })
        .then((data) => {
          const summary = data.summary || {};
          const communicationCount = ["PENDING_REVIEW", "READY_TO_SEND", "CLAIMED", "RETURNED", "ATTENTION"].reduce((sum, key) => sum + (summary[key] || 0), 0);
          this.setData({ communicationCount, hasCommunicationTasks: communicationCount > 0 });
          this.refreshPresentation();
        })
        .catch(() => this.setData({ communicationCount: 0, hasCommunicationTasks: false }));

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

      return Promise.allSettled([requestsTask, scheduleTask, coordinationTask, reminderTask, communicationTask, firstSchedulingTask, actionCenterTask, assessmentTask]);
    }).finally(() => this.setData({ loading: false }));
  },

  goPriority() {
    if (this.data.priorityTarget === "next-session") return this.goNextTeacherSession();
    if (this.data.priorityTarget === "teacher-todos") return this.goTeacherTodos();
    if (this.data.priorityTarget === "coordination") return this.goCoordination();
    if (this.data.priorityTarget === "communications") return this.goCommunications();
    if (this.data.priorityTarget === "monthly-scheduling") return this.goMonthlyScheduling();
    if (this.data.priorityTarget === "requests") return this.goRequests();
    return this.goSchedule();
  },

  goNextTeacherSession() {
    const next = this.data.nextTeacherSession;
    if (next && next.id) wx.navigateTo({ url: `/pages/staff-session-detail/staff-session-detail?id=${next.id}` });
  },

  goAiWork() {
    wx.navigateTo({ url: "/pages/staff-ai-work/staff-ai-work" });
  },

  goRequests() { wx.navigateTo({ url: "/pages/staff-requests/staff-requests" }); },
  goNewRequest() { wx.navigateTo({ url: "/pages/staff-request-new/staff-request-new" }); },
  goSchedule() { wx.navigateTo({ url: "/pages/staff-schedule/staff-schedule" }); },
  goCoordination() { wx.navigateTo({ url: "/pages/staff-coordination/staff-coordination" }); },
  goFirstScheduling() { wx.navigateTo({ url: "/pages/staff-first-scheduling/staff-first-scheduling" }); },
  goReminderAttention() { wx.navigateTo({ url: "/pages/staff-reminder-attention/staff-reminder-attention" }); },
  goCommunications() { wx.navigateTo({ url: "/pages/staff-communications/staff-communications" }); },
  goCommunicationTemplates() { wx.navigateTo({ url: "/pages/staff-communication-templates/staff-communication-templates" }); },
  goRenewals() { wx.navigateTo({ url: "/pages/staff-renewals/staff-renewals" }); },
  goMonthlyScheduling() { wx.navigateTo({ url: "/pages/staff-monthly-scheduling/staff-monthly-scheduling" }); },
  goTeacherLeave() { wx.navigateTo({ url: "/pages/staff-teacher-leave/staff-teacher-leave" }); },
  goTeacherAvailability() { wx.navigateTo({ url: "/pages/staff-teacher-availability/staff-teacher-availability" }); },
  goTeacherExpenses() { wx.navigateTo({ url: "/pages/staff-teacher-expenses/staff-teacher-expenses" }); },
  goTeacherHistory() { wx.navigateTo({ url: "/pages/staff-teacher-history/staff-teacher-history" }); },
  goTeacherTodos() { wx.navigateTo({ url: "/pages/staff-teacher-todos/staff-teacher-todos" }); },
  goTeacherPayroll() { wx.navigateTo({ url: "/pages/staff-teacher-payroll/staff-teacher-payroll" }); },
  goTeacherFeedbacks() { wx.navigateTo({ url: "/pages/staff-teacher-feedbacks/staff-teacher-feedbacks" }); },
  goActionCenter() { wx.navigateTo({ url: "/pages/staff-action-center/staff-action-center" }); },
  goStudentWorkspace() { wx.navigateTo({ url: "/pages/staff-student-workspace/staff-student-workspace" }); },
  goOperations() { wx.navigateTo({ url: "/pages/staff-operations/staff-operations" }); },
  goHealth() { wx.navigateTo({ url: "/pages/staff-health/staff-health" }); },
  goApprovals() { wx.navigateTo({ url: "/pages/staff-approvals/staff-approvals" }); },
  goLeads() { wx.navigateTo({ url: "/pages/staff-leads/staff-leads" }); },
  goTeacherReports() { wx.navigateTo({ url: "/pages/staff-teacher-reports/staff-teacher-reports" }); },
  goAssessments() { wx.navigateTo({ url: "/pages/staff-assessments/staff-assessments" }); },
  goIssueReport() { wx.navigateTo({ url: "/pages/staff-issue-report/staff-issue-report?page=staff-home" }); },
  toggleAllTools() { this.setData({ showAllTools: !this.data.showAllTools }); },
  goAccountSwitch() { wx.navigateTo({ url: "/pages/staff-account-switch/staff-account-switch" }); },

  logout() {
    const app = getApp();
    app.setStaffSession("", null);
    app.setCurrentPortal("");
    wx.reLaunch({ url: "/pages/guide-account/guide-account" });
  },

  goParentPortal() {
    getApp().setCurrentPortal("");
    wx.reLaunch({ url: "/pages/guide-account/guide-account" });
  }
});
