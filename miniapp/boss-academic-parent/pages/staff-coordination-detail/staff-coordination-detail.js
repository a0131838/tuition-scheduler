const api = require("../../utils/api");

const communicationTargets = ["家长", "老师", "家长和老师", "内部协调"];

function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function newScheduleDefaults() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return {
    date: date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate()),
    time: pad2(date.getHours()) + ":" + pad2(date.getMinutes())
  };
}

Page({
  data: {
    id: "",
    ticket: null,
    communicationTargets,
    targetIndex: 0,
    statusOptions: [],
    statusIndex: 0,
    ownerOptions: [],
    ownerIndex: 0,
    upcomingSessions: [],
    hasUpcomingSessions: false,
    communicationResult: "",
    nextAction: "",
    nextActionDue: tomorrow(),
    hasAvailabilityUrl: false,
    hasHistory: false,
    canCreateNewSession: false,
    newScheduleLoading: false,
    newScheduleAllTeachers: [],
    newScheduleSubjects: [],
    hasNewScheduleOptions: false,
    newScheduleSubjectIndex: 0,
    newScheduleSubjectName: "",
    newScheduleLevels: [],
    newScheduleLevelIndex: 0,
    newScheduleLevelName: "不指定级别",
    newScheduleTeachers: [],
    hasNewScheduleTeachers: false,
    newScheduleTeacherIndex: 0,
    newScheduleTeacherName: "",
    newScheduleCampuses: [],
    newScheduleCampusIndex: 0,
    newScheduleCampusName: "",
    newScheduleRooms: [],
    hasNewScheduleRooms: false,
    newScheduleRoomIndex: 0,
    newScheduleRoomName: "",
    newScheduleRequiresRoom: false,
    newScheduleDate: newScheduleDefaults().date,
    newScheduleTime: newScheduleDefaults().time,
    newScheduleDuration: "60",
    newScheduleWeeks: "1",
    newSchedulePreview: null,
    newSchedulePreviewToken: "",
    hasNewSchedulePreview: false,
    newScheduleChecking: false,
    newScheduleSaving: false,
    loading: false,
    saving: false
  },

  onLoad(options) {
    this.setData({ id: options.id || "" });
    this.load();
  },

  load() {
    if (!this.data.id) return Promise.resolve();
    this.setData({ loading: true });
    return api.requestStaff("/api/miniapp/staff/scheduling-coordination/" + encodeURIComponent(this.data.id))
      .then((data) => {
        const ticket = data.ticket || null;
        const statusOptions = data.statusOptions || [];
        const ownerOptions = data.ownerOptions || [];
        let statusIndex = statusOptions.findIndex((item) => item.value === (ticket ? ticket.status : ""));
        if (statusIndex < 0) statusIndex = 0;
        let ownerIndex = ownerOptions.findIndex((item) => item.value === (ticket && ticket.owner !== "-" ? ticket.owner : ""));
        if (ownerIndex < 0) ownerIndex = 0;
        const canCreateNewSession = Boolean(data.capabilities && data.capabilities.canCreateNewSession);
        this.setData({
          ticket,
          statusOptions,
          statusIndex,
          ownerOptions,
          ownerIndex,
          upcomingSessions: data.upcomingSessions || [],
          hasUpcomingSessions: Boolean(data.upcomingSessions && data.upcomingSessions.length),
          nextAction: ticket ? ticket.nextAction : "",
          nextActionDue: ticket && ticket.nextActionDueDate ? ticket.nextActionDueDate : tomorrow(),
          hasAvailabilityUrl: Boolean(ticket && ticket.availabilityUrl),
          hasHistory: Boolean(ticket && ticket.communicationHistory),
          canCreateNewSession,
          communicationResult: ""
        });
        if (canCreateNewSession) return this.loadNewScheduleOptions();
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  loadNewScheduleOptions() {
    this.setData({ newScheduleLoading: true });
    const path = "/api/miniapp/staff/scheduling-coordination/" + encodeURIComponent(this.data.id) + "/new-session";
    return api.requestStaff(path)
      .then((data) => {
        const options = data.options || {};
        const subjects = [];
        (options.courses || []).forEach((course) => {
          (course.subjects || []).forEach((subject) => {
            subjects.push(Object.assign({}, subject, {
              courseId: course.id,
              courseName: course.name,
              label: course.name + " / " + subject.name
            }));
          });
        });
        this.setData({
          newScheduleSubjects: subjects,
          hasNewScheduleOptions: subjects.length > 0 && Boolean(options.campuses && options.campuses.length),
          newScheduleCampuses: options.campuses || [],
          newScheduleAllTeachers: options.teachers || []
        });
        this.applyNewScheduleSubject(0);
        this.applyNewScheduleCampus(0);
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ newScheduleLoading: false }));
  },

  applyNewScheduleSubject(index) {
    const subject = this.data.newScheduleSubjects[index] || null;
    const levels = [{ id: "", name: "不指定级别" }].concat(subject ? (subject.levels || []) : []);
    const teachers = (this.data.newScheduleAllTeachers || []).filter((teacher) => {
      if (!subject) return false;
      return teacher.subjectCourseId === subject.id || (teacher.subjects || []).some((row) => row.id === subject.id);
    });
    this.invalidateNewSchedulePreview({
      newScheduleSubjectIndex: index,
      newScheduleSubjectName: subject ? subject.label : "",
      newScheduleLevels: levels,
      newScheduleLevelIndex: 0,
      newScheduleLevelName: levels[0].name,
      newScheduleTeachers: teachers,
      hasNewScheduleTeachers: teachers.length > 0,
      newScheduleTeacherIndex: 0,
      newScheduleTeacherName: teachers[0] ? teachers[0].name : ""
    });
  },

  applyNewScheduleCampus(index) {
    const campus = this.data.newScheduleCampuses[index] || null;
    const rooms = campus && campus.requiresRoom ? (campus.rooms || []) : [{ id: "", name: "无需教室" }];
    this.invalidateNewSchedulePreview({
      newScheduleCampusIndex: index,
      newScheduleCampusName: campus ? campus.name : "",
      newScheduleRooms: rooms,
      hasNewScheduleRooms: rooms.length > 0,
      newScheduleRoomIndex: 0,
      newScheduleRoomName: rooms[0] ? rooms[0].name : "",
      newScheduleRequiresRoom: Boolean(campus && campus.requiresRoom)
    });
  },

  invalidateNewSchedulePreview(values) {
    this.setData(Object.assign({}, values || {}, {
      newSchedulePreview: null,
      newSchedulePreviewToken: "",
      hasNewSchedulePreview: false
    }));
  },

  changeNewScheduleSubject(e) {
    this.applyNewScheduleSubject(Number(e.detail.value || 0));
  },

  changeNewScheduleLevel(e) {
    const index = Number(e.detail.value || 0);
    const level = this.data.newScheduleLevels[index];
    this.invalidateNewSchedulePreview({ newScheduleLevelIndex: index, newScheduleLevelName: level ? level.name : "" });
  },

  changeNewScheduleTeacher(e) {
    const index = Number(e.detail.value || 0);
    const teacher = this.data.newScheduleTeachers[index];
    this.invalidateNewSchedulePreview({ newScheduleTeacherIndex: index, newScheduleTeacherName: teacher ? teacher.name : "" });
  },

  changeNewScheduleCampus(e) {
    this.applyNewScheduleCampus(Number(e.detail.value || 0));
  },

  changeNewScheduleRoom(e) {
    const index = Number(e.detail.value || 0);
    const room = this.data.newScheduleRooms[index];
    this.invalidateNewSchedulePreview({ newScheduleRoomIndex: index, newScheduleRoomName: room ? room.name : "" });
  },

  changeNewScheduleDate(e) {
    this.invalidateNewSchedulePreview({ newScheduleDate: e.detail.value });
  },

  changeNewScheduleTime(e) {
    this.invalidateNewSchedulePreview({ newScheduleTime: e.detail.value });
  },

  inputNewScheduleDuration(e) {
    this.invalidateNewSchedulePreview({ newScheduleDuration: e.detail.value });
  },

  inputNewScheduleWeeks(e) {
    this.invalidateNewSchedulePreview({ newScheduleWeeks: e.detail.value });
  },

  newSchedulePayload(mode) {
    const subject = this.data.newScheduleSubjects[this.data.newScheduleSubjectIndex];
    const level = this.data.newScheduleLevels[this.data.newScheduleLevelIndex];
    const teacher = this.data.newScheduleTeachers[this.data.newScheduleTeacherIndex];
    const campus = this.data.newScheduleCampuses[this.data.newScheduleCampusIndex];
    const room = this.data.newScheduleRooms[this.data.newScheduleRoomIndex];
    return {
      mode,
      subjectId: subject ? subject.id : "",
      levelId: level ? level.id : "",
      teacherId: teacher ? teacher.id : "",
      campusId: campus ? campus.id : "",
      roomId: room ? room.id : "",
      startAt: this.data.newScheduleDate + "T" + this.data.newScheduleTime + ":00+08:00",
      durationMin: Number(this.data.newScheduleDuration),
      weeks: Number(this.data.newScheduleWeeks),
      previewToken: this.data.newSchedulePreviewToken
    };
  },

  previewNewSchedule() {
    const payload = this.newSchedulePayload("preview");
    if (!payload.subjectId || !payload.teacherId || !payload.campusId) {
      api.toast("请完整选择课程、老师和校区");
      return;
    }
    if (this.data.newScheduleRequiresRoom && !payload.roomId) {
      api.toast("请选择教室");
      return;
    }
    if (!Number.isFinite(payload.durationMin) || payload.durationMin < 15 || payload.durationMin > 360) {
      api.toast("时长需为 15-360 分钟");
      return;
    }
    if (!Number.isInteger(payload.weeks) || payload.weeks < 1 || payload.weeks > 12) {
      api.toast("连续周数需为 1-12 周");
      return;
    }
    const path = "/api/miniapp/staff/scheduling-coordination/" + encodeURIComponent(this.data.id) + "/new-session";
    this.setData({ newScheduleChecking: true });
    api.requestStaff(path, { method: "POST", data: payload, timeout: 30000 })
      .then((data) => this.setData({
        newSchedulePreview: data.preview || null,
        newSchedulePreviewToken: data.previewToken || "",
        hasNewSchedulePreview: Boolean(data.previewToken)
      }))
      .catch((err) => wx.showModal({ title: "无法排课", content: err.message || "排课检查失败", showCancel: false }))
      .finally(() => this.setData({ newScheduleChecking: false }));
  },

  applyNewSchedule() {
    if (!this.data.newSchedulePreviewToken || this.data.newScheduleSaving) return;
    const preview = this.data.newSchedulePreview || {};
    wx.showModal({
      title: "确认新排课",
      content: (preview.scheduleText || "") + "\n" + (preview.teacherName || "") + " · " + (preview.locationText || ""),
      confirmText: "确认排课",
      success: (result) => {
        if (!result.confirm) return;
        const path = "/api/miniapp/staff/scheduling-coordination/" + encodeURIComponent(this.data.id) + "/new-session";
        this.setData({ newScheduleSaving: true });
        api.requestStaff(path, { method: "POST", data: this.newSchedulePayload("apply"), timeout: 30000 })
          .then((data) => {
            wx.showToast({ title: "已排课", icon: "success" });
            if (data.sessionId) {
              setTimeout(() => wx.redirectTo({ url: "/pages/staff-session-detail/staff-session-detail?id=" + encodeURIComponent(data.sessionId) }), 500);
              return null;
            }
            return this.load();
          })
          .catch((err) => wx.showModal({ title: "无法排课", content: err.message || "排课失败", showCancel: false }))
          .finally(() => this.setData({ newScheduleSaving: false }));
      }
    });
  },

  changeTarget(e) {
    this.setData({ targetIndex: Number(e.detail.value || 0) });
  },

  changeStatus(e) {
    this.setData({ statusIndex: Number(e.detail.value || 0) });
  },

  changeOwner(e) {
    this.setData({ ownerIndex: Number(e.detail.value || 0) });
  },

  inputResult(e) {
    this.setData({ communicationResult: e.detail.value });
  },

  inputNextAction(e) {
    this.setData({ nextAction: e.detail.value });
  },

  changeDueDate(e) {
    this.setData({ nextActionDue: e.detail.value });
  },

  copyAvailabilityLink() {
    if (!this.data.ticket || !this.data.ticket.availabilityUrl) return;
    wx.setClipboardData({ data: this.data.ticket.availabilityUrl });
  },

  openSession(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: "/pages/staff-session-detail/staff-session-detail?id=" + encodeURIComponent(id) });
  },

  save() {
    if (this.data.saving || !this.data.ticket) return;
    const communicationResult = this.data.communicationResult.trim();
    const nextAction = this.data.nextAction.trim();
    const selectedStatus = this.data.statusOptions[this.data.statusIndex];
    const selectedOwner = this.data.ownerOptions[this.data.ownerIndex];
    if (!communicationResult) {
      api.toast("请填写本次沟通结果");
      return;
    }
    if (!nextAction) {
      api.toast("请填写下一步动作");
      return;
    }
    if (!selectedStatus) {
      api.toast("请选择工单状态");
      return;
    }
    if (!selectedOwner) {
      api.toast("请选择负责人");
      return;
    }
    this.setData({ saving: true });
    api.requestStaff("/api/miniapp/staff/scheduling-coordination/" + encodeURIComponent(this.data.id), {
      method: "PATCH",
      data: {
        communicationTarget: communicationTargets[this.data.targetIndex],
        communicationResult,
        status: selectedStatus.value,
        owner: selectedOwner.value,
        nextAction,
        nextActionDue: this.data.nextActionDue
      }
    })
      .then(() => {
        wx.showToast({ title: "已保存", icon: "success" });
        return this.load();
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ saving: false }));
  }
});
