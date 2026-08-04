const api = require("../../utils/api");

const intentOptions = [
  { value: "KEEP", label: "保持目前安排" },
  { value: "CHANGE", label: "希望修改时间" },
  { value: "PAUSE", label: "下个月暂停" },
  { value: "UNSURE", label: "尚未确定，请联系我" }
];
const weekdayOptions = [
  { value: "MON", label: "周一", selected: false },
  { value: "TUE", label: "周二", selected: false },
  { value: "WED", label: "周三", selected: false },
  { value: "THU", label: "周四", selected: false },
  { value: "FRI", label: "周五", selected: false },
  { value: "SAT", label: "周六", selected: false },
  { value: "SUN", label: "周日", selected: false }
];
const frequencyOptions = ["暂不确定", "每周1次", "每周2次", "每周3次", "每周4次", "每周5次", "每周6次", "每周7次"];
const modeOptions = ["无偏好", "线上", "线下"];

function blankForm() {
  return {
    intent: "KEEP",
    expectedSessionsPerWeek: 1,
    expectedMinutes: "",
    preferredMode: "",
    preferredCampus: "",
    preferredTeacher: "",
    weekdays: [],
    timeRanges: [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }, { start: "19:00", end: "21:00" }],
    unavailableDates: [],
    unavailableDateDraft: "",
    parentNotes: ""
  };
}

function formFromItem(item) {
  const availability = item.availability || {};
  const ranges = (availability.timeRanges || []).slice(0, 3);
  while (ranges.length < 3) ranges.push(blankForm().timeRanges[ranges.length]);
  return {
    intent: item.intent || "KEEP",
    expectedSessionsPerWeek: item.expectedSessionsPerWeek == null ? 1 : item.expectedSessionsPerWeek,
    expectedMinutes: item.expectedMinutes == null ? "" : String(item.expectedMinutes),
    preferredMode: item.preferredMode || "",
    preferredCampus: item.preferredCampus || "",
    preferredTeacher: item.preferredTeacher || "",
    weekdays: availability.weekdays || [],
    timeRanges: ranges,
    unavailableDates: Array.isArray(item.unavailableDates) ? item.unavailableDates : [],
    unavailableDateDraft: "",
    parentNotes: item.parentNotes || ""
  };
}

Page({
  data: {
    loading: true,
    saving: false,
    items: [],
    itemLabels: [],
    selectedIndex: 0,
    selected: null,
    completedCount: 0,
    intentOptions,
    weekdayOptions,
    frequencyOptions,
    frequencyIndex: 1,
    modeOptions,
    modeIndex: 0,
    form: blankForm()
  },

  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },

  load() {
    this.setData({ loading: true });
    return api.request("/api/miniapp/monthly-scheduling?markViewed=1", { timeout: 15000 })
      .then((data) => {
        const items = data.items || [];
        const selectedIndex = Math.min(this.data.selectedIndex, Math.max(0, items.length - 1));
        this.setData({
          items,
          itemLabels: items.map((item) => `${item.student.name} · ${item.course.name}`),
          completedCount: items.filter((item) => ["SUBMITTED", "MATCHED", "SCHEDULED", "PAUSED"].includes(item.status)).length,
          selectedIndex
        });
        this.selectItem(selectedIndex);
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  selectItem(index) {
    const item = this.data.items[index];
    if (!item) { this.setData({ selected: null, form: blankForm() }); return; }
    const form = formFromItem(item);
    this.setData({
      selected: item,
      form,
      frequencyIndex: Math.max(0, Math.min(7, form.expectedSessionsPerWeek || 0)),
      modeIndex: form.preferredMode === "ONLINE" ? 1 : form.preferredMode === "OFFLINE" ? 2 : 0,
      weekdayOptions: weekdayOptions.map((row) => Object.assign({}, row, { selected: form.weekdays.includes(row.value) }))
    });
  },

  changeItem(e) {
    const index = Number(e.detail.value || 0);
    this.setData({ selectedIndex: index });
    this.selectItem(index);
  },
  changeIntent(e) { this.setData({ "form.intent": e.detail.value }); },
  changeFrequency(e) {
    const index = Number(e.detail.value || 0);
    this.setData({ frequencyIndex: index, "form.expectedSessionsPerWeek": index });
  },
  changeMode(e) {
    const index = Number(e.detail.value || 0);
    this.setData({ modeIndex: index, "form.preferredMode": index === 1 ? "ONLINE" : index === 2 ? "OFFLINE" : "" });
  },
  toggleWeekday(e) {
    const value = e.currentTarget.dataset.value;
    const current = this.data.form.weekdays.slice();
    const next = current.includes(value) ? current.filter((row) => row !== value) : current.concat(value);
    this.setData({ "form.weekdays": next, weekdayOptions: weekdayOptions.map((row) => Object.assign({}, row, { selected: next.includes(row.value) })) });
  },
  changeTimeStart(e) { this.setData({ [`form.timeRanges[${Number(e.currentTarget.dataset.index)}].start`]: e.detail.value }); },
  changeTimeEnd(e) { this.setData({ [`form.timeRanges[${Number(e.currentTarget.dataset.index)}].end`]: e.detail.value }); },
  changeUnavailableDate(e) { this.setData({ "form.unavailableDateDraft": e.detail.value }); },
  addUnavailableDate() {
    const value = this.data.form.unavailableDateDraft;
    if (!value) return;
    const next = Array.from(new Set(this.data.form.unavailableDates.concat(value))).sort();
    this.setData({ "form.unavailableDates": next });
  },
  removeUnavailableDate(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ "form.unavailableDates": this.data.form.unavailableDates.filter((row) => row !== value) });
  },
  inputExpectedMinutes(e) { this.setData({ "form.expectedMinutes": e.detail.value }); },
  inputCampus(e) { this.setData({ "form.preferredCampus": e.detail.value }); },
  inputTeacher(e) { this.setData({ "form.preferredTeacher": e.detail.value }); },
  inputNotes(e) { this.setData({ "form.parentNotes": e.detail.value }); },

  submit() {
    const item = this.data.selected;
    if (!item || item.locked || this.data.saving) return;
    const form = this.data.form;
    if (form.intent === "CHANGE" && (!form.weekdays.length || !form.timeRanges.some((row) => row.start && row.end && row.end > row.start))) {
      api.toast("修改时间时，请至少选择一个星期和一个可用时段");
      return;
    }
    this.setData({ saving: true });
    api.request("/api/miniapp/monthly-scheduling", {
      method: "POST",
      timeout: 15000,
      data: {
        itemId: item.id,
        intent: form.intent,
        expectedSessionsPerWeek: form.expectedSessionsPerWeek || null,
        expectedMinutes: form.expectedMinutes ? Number(form.expectedMinutes) : null,
        preferredMode: form.preferredMode,
        preferredCampus: form.preferredCampus,
        preferredTeacher: form.preferredTeacher,
        availability: { selectionMode: "weekly", weekdays: form.weekdays, timeRanges: form.timeRanges.filter((row) => row.start && row.end && row.end > row.start), dateSelections: [] },
        unavailableDates: form.unavailableDates,
        parentNotes: form.parentNotes
      }
    })
      .then(() => { wx.showToast({ title: "已提交", icon: "success" }); return this.load(); })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ saving: false }));
  }
});
