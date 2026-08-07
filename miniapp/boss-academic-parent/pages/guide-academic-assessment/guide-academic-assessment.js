const api = require("../../utils/api");

const SESSION_KEY = "school_guide_academic_assessment_token";
const REQUEST_KEY = "school_guide_academic_assessment_request_token";
const HISTORY_KEY = "school_guide_academic_assessment_history";

function dateAfter(days) {
  const value = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

Page({
  data: {
    phase: "hub",
    loading: false,
    code: "",
    studentNickname: "",
    currentGrade: "",
    languageBackground: "",
    consent: false,
    ageOptions: ["3–5岁", "6–8岁", "9–11岁", "12–14岁", "15–17岁"],
    ageIndex: 1,
    pathLabels: ["暂不确定", "国际学校", "政府学校 / AEIS", "DSA / 面试 / 作品集"],
    pathValues: ["UNSURE", "INTERNATIONAL", "MOE_AEIS", "DSA"],
    pathIndex: 0,
    sessionToken: "",
    session: null,
    hasSession: false,
    history: [],
    answerInput: "",
    domainRows: [],
    questionStartedAt: 0,
    requestToken: "",
    request: null,
    hasRequest: false,
    requestProgress: 0,
    requestForm: {
      parentName: "",
      studentNickname: "",
      parentWechat: "",
      currentGrade: "",
      preferredTestDate: dateAfter(3),
      note: ""
    },
    requestAgeIndex: 1,
    requestPathIndex: 0,
    needOptions: ["了解孩子目前水平", "准备国际学校入学考试", "准备AEIS / 政府学校", "准备面试或DSA", "不确定适合什么学校", "其他"],
    needIndex: 0,
    requestConsent: false
  },

  onLoad(options) {
    wx.setKeepScreenOn({ keepScreenOn: true });
    const sessionToken = wx.getStorageSync(SESSION_KEY) || "";
    const requestToken = wx.getStorageSync(REQUEST_KEY) || "";
    const history = wx.getStorageSync(HISTORY_KEY);
    const intent = options && options.intent;
    this.setData({ sessionToken, requestToken, hasSession: Boolean(sessionToken), hasRequest: Boolean(requestToken), history: Array.isArray(history) ? history : [] });
    if (intent === "request") return this.openCodeSetup();
    if (intent === "code") return this.openCodeSetup();
    if (sessionToken) {
      this.setData({ loading: true });
      return this.loadSession().catch(() => {
        wx.removeStorageSync(SESSION_KEY);
        this.setData({ sessionToken: "", hasSession: false, phase: requestToken ? "requestStatus" : "hub" });
        if (requestToken) return this.loadRequest();
      }).finally(() => this.setData({ loading: false }));
    }
    if (requestToken) {
      this.setData({ phase: "requestStatus", loading: true });
      return this.loadRequest().catch(() => {
        wx.removeStorageSync(REQUEST_KEY);
        this.setData({ requestToken: "", request: null, hasRequest: false, phase: "hub" });
      }).finally(() => this.setData({ loading: false }));
    }
  },

  openRequestForm() { this.setData({ phase: "requestForm" }); },
  openCodeSetup() { this.setData({ phase: "setup" }); },
  openSavedRequest() { this.setData({ phase: "requestStatus", loading: true }); this.loadRequest().finally(() => this.setData({ loading: false })); },
  backToHub() { this.setData({ phase: "hub" }); },
  openHistory(event) {
    const token = event.currentTarget.dataset.token || "";
    if (!token) return;
    wx.setStorageSync(SESSION_KEY, token);
    this.setData({ sessionToken: token, hasSession: true, loading: true });
    this.loadSession().catch((err) => api.toast(err.message)).finally(() => this.setData({ loading: false }));
  },

  setCode(event) { this.setData({ code: event.detail.value }); },
  setNickname(event) { this.setData({ studentNickname: event.detail.value }); },
  setGrade(event) { this.setData({ currentGrade: event.detail.value }); },
  setLanguage(event) { this.setData({ languageBackground: event.detail.value }); },
  setAge(event) { this.setData({ ageIndex: Number(event.detail.value) }); },
  setPath(event) { this.setData({ pathIndex: Number(event.detail.value) }); },
  toggleConsent(event) { this.setData({ consent: (event.detail.value || []).includes("yes") }); },
  openPrivacy() { wx.navigateTo({ url: "/pages/guide-privacy/guide-privacy" }); },
  setAnswer(event) { this.setData({ answerInput: event.detail.value }); },
  chooseOption(event) { this.setData({ answerInput: event.currentTarget.dataset.key }); },
  setRequestField(event) { this.setData({ ["requestForm." + event.currentTarget.dataset.key]: event.detail.value || "" }); },
  setRequestAge(event) { this.setData({ requestAgeIndex: Number(event.detail.value) }); },
  setRequestPath(event) { this.setData({ requestPathIndex: Number(event.detail.value) }); },
  setRequestNeed(event) { this.setData({ needIndex: Number(event.detail.value) }); },
  setRequestDate(event) { this.setData({ "requestForm.preferredTestDate": event.detail.value || "" }); },
  toggleRequestConsent(event) { this.setData({ requestConsent: (event.detail.value || []).includes("yes") }); },

  applyRequest(request) {
    const ageIndex = Math.max(0, this.data.ageOptions.indexOf(request.ageBand));
    const pathIndex = Math.max(0, this.data.pathValues.indexOf(request.targetPath));
    this.setData({
      request,
      hasRequest: true,
      requestProgress: Math.max(8, Math.min(100, Math.round(((request.currentStep || 1) / 8) * 100))),
      studentNickname: request.studentNickname || this.data.studentNickname,
      currentGrade: request.currentGrade || this.data.currentGrade,
      ageIndex,
      pathIndex,
      phase: "requestStatus"
    });
  },

  loadRequest() {
    if (!this.data.requestToken) return Promise.reject(new Error("没有申请记录"));
    return api.request("/api/public/school-guide/academic-assessment/request", {
      method: "POST",
      data: { action: "status", requestToken: this.data.requestToken },
      timeout: 15000
    }).then((data) => this.applyRequest(data.request));
  },

  submitRequest() {
    const form = this.data.requestForm;
    if (!form.parentName.trim() || !form.studentNickname.trim()) return api.toast("请填写家长称呼和学生昵称");
    if (!form.parentWechat.trim()) return api.toast("请填写微信号");
    if (!this.data.requestConsent) return api.toast("请确认资料使用授权");
    this.setData({ loading: true });
    api.request("/api/public/school-guide/academic-assessment/request", {
      method: "POST",
      data: {
        action: "create",
        parentName: form.parentName,
        studentNickname: form.studentNickname,
        parentWechat: form.parentWechat,
        ageBand: this.data.ageOptions[this.data.requestAgeIndex],
        currentGrade: form.currentGrade,
        targetPath: this.data.pathValues[this.data.requestPathIndex],
        preferredTestDate: form.preferredTestDate,
        needType: this.data.needOptions[this.data.needIndex],
        note: form.note,
        requestToken: this.data.requestToken,
        consent: "yes"
      },
      timeout: 20000
    }).then((data) => {
      if (data.requestToken) {
        wx.setStorageSync(REQUEST_KEY, data.requestToken);
        this.setData({ requestToken: data.requestToken });
      }
      this.applyRequest(data.request);
      const requestNo = data.request.requestNo ? `申请编号：${data.request.requestNo}\n` : "";
      wx.showModal({ title: data.duplicate ? "已有开放申请" : "申请已收到", content: `${requestNo}${data.request.nextAction}`, showCancel: false });
    }).catch((err) => api.toast(err.message)).finally(() => this.setData({ loading: false }));
  },

  copyRequestNo() {
    if (!this.data.request) return;
    wx.setClipboardData({ data: this.data.request.requestNo, success: () => api.toast("申请编号已复制") });
  },

  applySession(session) {
    let phase = "test";
    if (session.status === "AWAITING_REVIEW") phase = "awaiting";
    if (session.status === "COMPLETED") phase = "report";
    const domainRows = Object.keys(session.domainScores || {}).map((name) => ({ name, score: session.domainScores[name] }));
    const retestDateText = formatDate(session.retestRecommendedAt);
    this.setData({ session: { ...session, retestDateText }, phase, hasSession: true, answerInput: session.currentAnswer || "", domainRows, questionStartedAt: Date.now() });
    if (session.status === "COMPLETED" && this.data.sessionToken) this.rememberSession(session, retestDateText);
  },

  rememberSession(session, retestDateText) {
    const row = { token: this.data.sessionToken, studentCode: session.studentCode, studentNickname: session.studentNickname || "学生", score: session.overallScore, completedAt: formatDate(session.completedAt), retestDateText };
    const history = [row].concat((this.data.history || []).filter((item) => item.token !== row.token)).slice(0, 10);
    wx.setStorageSync(HISTORY_KEY, history);
    this.setData({ history });
  },

  startNewRound() {
    wx.removeStorageSync(SESSION_KEY);
    this.setData({ sessionToken: "", session: null, hasSession: false, phase: "setup", consent: false, answerInput: "", domainRows: [] });
  },

  startForAnotherChild() {
    wx.removeStorageSync(SESSION_KEY);
    this.setData({ sessionToken: "", session: null, hasSession: false, phase: "setup", consent: false, studentNickname: "", currentGrade: "", languageBackground: "", answerInput: "", domainRows: [] });
  },

  loadSession() {
    return api.request("/api/public/school-guide/academic-assessment/session", { method: "POST", data: { action: "load", sessionToken: this.data.sessionToken }, timeout: 20000 }).then((data) => this.applySession(data.session));
  },

  start() { return this.startAssessment(""); },
  startFromRequest() { return this.startAssessment(this.data.requestToken); },
  startAssessment(requestToken) {
    if (!requestToken && !this.data.studentNickname.trim()) return api.toast("请填写学生昵称");
    if (!requestToken && !this.data.consent) return api.toast("请由家长或监护人确认资料使用授权");
    this.setData({ loading: true });
    api.request("/api/public/school-guide/academic-assessment/start", {
      method: "POST",
      data: {
        code: requestToken ? "" : undefined,
        requestToken,
        studentNickname: this.data.studentNickname,
        currentGrade: this.data.currentGrade,
        languageBackground: this.data.languageBackground,
        ageBand: this.data.ageOptions[this.data.ageIndex],
        targetPath: this.data.pathValues[this.data.pathIndex],
        consent: "yes"
      },
      timeout: 20000
    }).then((data) => {
      wx.setStorageSync(SESSION_KEY, data.sessionToken);
      this.setData({ sessionToken: data.sessionToken, hasSession: true });
      this.applySession(data.session);
    }).catch((err) => api.toast(err.message)).finally(() => this.setData({ loading: false }));
  },

  saveAnswer() {
    const session = this.data.session || {};
    if (!session.question || !String(this.data.answerInput || "").trim()) return api.toast("请先作答");
    const durationSeconds = Math.max(1, Math.round((Date.now() - this.data.questionStartedAt) / 1000));
    this.setData({ loading: true });
    api.request("/api/public/school-guide/academic-assessment/session", { method: "POST", data: { action: "answer", sessionToken: this.data.sessionToken, questionId: session.question.id, answer: this.data.answerInput, durationSeconds }, timeout: 20000 })
      .then((data) => this.applySession(data.session)).catch((err) => api.toast(err.message)).finally(() => this.setData({ loading: false }));
  },

  submitAssessment() {
    wx.showModal({ title: "确认提交", content: "提交后不能继续修改答案；开放任务将进入老师评分队列。", success: (result) => {
      if (!result.confirm) return;
      this.setData({ loading: true });
      api.request("/api/public/school-guide/academic-assessment/session", { method: "POST", data: { action: "submit", sessionToken: this.data.sessionToken }, timeout: 20000 })
        .then((data) => { api.toast(data.message); this.applySession(data.session); })
        .catch((err) => api.toast(err.message)).finally(() => this.setData({ loading: false }));
    }});
  },

  refresh() { this.setData({ loading: true }); this.loadSession().catch((err) => api.toast(err.message)).finally(() => this.setData({ loading: false })); },
  goConsult() {
    const summary = this.data.session ? `希望顾问专业分析：${this.data.session.studentCode}；${this.data.session.ageBand}；${this.data.session.overallBand || "待评分"}` : "希望顾问专业分析入学准备度测评";
    wx.navigateTo({ url: "/pages/guide-consult/guide-consult?summary=" + encodeURIComponent(summary) });
  },
  onShareAppMessage() { return { title: "新加坡学校指南｜入学准备度测评", path: "/pages/guide-academic-assessment/guide-academic-assessment" }; }
});
