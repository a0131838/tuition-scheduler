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
const teacherPreferenceOptions = ["不指定老师", "沿用当前老师", "选择老师", "其他老师，请教务核对"];
const teacherPreferenceValues = ["NONE", "CURRENT", "PREFERRED", "VERIFY"];

function blankForm() {
  return {
    intent: "KEEP",
    expectedSessionsPerWeek: 1,
    expectedMinutes: "",
    preferredMode: "",
    preferredCampus: "",
    preferredTeacherId: "",
    teacherPreferenceType: "NONE",
    teacherPreferenceNote: "",
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
    preferredTeacherId: item.preferredTeacherId || "",
    teacherPreferenceType: item.teacherPreferenceType || (item.preferredTeacher ? "VERIFY" : "NONE"),
    teacherPreferenceNote: item.teacherPreferenceNote || (!item.teacherPreferenceType ? item.preferredTeacher || "" : ""),
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
    teacherPreferenceOptions,
    teacherPreferenceIndex: 0,
    teacherOptions: [],
    teacherIndex: 0,
    form: blankForm(),
    rankedOfferIds: [],
    changeNote: ""
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
          completedCount: items.filter((item) => ["PARENT_SELECTED", "MATCHED", "SCHEDULED", "PAUSED", "CHANGE_REQUESTED"].includes(item.status)).length,
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
    const rankedOfferIds = (item.offers || []).filter((row) => row.parentRank).sort((a, b) => a.parentRank - b.parentRank).map((row) => row.id);
    const selected = Object.assign({}, item, {
      offers: (item.offers || []).map((row) => {
        const displayRank = rankedOfferIds.indexOf(row.id) + 1;
        return Object.assign({}, row, { displayRank, rankLabel: displayRank ? `第${displayRank}选择` : "选择" });
      })
    });
    const teacherOptions = [{ id: "", name: "请选择老师" }].concat(item.teacherOptions || []);
    this.setData({
      selected,
      form,
      rankedOfferIds,
      changeNote: "",
      frequencyIndex: Math.max(0, Math.min(7, form.expectedSessionsPerWeek || 0)),
      modeIndex: form.preferredMode === "ONLINE" ? 1 : form.preferredMode === "OFFLINE" ? 2 : 0,
      teacherPreferenceIndex: Math.max(0, teacherPreferenceValues.indexOf(form.teacherPreferenceType)),
      teacherOptions,
      teacherIndex: Math.max(0, teacherOptions.findIndex((row) => row.id === form.preferredTeacherId)),
      weekdayOptions: weekdayOptions.map((row) => Object.assign({}, row, { selected: form.weekdays.includes(row.value) }))
    });
  },

  changeItem(e) {
    const index = Number(e.detail.value || 0);
    this.setData({ selectedIndex: index });
    this.selectItem(index);
  },
  selectItemCard(e) {
    const index = Number(e.currentTarget.dataset.index || 0);
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
  changeTeacherPreference(e) {
    const index = Number(e.detail.value || 0);
    const type = teacherPreferenceValues[index] || "NONE";
    const patch = { teacherPreferenceIndex: index, "form.teacherPreferenceType": type };
    if (type !== "PREFERRED") { patch.teacherIndex = 0; patch["form.preferredTeacherId"] = ""; }
    this.setData(patch);
  },
  changeTeacher(e) {
    const index = Number(e.detail.value || 0);
    this.setData({ teacherIndex: index, "form.preferredTeacherId": (this.data.teacherOptions[index] || {}).id || "" });
  },
  inputTeacherNote(e) { this.setData({ "form.teacherPreferenceNote": e.detail.value }); },
  inputNotes(e) { this.setData({ "form.parentNotes": e.detail.value }); },
  inputChangeNote(e) { this.setData({ changeNote: e.detail.value || "" }); },

  toggleOffer(e) {
    const id = e.currentTarget.dataset.id;
    if (!id || this.data.saving) return;
    const current = this.data.rankedOfferIds.slice();
    const existing = current.indexOf(id);
    if (existing >= 0) current.splice(existing, 1);
    else if (current.length < 3) current.push(id);
    else return api.toast("最多选择三个时间");
    this.setData({
      rankedOfferIds: current,
      "selected.offers": (this.data.selected.offers || []).map((row) => {
        const displayRank = current.indexOf(row.id) + 1;
        return Object.assign({}, row, { displayRank, rankLabel: displayRank ? `第${displayRank}选择` : "选择" });
      })
    });
  },

  submitOfferRanking() {
    const item = this.data.selected;
    if (!item || !this.data.rankedOfferIds.length || this.data.saving) return api.toast("请按顺序选择至少一个时间");
    this.setData({ saving: true });
    api.request("/api/miniapp/monthly-scheduling", {
      method: "POST",
      timeout: 15000,
      data: { action: "RANK_OFFERS", itemId: item.id, offerIds: this.data.rankedOfferIds }
    })
      .then((data) => { wx.showToast({ title: "已临时保留", icon: "success" }); return this.load(); })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ saving: false }));
  },

  requestChange() {
    const item = this.data.selected;
    const note = this.data.changeNote.trim();
    if (!item || !note || this.data.saving) return api.toast("请填写需要调整的原因");
    wx.showModal({
      title: "申请再次调整",
      content: "原安排会继续保留，直到学校确认新的时间。",
      confirmText: "提交申请",
      success: (result) => {
        if (!result.confirm) return;
        this.setData({ saving: true });
        api.request("/api/miniapp/monthly-scheduling", {
          method: "POST",
          timeout: 15000,
          data: { action: "REQUEST_CHANGE", itemId: item.id, note }
        })
          .then(() => { wx.showToast({ title: "申请已提交", icon: "success" }); return this.load(); })
          .catch((err) => api.toast(err.message))
          .finally(() => this.setData({ saving: false }));
      }
    });
  },

  submit() {
    const item = this.data.selected;
    if (!item || item.locked || this.data.saving) return;
    const form = this.data.form;
    if (form.intent === "CHANGE" && (!form.weekdays.length || !form.timeRanges.some((row) => row.start && row.end && row.end > row.start))) {
      api.toast("修改时间时，请至少选择一个星期和一个可用时段");
      return;
    }
    if (form.teacherPreferenceType === "PREFERRED" && !form.preferredTeacherId) return api.toast("请选择老师");
    if (form.teacherPreferenceType === "VERIFY" && !form.teacherPreferenceNote.trim()) return api.toast("请填写希望协调的老师姓名");
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
        preferredTeacherId: form.preferredTeacherId,
        teacherPreferenceType: form.teacherPreferenceType,
        teacherPreferenceNote: form.teacherPreferenceNote,
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
