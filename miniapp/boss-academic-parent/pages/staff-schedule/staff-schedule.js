const api = require("../../utils/api");

const modes = [
  { label: "月", value: "month" },
  { label: "周", value: "week" },
  { label: "日", value: "day" }
];
const weekdayLabels = ["一", "二", "三", "四", "五", "六", "日"];
const ticketScopes = [
  { label: "全部开放", status: "", overdue: false },
  { label: "已逾期", status: "", overdue: true },
  { label: "待补信息", status: "Need Info", overdue: false },
  { label: "等待家长", status: "Waiting Parent", overdue: false },
  { label: "等待老师", status: "Waiting Teacher", overdue: false },
  { label: "双方已确认", status: "Confirmed", overdue: false },
  { label: "异常升级", status: "Exception", overdue: false }
];
const ticketOwners = ["全部负责人", "Jasmine", "Eva", "Emily"];
const newSessionTicketTypes = ["排课协调", "排课要求", "新排课", "补课加课"];
let searchTimer = null;
let ticketSearchTimer = null;
let requestSeq = 0;
let ticketRequestSeq = 0;

function pad2(value) {
  return String(value).padStart(2, "0");
}

function dateString(date) {
  return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
}

function parseDate(value) {
  const parts = String(value || "").split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
}

function addDays(value, amount) {
  const date = parseDate(value);
  date.setDate(date.getDate() + amount);
  return dateString(date);
}

function mondayOf(value) {
  const date = parseDate(value);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return dateString(date);
}

function monthRange(value) {
  const date = parseDate(value);
  const first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const start = parseDate(mondayOf(dateString(first)));
  const end = new Date(start);
  end.setDate(end.getDate() + 41);
  return { from: dateString(start), to: dateString(end) };
}

function weekRange(value) {
  const from = mondayOf(value);
  return { from, to: addDays(from, 6) };
}

function shortDate(value) {
  const date = parseDate(value);
  return (date.getMonth() + 1) + "月" + date.getDate() + "日";
}

Page({
  data: {
    modes,
    modeIndex: 0,
    mode: "month",
    weekdayLabels,
    selectedDate: dateString(new Date()),
    today: dateString(new Date()),
    rangeTitle: "",
    days: [],
    weekDays: [],
    selectedDay: {},
    selectedDayTitle: "",
    selectedSessions: [],
    selectedAvailability: [],
    sessions: [],
    availability: [],
    teacherOnly: false,
    canSchedule: false,
    canCoordinate: false,
    teachers: [{ id: "", name: "全部老师" }],
    campuses: [{ id: "", name: "全部校区" }],
    courses: [{ id: "", name: "全部课程" }],
    teacherIndex: 0,
    campusIndex: 0,
    courseIndex: 0,
    query: "",
    filtersExpanded: false,
    activeFilterCount: 0,
    loading: false,
    ticketScopes,
    ticketOwners,
    ticketQueueExpanded: true,
    ticketScopeIndex: 0,
    ticketOwnerIndex: 0,
    ticketQuery: "",
    ticketRows: [],
    ticketSummary: {},
    ticketMatchedText: "0",
    ticketOpenText: "0",
    ticketOverdueText: "0",
    ticketFilterCount: 0,
    ticketLoading: false
  },

  onLoad(query) {
    const date = String(query.date || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) this.setData({ selectedDate: date, mode: "day", modeIndex: 2 });
  },

  onShow() {
    this.load();
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },

  onUnload() {
    if (searchTimer) clearTimeout(searchTimer);
    if (ticketSearchTimer) clearTimeout(ticketSearchTimer);
    requestSeq += 1;
    ticketRequestSeq += 1;
  },

  currentRange() {
    if (this.data.mode === "month") return monthRange(this.data.selectedDate);
    if (this.data.mode === "week") return weekRange(this.data.selectedDate);
    return { from: this.data.selectedDate, to: this.data.selectedDate };
  },

  load() {
    return this.loadCalendar().then((canCoordinate) => {
      if (canCoordinate) return this.loadTicketQueue();
      this.setData({ ticketRows: [], ticketMatchedText: "0", ticketLoading: false });
      return null;
    });
  },

  loadCalendar() {
    const seq = ++requestSeq;
    const range = this.currentRange();
    const teacher = this.data.teachers[this.data.teacherIndex] || {};
    const campus = this.data.campuses[this.data.campusIndex] || {};
    const course = this.data.courses[this.data.courseIndex] || {};
    const params = [
      "from=" + encodeURIComponent(range.from),
      "to=" + encodeURIComponent(range.to),
      teacher.id ? "teacherId=" + encodeURIComponent(teacher.id) : "",
      campus.id ? "campusId=" + encodeURIComponent(campus.id) : "",
      course.id ? "courseId=" + encodeURIComponent(course.id) : "",
      this.data.query.trim() ? "q=" + encodeURIComponent(this.data.query.trim()) : ""
    ].filter(Boolean).join("&");
    this.setData({ loading: true });
    return api.requestStaff("/api/miniapp/staff/schedule/calendar?" + params, { timeout: 30000 })
      .then((data) => {
        if (seq !== requestSeq) return;
        const filters = data.filters || {};
        const teachers = [{ id: "", name: "全部老师" }].concat(filters.teachers || []);
        const campuses = [{ id: "", name: "全部校区" }].concat(filters.campuses || []);
        const courses = [{ id: "", name: "全部课程" }].concat(filters.courses || []);
        let teacherIndex = this.data.teacherIndex;
        if (data.teacherOnly && data.sessions && data.sessions[0]) {
          const ownId = data.sessions[0].teacherId;
          const found = teachers.findIndex((item) => item.id === ownId);
          if (found >= 0) teacherIndex = found;
        }
        const days = (data.days || []).map((day) => this.decorateDay(day));
        const capabilities = data.capabilities || {};
        this.setData({
          days,
          sessions: data.sessions || [],
          availability: data.availability || [],
          teachers,
          campuses,
          courses,
          teacherIndex,
          teacherOnly: Boolean(data.teacherOnly),
          canSchedule: Boolean(capabilities.canSchedule),
          canCoordinate: Boolean(capabilities.canCoordinate),
          rangeTitle: this.rangeTitle(range)
        });
        this.refreshSelectedDay();
        return Boolean(capabilities.canCoordinate);
      })
      .catch((err) => {
        if (seq === requestSeq) api.toast(err.message);
        return false;
      })
      .finally(() => {
        if (seq === requestSeq) this.setData({ loading: false });
      });
  },

  loadTicketQueue() {
    const seq = ++ticketRequestSeq;
    const scope = ticketScopes[this.data.ticketScopeIndex] || ticketScopes[0];
    const owner = this.data.ticketOwnerIndex > 0 ? ticketOwners[this.data.ticketOwnerIndex] : "";
    const query = [];
    if (scope.status) query.push("status=" + encodeURIComponent(scope.status));
    if (scope.overdue) query.push("overdue=true");
    if (owner) query.push("owner=" + encodeURIComponent(owner));
    if (this.data.ticketQuery.trim()) query.push("q=" + encodeURIComponent(this.data.ticketQuery.trim()));
    query.push("limit=150");
    this.setData({ ticketLoading: true });
    return api.requestStaff("/api/miniapp/staff/scheduling-coordination?" + query.join("&"), { timeout: 20000 })
      .then((data) => {
        if (seq !== ticketRequestSeq) return;
        const rows = (data.tickets || []).map((item) => Object.assign({}, item, {
          canCreateNewSession: newSessionTicketTypes.includes(item.type),
          actionHint: newSessionTicketTypes.includes(item.type) ? "打开现有排课面板" : "待关联原课程",
          actionClass: newSessionTicketTypes.includes(item.type) ? "ticket-action" : "ticket-action blocked"
        }));
        const summary = data.summary || {};
        this.setData({
          ticketRows: rows,
          ticketSummary: summary,
          ticketMatchedText: String(rows.length),
          ticketOpenText: String(summary.totalOpen || 0),
          ticketOverdueText: String(summary.overdue || 0)
        });
      })
      .catch((err) => {
        if (seq === ticketRequestSeq) api.toast(err.message);
      })
      .finally(() => {
        if (seq === ticketRequestSeq) this.setData({ ticketLoading: false });
      });
  },

  decorateDay(day) {
    const date = parseDate(day.date);
    const inMonth = date.getMonth() === parseDate(this.data.selectedDate).getMonth();
    const selected = day.date === this.data.selectedDate;
    const today = day.date === this.data.today;
    return Object.assign({}, day, {
      dayNumber: String(date.getDate()),
      weekday: weekdayLabels[(date.getDay() + 6) % 7],
      shortLabel: (date.getMonth() + 1) + "/" + date.getDate(),
      inMonth,
      selected,
      today,
      cellClass: "calendar-day" + (inMonth ? "" : " outside") + (selected ? " selected" : "") + (today ? " today" : ""),
      weekClass: "week-day" + (selected ? " selected" : "") + (today ? " today" : "")
    });
  },

  rangeTitle(range) {
    if (this.data.mode === "month") {
      const date = parseDate(this.data.selectedDate);
      return date.getFullYear() + "年" + (date.getMonth() + 1) + "月";
    }
    if (this.data.mode === "week") return shortDate(range.from) + " - " + shortDate(range.to);
    return shortDate(this.data.selectedDate);
  },

  refreshSelectedDay() {
    const selectedDate = this.data.selectedDate;
    const selectedDay = this.data.days.find((day) => day.date === selectedDate) || this.decorateDay({
      date: selectedDate,
      sessionCount: 0,
      studentCount: 0,
      teacherCount: 0,
      conflictCount: 0,
      coordinationCount: 0,
      availabilityCount: 0
    });
    const selectedSessions = this.data.sessions
      .filter((item) => item.date === selectedDate)
      .map((item) => Object.assign({}, item, {
        timeText: item.startTime + " - " + item.endTime
      }));
    const selectedAvailability = this.data.availability
      .filter((item) => item.date === selectedDate)
      .map((item) => Object.assign({}, item, { timeText: item.startTime + " - " + item.endTime }));
    const week = weekRange(selectedDate);
    const dayMap = new Map(this.data.days.map((day) => [day.date, day]));
    const weekDays = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(week.from, index);
      return this.decorateDay(dayMap.get(date) || { date, sessionCount: 0, conflictCount: 0, coordinationCount: 0 });
    });
    this.setData({
      selectedDay,
      selectedDayTitle: shortDate(selectedDate) + " 周" + selectedDay.weekday,
      selectedSessions,
      selectedAvailability,
      weekDays
    });
  },

  changeMode(e) {
    const modeIndex = Number(e.currentTarget.dataset.index || 0);
    const mode = modes[modeIndex].value;
    this.setData({ modeIndex, mode });
    this.loadCalendar();
  },

  selectDate(e) {
    const selectedDate = e.currentTarget.dataset.date;
    if (!selectedDate) return;
    const needsReload = this.data.mode === "month" && parseDate(selectedDate).getMonth() !== parseDate(this.data.selectedDate).getMonth();
    this.setData({ selectedDate });
    if (needsReload) this.loadCalendar();
    else this.refreshSelectedDay();
  },

  previousRange() {
    const date = parseDate(this.data.selectedDate);
    if (this.data.mode === "month") date.setMonth(date.getMonth() - 1, 1);
    else date.setDate(date.getDate() - (this.data.mode === "week" ? 7 : 1));
    this.setData({ selectedDate: dateString(date) });
    this.loadCalendar();
  },

  nextRange() {
    const date = parseDate(this.data.selectedDate);
    if (this.data.mode === "month") date.setMonth(date.getMonth() + 1, 1);
    else date.setDate(date.getDate() + (this.data.mode === "week" ? 7 : 1));
    this.setData({ selectedDate: dateString(date) });
    this.loadCalendar();
  },

  goToday() {
    this.setData({ selectedDate: this.data.today });
    this.loadCalendar();
  },

  toggleFilters() {
    this.setData({ filtersExpanded: !this.data.filtersExpanded });
  },

  applyFilterChange(values) {
    const next = Object.assign({}, values);
    const teacherIndex = next.teacherIndex === undefined ? this.data.teacherIndex : next.teacherIndex;
    const campusIndex = next.campusIndex === undefined ? this.data.campusIndex : next.campusIndex;
    const courseIndex = next.courseIndex === undefined ? this.data.courseIndex : next.courseIndex;
    next.activeFilterCount = Number(teacherIndex > 0) + Number(campusIndex > 0) + Number(courseIndex > 0) + Number(Boolean(this.data.query.trim()));
    this.setData(next);
    this.loadCalendar();
  },

  changeTeacher(e) {
    this.applyFilterChange({ teacherIndex: Number(e.detail.value || 0) });
  },

  changeCampus(e) {
    this.applyFilterChange({ campusIndex: Number(e.detail.value || 0) });
  },

  changeCourse(e) {
    this.applyFilterChange({ courseIndex: Number(e.detail.value || 0) });
  },

  inputQuery(e) {
    this.setData({ query: e.detail.value || "" });
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      this.setData({ activeFilterCount: Number(this.data.teacherIndex > 0) + Number(this.data.campusIndex > 0) + Number(this.data.courseIndex > 0) + Number(Boolean(this.data.query.trim())) });
      this.loadCalendar();
    }, 400);
  },

  clearQuery() {
    if (searchTimer) clearTimeout(searchTimer);
    this.setData({ query: "", activeFilterCount: Number(this.data.teacherIndex > 0) + Number(this.data.campusIndex > 0) + Number(this.data.courseIndex > 0) });
    this.loadCalendar();
  },

  resetFilters() {
    if (searchTimer) clearTimeout(searchTimer);
    this.setData({ teacherIndex: 0, campusIndex: 0, courseIndex: 0, query: "", activeFilterCount: 0 });
    this.loadCalendar();
  },

  toggleTicketQueue() {
    this.setData({ ticketQueueExpanded: !this.data.ticketQueueExpanded });
  },

  changeTicketScope(e) {
    const ticketScopeIndex = Number(e.detail.value || 0);
    this.setData({
      ticketScopeIndex,
      ticketFilterCount: Number(ticketScopeIndex > 0) + Number(this.data.ticketOwnerIndex > 0) + Number(Boolean(this.data.ticketQuery.trim()))
    });
    this.loadTicketQueue();
  },

  changeTicketOwner(e) {
    const ticketOwnerIndex = Number(e.detail.value || 0);
    this.setData({
      ticketOwnerIndex,
      ticketFilterCount: Number(this.data.ticketScopeIndex > 0) + Number(ticketOwnerIndex > 0) + Number(Boolean(this.data.ticketQuery.trim()))
    });
    this.loadTicketQueue();
  },

  inputTicketQuery(e) {
    this.setData({ ticketQuery: e.detail.value || "" });
    if (ticketSearchTimer) clearTimeout(ticketSearchTimer);
    ticketSearchTimer = setTimeout(() => {
      this.setData({
        ticketFilterCount: Number(this.data.ticketScopeIndex > 0) + Number(this.data.ticketOwnerIndex > 0) + Number(Boolean(this.data.ticketQuery.trim()))
      });
      this.loadTicketQueue();
    }, 350);
  },

  clearTicketQuery() {
    if (ticketSearchTimer) clearTimeout(ticketSearchTimer);
    this.setData({
      ticketQuery: "",
      ticketFilterCount: Number(this.data.ticketScopeIndex > 0) + Number(this.data.ticketOwnerIndex > 0)
    });
    this.loadTicketQueue();
  },

  resetTicketFilters() {
    if (ticketSearchTimer) clearTimeout(ticketSearchTimer);
    this.setData({ ticketScopeIndex: 0, ticketOwnerIndex: 0, ticketQuery: "", ticketFilterCount: 0 });
    this.loadTicketQueue();
  },

  openTicket(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: "/pages/staff-coordination-detail/staff-coordination-detail?id=" + encodeURIComponent(id)
    });
  },

  openSession(e) {
    wx.navigateTo({ url: "/pages/staff-session-detail/staff-session-detail?id=" + encodeURIComponent(e.currentTarget.dataset.id) });
  },

  openScheduling(e) {
    const time = e.currentTarget.dataset.time || "";
    let url = "/pages/staff-first-scheduling/staff-first-scheduling?date=" + encodeURIComponent(this.data.selectedDate);
    if (time) url += "&time=" + encodeURIComponent(time);
    wx.navigateTo({ url });
  }
});
