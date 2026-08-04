const api = require("../../utils/api");

const intentOptions = [
  { value: "KEEP", label: "保持目前安排" },
  { value: "CHANGE", label: "希望修改时间" },
  { value: "PAUSE", label: "下个月暂停" },
  { value: "UNSURE", label: "尚未确定，请联系" }
];
const channelOptions = [
  { value: "WECHAT_GROUP", label: "微信群" },
  { value: "WECHAT_PRIVATE", label: "微信私聊" },
  { value: "PHONE", label: "电话" },
  { value: "OTHER", label: "其他" }
];
const weekdayOptions = [
  { value: "MON", label: "周一" }, { value: "TUE", label: "周二" }, { value: "WED", label: "周三" },
  { value: "THU", label: "周四" }, { value: "FRI", label: "周五" }, { value: "SAT", label: "周六" }, { value: "SUN", label: "周日" }
];
const teacherPreferenceOptions = [
  { value: "NONE", label: "不指定老师" }, { value: "CURRENT", label: "沿用当前老师" },
  { value: "PREFERRED", label: "选择合格老师" }, { value: "VERIFY", label: "家长提到老师，待核对" }
];
const timePriorityOptions = [
  { value: "REQUIRED", label: "必须满足" }, { value: "PREFERRED", label: "优先选择" }, { value: "ACCEPTABLE", label: "可以接受" }
];
const editableStatuses = ["NOT_SENT", "SENT", "VIEWED", "SUBMITTED", "OFFERED", "NEEDS_CLARIFICATION", "NO_RESPONSE"];

function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function businessDate(value) {
  const parsed = new Date(value || "");
  return Number.isNaN(parsed.getTime()) ? today() : new Date(parsed.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

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
    timeRanges: [{ start: "09:00", end: "12:00", priority: "REQUIRED", priorityIndex: 0 }, { start: "14:00", end: "18:00", priority: "PREFERRED", priorityIndex: 1 }, { start: "19:00", end: "21:00", priority: "ACCEPTABLE", priorityIndex: 2 }],
    unavailableDatesText: "",
    parentNotes: "",
    responseChannel: "WECHAT_GROUP",
    parentConfirmationNote: "",
    parentConfirmedAt: today()
  };
}

Page({
  data: {
    loading: true,
    saving: false,
    itemId: "",
    item: null,
    canEditPreference: false,
    intentOptions,
    intentIndex: 0,
    channelOptions,
    channelIndex: 0,
    weekdayOptions,
    teacherPreferenceOptions,
    timePriorityOptions,
    teacherPreferenceIndex: 0,
    teacherOptions: [],
    teacherIndex: 0,
    form: blankForm(),
    rankedOfferIds: [],
    selectionChannelIndex: 0,
    selectionNote: "",
    selectionConfirmedAt: today(),
    todayDate: today()
  },

  onLoad(options) {
    this.setData({ itemId: options.itemId || "" });
    this.load();
  },

  load() {
    if (!this.data.itemId) return Promise.resolve(api.toast("缺少排课项目"));
    this.setData({ loading: true });
    return api.requestStaff(`/api/miniapp/staff/monthly-scheduling?status=ALL&itemId=${encodeURIComponent(this.data.itemId)}`, { timeout: 15000 })
      .then((data) => {
        const item = (data.items || [])[0];
        if (!item) throw new Error("排课项目不存在或月份已关闭");
        const availability = item.availability || {};
        const ranges = (availability.timeRanges || []).slice(0, 3).map((row, index) => {
          const priority = row.priority || timePriorityOptions[index].value;
          return Object.assign({}, row, { priority, priorityIndex: Math.max(0, timePriorityOptions.findIndex((option) => option.value === priority)) });
        });
        const defaults = blankForm().timeRanges;
        while (ranges.length < 3) ranges.push(defaults[ranges.length]);
        const responseChannel = item.responseChannel || "WECHAT_GROUP";
        const selectionChannel = item.offerSelectionChannel || responseChannel;
        const rankedOfferIds = (item.offers || []).filter((row) => row.parentRank).sort((a, b) => a.parentRank - b.parentRank).map((row) => row.id);
        const displayItem = Object.assign({}, item, {
          offers: (item.offers || []).map((row) => Object.assign({}, row, { displayRank: rankedOfferIds.indexOf(row.id) + 1 }))
        });
        const form = {
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
          unavailableDatesText: Array.isArray(item.unavailableDates) ? item.unavailableDates.join(", ") : "",
          parentNotes: item.parentNotes || "",
          responseChannel,
          parentConfirmationNote: item.parentConfirmationNote || "",
          parentConfirmedAt: item.parentConfirmedAt ? businessDate(item.parentConfirmedAt) : today()
        };
        const teacherOptions = [{ id: "", name: "请选择合格老师" }].concat(item.teacherOptions || []);
        this.setData({
          item: displayItem,
          form,
          canEditPreference: editableStatuses.includes(item.status),
          intentIndex: Math.max(0, intentOptions.findIndex((row) => row.value === form.intent)),
          channelIndex: Math.max(0, channelOptions.findIndex((row) => row.value === responseChannel)),
          teacherPreferenceIndex: Math.max(0, teacherPreferenceOptions.findIndex((row) => row.value === form.teacherPreferenceType)),
          teacherOptions,
          teacherIndex: Math.max(0, teacherOptions.findIndex((row) => row.id === form.preferredTeacherId)),
          weekdayOptions: weekdayOptions.map((row) => Object.assign({}, row, { selected: form.weekdays.includes(row.value) })),
          rankedOfferIds,
          selectionChannelIndex: Math.max(0, channelOptions.findIndex((row) => row.value === selectionChannel)),
          selectionNote: item.offerSelectionNote || "",
          selectionConfirmedAt: item.offerParentConfirmedAt ? businessDate(item.offerParentConfirmedAt) : today()
        });
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  changeIntent(e) {
    const index = Number(e.detail.value || 0);
    this.setData({ intentIndex: index, "form.intent": intentOptions[index].value });
  },
  changeChannel(e) {
    const index = Number(e.detail.value || 0);
    this.setData({ channelIndex: index, "form.responseChannel": channelOptions[index].value });
  },
  changeMode(e) { this.setData({ "form.preferredMode": e.currentTarget.dataset.value || "" }); },
  changeTeacherPreference(e) {
    const index = Number(e.detail.value || 0);
    const value = teacherPreferenceOptions[index].value;
    this.setData({ teacherPreferenceIndex: index, "form.teacherPreferenceType": value, ...(value === "PREFERRED" ? {} : { "form.preferredTeacherId": "", teacherIndex: 0 }) });
  },
  changeTeacher(e) {
    const index = Number(e.detail.value || 0);
    this.setData({ teacherIndex: index, "form.preferredTeacherId": (this.data.teacherOptions[index] || {}).id || "" });
  },
  changeSelectionChannel(e) { this.setData({ selectionChannelIndex: Number(e.detail.value || 0) }); },
  toggleWeekday(e) {
    const value = e.currentTarget.dataset.value;
    const current = this.data.form.weekdays.slice();
    const next = current.includes(value) ? current.filter((row) => row !== value) : current.concat(value);
    this.setData({ "form.weekdays": next, weekdayOptions: weekdayOptions.map((row) => Object.assign({}, row, { selected: next.includes(row.value) })) });
  },
  inputField(e) { this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value }); },
  inputNumber(e) { this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value }); },
  changeTime(e) { this.setData({ [`form.timeRanges[${Number(e.currentTarget.dataset.index)}].${e.currentTarget.dataset.field}`]: e.detail.value }); },
  changeTimePriority(e) {
    const index = Number(e.currentTarget.dataset.index);
    const optionIndex = Number(e.detail.value || 0);
    this.setData({ [`form.timeRanges[${index}].priority`]: (timePriorityOptions[optionIndex] || timePriorityOptions[1]).value, [`form.timeRanges[${index}].priorityIndex`]: optionIndex });
  },
  changeConfirmedDate(e) { this.setData({ "form.parentConfirmedAt": e.detail.value }); },
  changeSelectionDate(e) { this.setData({ selectionConfirmedAt: e.detail.value }); },
  inputSelectionNote(e) { this.setData({ selectionNote: e.detail.value }); },

  submitPreference() {
    const item = this.data.item;
    const form = this.data.form;
    if (!item || !this.data.canEditPreference || this.data.saving) return;
    if (!form.parentConfirmationNote.trim()) return api.toast("请填写家长原话或沟通摘要");
    if (form.teacherPreferenceType === "PREFERRED" && !form.preferredTeacherId) return api.toast("请选择合格老师");
    if (form.teacherPreferenceType === "VERIFY" && !form.teacherPreferenceNote.trim()) return api.toast("请填写家长提到的老师姓名");
    if (form.intent === "CHANGE" && (!form.weekdays.length || !form.timeRanges.some((row) => row.start && row.end && row.end > row.start))) return api.toast("请填写家长可上课星期和时段");
    this.setData({ saving: true });
    api.requestStaff("/api/miniapp/staff/monthly-scheduling", {
      method: "POST",
      timeout: 20000,
      data: {
        action: "PROXY_PREFERENCE",
        itemId: item.id,
        expectedStatus: item.status,
        intent: form.intent,
        expectedSessionsPerWeek: form.expectedSessionsPerWeek === "" ? null : Number(form.expectedSessionsPerWeek),
        expectedMinutes: form.expectedMinutes === "" ? null : Number(form.expectedMinutes),
        preferredMode: form.preferredMode,
        preferredCampus: form.preferredCampus,
        preferredTeacherId: form.preferredTeacherId,
        teacherPreferenceType: form.teacherPreferenceType,
        teacherPreferenceNote: form.teacherPreferenceNote,
        availability: { selectionMode: "weekly", weekdays: form.weekdays, timeRanges: form.timeRanges.filter((row) => row.start && row.end && row.end > row.start), dateSelections: [] },
        unavailableDates: form.unavailableDatesText.split(/[\s,，;；]+/).filter(Boolean),
        parentNotes: form.parentNotes,
        responseChannel: form.responseChannel,
        parentConfirmationNote: form.parentConfirmationNote,
        parentConfirmedAt: form.parentConfirmedAt
      }
    }).then(() => { wx.showToast({ title: "代录成功", icon: "success" }); return this.load(); })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ saving: false }));
  },

  submitFamilyKeep() {
    const item = this.data.item;
    const form = this.data.form;
    if (!item || !item.familyCanKeep || !form.parentConfirmationNote.trim() || this.data.saving) return api.toast("请填写家长原话或沟通摘要");
    wx.showModal({
      title: "代录全家沿用",
      content: `将记录本家庭 ${item.familyItemCount || 1} 项课程沿用本月固定安排。不会创建正式课程。`,
      confirmText: "确认代录",
      success: (result) => {
        if (!result.confirm) return;
        this.setData({ saving: true });
        api.requestStaff("/api/miniapp/staff/monthly-scheduling", {
          method: "POST",
          timeout: 20000,
          data: {
            action: "PROXY_KEEP_FAMILY",
            campaignId: item.campaignId,
            itemId: item.id,
            responseChannel: form.responseChannel,
            parentConfirmationNote: form.parentConfirmationNote,
            parentConfirmedAt: form.parentConfirmedAt
          }
        }).then(() => { wx.showToast({ title: "全家代录成功", icon: "success" }); return this.load(); })
          .catch((err) => api.toast(err.message))
          .finally(() => this.setData({ saving: false }));
      }
    });
  },

  toggleOffer(e) {
    const id = e.currentTarget.dataset.id;
    const current = this.data.rankedOfferIds.slice();
    const existing = current.indexOf(id);
    if (existing >= 0) current.splice(existing, 1);
    else if (current.length < 3) current.push(id);
    else return api.toast("最多记录三个选择");
    this.setData({
      rankedOfferIds: current,
      "item.offers": (this.data.item.offers || []).map((row) => Object.assign({}, row, { displayRank: current.indexOf(row.id) + 1 }))
    });
  },

  submitRanking() {
    const item = this.data.item;
    if (!item || !this.data.rankedOfferIds.length || !this.data.selectionNote.trim() || this.data.saving) return api.toast("请选择时间并填写家长回复摘要");
    const channel = channelOptions[this.data.selectionChannelIndex] || channelOptions[0];
    this.setData({ saving: true });
    api.requestStaff("/api/miniapp/staff/monthly-scheduling", {
      method: "POST",
      timeout: 20000,
      data: {
        action: "PROXY_RANK_OFFERS",
        itemId: item.id,
        offerIds: this.data.rankedOfferIds,
        responseChannel: channel.value,
        parentConfirmationNote: this.data.selectionNote,
        parentConfirmedAt: this.data.selectionConfirmedAt
      }
    }).then(() => { wx.showToast({ title: "已临时保留", icon: "success" }); return this.load(); })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ saving: false }));
  }
});
