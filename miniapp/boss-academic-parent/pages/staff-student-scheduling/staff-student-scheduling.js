const api = require("../../utils/api");

function pad2(value) {
  return String(value).padStart(2, "0");
}

function scheduleDefaults() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return {
    date: date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate()),
    time: pad2(date.getHours()) + ":" + pad2(date.getMinutes())
  };
}

Page({
  data: {
    studentId: "",
    preferredCourseId: "",
    preferredTeacherId: "",
    student: null,
    loading: false,
    canSchedule: false,
    courses: [],
    openTickets: [],
    hasOpenTickets: false,
    upcomingSessions: [],
    hasUpcomingSessions: false,
    allTeachers: [],
    subjects: [],
    hasScheduleOptions: false,
    subjectIndex: 0,
    subjectName: "",
    levels: [],
    levelIndex: 0,
    levelName: "不指定级别",
    teachers: [],
    hasTeachers: false,
    teacherIndex: 0,
    teacherName: "",
    campuses: [],
    campusIndex: 0,
    campusName: "",
    rooms: [],
    hasRooms: false,
    roomIndex: 0,
    roomName: "",
    requiresRoom: false,
    scheduleDate: scheduleDefaults().date,
    scheduleTime: scheduleDefaults().time,
    duration: "60",
    weeks: "1",
    preview: null,
    previewToken: "",
    hasPreview: false,
    checking: false,
    saving: false,
    coordinationCourseIndex: 0,
    coordinationSummary: "",
    creatingCoordination: false
  },

  onLoad(options) {
    const values = {
      studentId: options.id || "",
      preferredCourseId: options.courseId || "",
      preferredTeacherId: options.teacherId || ""
    };
    if (/^\d{4}-\d{2}-\d{2}$/.test(options.date || "")) values.scheduleDate = options.date;
    if (/^\d{2}:\d{2}$/.test(options.time || "")) values.scheduleTime = options.time;
    if (/^\d{1,3}$/.test(options.duration || "")) values.duration = options.duration;
    if (/^\d{1,2}$/.test(options.weeks || "")) values.weeks = options.weeks;
    this.setData(values);
    this.load();
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },

  endpoint() {
    return "/api/miniapp/staff/students/" + encodeURIComponent(this.data.studentId) + "/scheduling";
  },

  load() {
    if (!this.data.studentId) return Promise.resolve();
    this.setData({ loading: true });
    return api.requestStaff(this.endpoint(), { timeout: 20000 })
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
          student: options.student || null,
          courses: options.courses || [],
          openTickets: options.openTickets || [],
          hasOpenTickets: Boolean(options.openTickets && options.openTickets.length),
          upcomingSessions: options.upcomingSessions || [],
          hasUpcomingSessions: Boolean(options.upcomingSessions && options.upcomingSessions.length),
          canSchedule: Boolean(data.capabilities && data.capabilities.canSchedule),
          subjects,
          campuses: options.campuses || [],
          allTeachers: options.teachers || [],
          hasScheduleOptions: subjects.length > 0 && Boolean(options.campuses && options.campuses.length)
        });
        const preferredSubjectIndex = Math.max(0, subjects.findIndex((subject) => subject.courseId === this.data.preferredCourseId));
        this.applySubject(preferredSubjectIndex);
        this.applyCampus(0);
      })
      .catch((err) => wx.showModal({ title: "无法打开排课", content: err.message || "请稍后重试", showCancel: false }))
      .finally(() => this.setData({ loading: false }));
  },

  invalidatePreview(values) {
    this.setData(Object.assign({}, values || {}, { preview: null, previewToken: "", hasPreview: false }));
  },

  applySubject(index) {
    const subject = this.data.subjects[index] || null;
    const levels = [{ id: "", name: "不指定级别" }].concat(subject ? (subject.levels || []) : []);
    const teachers = (this.data.allTeachers || []).filter((teacher) => {
      if (!subject) return false;
      return teacher.subjectCourseId === subject.id || (teacher.subjects || []).some((row) => row.id === subject.id);
    });
    const teacherIndex = Math.max(0, teachers.findIndex((teacher) => teacher.id === this.data.preferredTeacherId));
    this.invalidatePreview({
      subjectIndex: index,
      subjectName: subject ? subject.label : "",
      levels,
      levelIndex: 0,
      levelName: levels[0].name,
      teachers,
      hasTeachers: teachers.length > 0,
      teacherIndex,
      teacherName: teachers[teacherIndex] ? teachers[teacherIndex].name : ""
    });
  },

  applyCampus(index) {
    const campus = this.data.campuses[index] || null;
    const rooms = campus && campus.requiresRoom ? (campus.rooms || []) : [{ id: "", name: "无需教室" }];
    this.invalidatePreview({
      campusIndex: index,
      campusName: campus ? campus.name : "",
      rooms,
      hasRooms: rooms.length > 0,
      roomIndex: 0,
      roomName: rooms[0] ? rooms[0].name : "",
      requiresRoom: Boolean(campus && campus.requiresRoom)
    });
  },

  changeSubject(e) { this.applySubject(Number(e.detail.value || 0)); },
  changeLevel(e) {
    const index = Number(e.detail.value || 0);
    const level = this.data.levels[index];
    this.invalidatePreview({ levelIndex: index, levelName: level ? level.name : "" });
  },
  changeTeacher(e) {
    const index = Number(e.detail.value || 0);
    const teacher = this.data.teachers[index];
    this.invalidatePreview({ teacherIndex: index, teacherName: teacher ? teacher.name : "" });
  },
  changeCampus(e) { this.applyCampus(Number(e.detail.value || 0)); },
  changeRoom(e) {
    const index = Number(e.detail.value || 0);
    const room = this.data.rooms[index];
    this.invalidatePreview({ roomIndex: index, roomName: room ? room.name : "" });
  },
  changeDate(e) { this.invalidatePreview({ scheduleDate: e.detail.value }); },
  changeTime(e) { this.invalidatePreview({ scheduleTime: e.detail.value }); },
  inputDuration(e) { this.invalidatePreview({ duration: e.detail.value }); },
  inputWeeks(e) { this.invalidatePreview({ weeks: e.detail.value }); },
  changeCoordinationCourse(e) { this.setData({ coordinationCourseIndex: Number(e.detail.value || 0) }); },
  inputCoordinationSummary(e) { this.setData({ coordinationSummary: e.detail.value || "" }); },

  schedulePayload(mode) {
    const subject = this.data.subjects[this.data.subjectIndex];
    const level = this.data.levels[this.data.levelIndex];
    const teacher = this.data.teachers[this.data.teacherIndex];
    const campus = this.data.campuses[this.data.campusIndex];
    const room = this.data.rooms[this.data.roomIndex];
    return {
      mode,
      subjectId: subject ? subject.id : "",
      levelId: level ? level.id : "",
      teacherId: teacher ? teacher.id : "",
      campusId: campus ? campus.id : "",
      roomId: room ? room.id : "",
      startAt: this.data.scheduleDate + "T" + this.data.scheduleTime + ":00+08:00",
      durationMin: Number(this.data.duration),
      weeks: Number(this.data.weeks),
      previewToken: this.data.previewToken
    };
  },

  previewSchedule() {
    const payload = this.schedulePayload("preview");
    if (!payload.subjectId || !payload.teacherId || !payload.campusId) return api.toast("请完整选择课程、老师和校区");
    if (this.data.requiresRoom && !payload.roomId) return api.toast("请选择教室");
    if (!Number.isFinite(payload.durationMin) || payload.durationMin < 15 || payload.durationMin > 360) return api.toast("时长需为 15-360 分钟");
    if (!Number.isInteger(payload.weeks) || payload.weeks < 1 || payload.weeks > 12) return api.toast("连续周数需为 1-12 周");
    this.setData({ checking: true });
    api.requestStaff(this.endpoint(), { method: "POST", data: payload, timeout: 30000 })
      .then((data) => this.setData({ preview: data.preview || null, previewToken: data.previewToken || "", hasPreview: Boolean(data.previewToken) }))
      .catch((err) => wx.showModal({ title: "无法排课", content: err.message || "排课检查失败", showCancel: false }))
      .finally(() => this.setData({ checking: false }));
  },

  applySchedule() {
    if (!this.data.previewToken || this.data.saving) return;
    const preview = this.data.preview || {};
    wx.showModal({
      title: "确认排课",
      content: (preview.scheduleText || "") + "\n" + (preview.teacherName || "") + " · " + (preview.locationText || "") + "\n本次直接排课不会创建工单。",
      confirmText: "确认排课",
      success: (result) => {
        if (!result.confirm) return;
        this.setData({ saving: true });
        api.requestStaff(this.endpoint(), { method: "POST", data: this.schedulePayload("apply"), timeout: 30000 })
          .then((data) => {
            wx.showToast({ title: "已排课", icon: "success" });
            if (data.sessionId) setTimeout(() => wx.redirectTo({ url: "/pages/staff-session-detail/staff-session-detail?id=" + encodeURIComponent(data.sessionId) }), 500);
          })
          .catch((err) => wx.showModal({ title: "无法排课", content: err.message || "排课失败", showCancel: false }))
          .finally(() => this.setData({ saving: false }));
      }
    });
  },

  createCoordination() {
    const course = this.data.courses[this.data.coordinationCourseIndex];
    const summary = this.data.coordinationSummary.trim();
    if (!course) return api.toast("请选择需要协调的课程");
    if (!summary) return api.toast("请填写需要协调的事项");
    if (this.data.creatingCoordination) return;
    wx.showModal({
      title: "创建排课协调工单",
      content: course.name + "\n" + summary,
      confirmText: "确认创建",
      success: (result) => {
        if (!result.confirm) return;
        this.setData({ creatingCoordination: true });
        api.requestStaff("/api/miniapp/staff/first-scheduling", {
          method: "POST",
          data: { studentId: this.data.studentId, intent: "coordination", courseId: course.id, coordinationSummary: summary },
          timeout: 20000
        })
          .then((data) => {
            if (!data.ticketId) throw new Error("工单创建失败");
            wx.navigateTo({ url: "/pages/staff-coordination-detail/staff-coordination-detail?id=" + encodeURIComponent(data.ticketId) });
          })
          .catch((err) => wx.showModal({ title: "无法创建工单", content: err.message || "请稍后重试", showCancel: false }))
          .finally(() => this.setData({ creatingCoordination: false }));
      }
    });
  },

  openTicket(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: "/pages/staff-coordination-detail/staff-coordination-detail?id=" + encodeURIComponent(id) });
  },

  openSession(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: "/pages/staff-session-detail/staff-session-detail?id=" + encodeURIComponent(id) });
  }
});
