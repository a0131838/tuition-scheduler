const api = require("../../utils/api");
const config = require("../../utils/config");

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

function priorityName(value, fallback) {
  const name = String(value || "").split("：")[0].trim();
  return name || fallback;
}

function reportImprovementPlan(report) {
  if (report && Array.isArray(report.improvementPlan) && report.improvementPlan.length) return report.improvementPlan.slice(0, 3);
  const priorities = report && Array.isArray(report.priorities) ? report.priorities : [];
  const primary = priorityName(priorities[0], "当前薄弱项");
  const secondary = priorities.slice(1, 3).map((value) => priorityName(value, "")).filter(Boolean).join("、") || "已掌握内容";
  return [
    { stage: "第1–2周", title: `补稳${primary}`, detail: "由规划老师结合错题确认基础缺口，每周安排针对性讲解与练习。" },
    { stage: "第3–6周", title: `强化${secondary}`, detail: "按目标考试题型训练，并根据每周完成情况调整难度和训练量。" },
    { stage: "第7–8周", title: "模拟与复测", detail: "完成一次计时模拟，再使用下一套平行卷复测并比较进步。" }
  ];
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
    pathLabels: ["国际学校英语入学准备度", "AEIS小学入学准备度", "AEIS中学入学准备度"],
    pathValues: ["INTERNATIONAL_ENGLISH", "AEIS_PRIMARY", "AEIS_SECONDARY"],
    pathIndex: 0,
    sessionToken: "",
    session: null,
    hasSession: false,
    history: [],
    answerInput: "",
    domainRows: [],
    skillRows: [],
    comparisonRows: [],
    unmeasuredText: "",
    scorecards: [],
    moduleRows: [],
    improvementPlan: [],
    detailsExpanded: false,
    sectionTimerText: "",
    sectionExpiring: false,
    audioPlaying: false,
    audioPlayedUrls: {},
    currentAudioPlayed: false,
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

  onUnload() {
    this.stopSectionTimer();
    if (this.assessmentAudio) this.assessmentAudio.destroy();
  },

  stopSectionTimer() {
    if (this.sectionTimer) clearInterval(this.sectionTimer);
    this.sectionTimer = null;
  },

  startSectionTimer() {
    this.stopSectionTimer();
    if (!this.data.session || !this.data.session.section || this.data.phase !== "test") return;
    const tick = () => {
      const section = this.data.session && this.data.session.section;
      if (!section) return;
      const base = Number(section.remainingSeconds || 0);
      const elapsed = Math.floor((Date.now() - this.sectionReceivedAt) / 1000);
      const remaining = Math.max(0, base - elapsed);
      const minutes = Math.floor(remaining / 60);
      const seconds = String(remaining % 60).padStart(2, "0");
      this.setData({ sectionTimerText: `${minutes}:${seconds}` });
      if (remaining === 0 && !this.data.sectionExpiring) this.expireSection();
    };
    tick();
    this.sectionTimer = setInterval(tick, 1000);
  },

  expireSection() {
    if (!this.data.sessionToken || this.data.sectionExpiring) return;
    this.setData({ sectionExpiring: true });
    api.request("/api/public/school-guide/academic-assessment/session", {
      method: "POST", data: { action: "expire_section", sessionToken: this.data.sessionToken }, timeout: 20000
    }).then((data) => {
      if (data.message) api.toast(data.message);
      this.applySession(data.session);
    }).catch((err) => api.toast(err.message)).finally(() => this.setData({ sectionExpiring: false }));
  },

  playListeningAudio() {
    const question = this.data.session && this.data.session.question;
    const audioUrl = question && question.audioUrl;
    if (!audioUrl || this.data.audioPlaying || this.data.audioPlayedUrls[audioUrl]) return;
    if (!this.assessmentAudio) {
      this.assessmentAudio = wx.createInnerAudioContext();
      this.assessmentAudio.onPlay(() => this.setData({ audioPlaying: true }));
      this.assessmentAudio.onEnded(() => this.setData({ audioPlaying: false, currentAudioPlayed: true, audioPlayedUrls: { ...this.data.audioPlayedUrls, [this.currentAudioUrl]: true } }));
      this.assessmentAudio.onError(() => { this.setData({ audioPlaying: false }); api.toast("听力音频加载失败，请检查网络后重试"); });
    }
    this.currentAudioUrl = audioUrl;
    this.assessmentAudio.src = config.apiBaseUrl + audioUrl;
    this.assessmentAudio.play();
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
    const skillRows = Object.keys((session.report && session.report.skillScores) || {}).map((name) => ({ name, score: session.report.skillScores[name] }));
    const deltas = (session.report && session.report.comparison && session.report.comparison.skillDeltas) || {};
    const comparisonRows = Object.keys(deltas).filter((name) => deltas[name] != null).map((name) => ({ name, delta: Number(deltas[name]), label: `${Number(deltas[name]) >= 0 ? "+" : ""}${Number(deltas[name])}分` }));
    const unmeasuredText = (((session.report && session.report.unmeasuredSkills) || [])).join("、");
    const scorecards = (session.report && Array.isArray(session.report.scorecards) ? session.report.scorecards : []).map((item) => ({
      ...item,
      scoreLabel: item.score == null ? "待老师复核" : `${item.score} / 100`
    }));
    const moduleRows = Object.keys((session.report && session.report.moduleScores) || {}).map((name) => ({ name, score: session.report.moduleScores[name] }));
    const improvementPlan = reportImprovementPlan(session.report);
    const evidence = session.report && session.report.evidence ? session.report.evidence : null;
    const evidenceText = evidence
      ? `${evidence.totalItems}题（${evidence.objectiveItems}题客观题 + ${evidence.reviewedItems}题写作/复核）· ${evidence.skillCoverage.join("、")} · ${evidence.parallelForm}卷`
      : "";
    const retestDateText = formatDate(session.retestRecommendedAt);
    this.sectionReceivedAt = Date.now();
    const currentAudioUrl = session.question && session.question.audioUrl;
    this.setData({ session: { ...session, retestDateText, evidenceText }, phase, hasSession: true, answerInput: session.currentAnswer || "", domainRows, skillRows, moduleRows, improvementPlan, comparisonRows, unmeasuredText, scorecards, detailsExpanded: false, currentAudioPlayed: Boolean(currentAudioUrl && this.data.audioPlayedUrls[currentAudioUrl]), questionStartedAt: Date.now() }, () => this.startSectionTimer());
    if (["AWAITING_REVIEW", "COMPLETED"].includes(session.status) && this.data.sessionToken) this.rememberSession(session, retestDateText);
  },

  rememberSession(session, retestDateText) {
    const scoreLabel = session.status === "AWAITING_REVIEW"
      ? "等待老师复核"
      : session.overallScore == null ? session.overallBand : `${session.overallScore}分`;
    const row = { token: this.data.sessionToken, studentCode: session.studentCode, studentNickname: session.studentNickname || "学生", scoreLabel, completedAt: formatDate(session.completedAt || session.submittedAt), retestDateText };
    const history = [row].concat((this.data.history || []).filter((item) => item.token !== row.token)).slice(0, 10);
    wx.setStorageSync(HISTORY_KEY, history);
    this.setData({ history });
  },

  startNewRound() {
    if (this.data.sessionToken && this.data.session && ["AWAITING_REVIEW", "COMPLETED"].includes(this.data.session.status)) {
      return this.startParallelRetest();
    }
    return this.resetForNewProduct();
  },

  resetForNewProduct() {
    wx.removeStorageSync(SESSION_KEY);
    this.stopSectionTimer();
    this.setData({ sessionToken: "", session: null, hasSession: false, phase: "setup", consent: false, answerInput: "", domainRows: [], skillRows: [], moduleRows: [], improvementPlan: [], comparisonRows: [], scorecards: [], detailsExpanded: false, audioPlayedUrls: {} });
  },

  startParallelRetest() {
    const source = this.data.session;
    if (!source || !this.data.sessionToken) return api.toast("没有可复测的原记录");
    wx.showModal({
      title: "开始平行卷复测",
      content: "本轮记录会保留，新一轮将优先更换A/B/C平行卷。24小时内最多开始3轮，避免记忆题目影响结果。",
      success: (result) => {
        if (!result.confirm) return;
        this.setData({ loading: true });
        api.request("/api/public/school-guide/academic-assessment/start", {
          method: "POST",
          data: {
            retestSessionToken: this.data.sessionToken,
            studentNickname: source.studentNickname,
            currentGrade: source.currentGrade,
            languageBackground: source.languageBackground,
            ageBand: source.ageBand,
            targetPath: source.targetPath,
            consent: "yes"
          },
          timeout: 20000
        }).then((data) => {
          wx.setStorageSync(SESSION_KEY, data.sessionToken);
          this.setData({ sessionToken: data.sessionToken, hasSession: true });
          this.applySession(data.session);
        }).catch((err) => api.toast(err.message)).finally(() => this.setData({ loading: false }));
      }
    });
  },

  startForAnotherChild() {
    wx.removeStorageSync(SESSION_KEY);
    this.stopSectionTimer();
    this.setData({ sessionToken: "", session: null, hasSession: false, phase: "setup", consent: false, studentNickname: "", currentGrade: "", languageBackground: "", answerInput: "", domainRows: [], skillRows: [], moduleRows: [], improvementPlan: [], comparisonRows: [], scorecards: [], detailsExpanded: false, audioPlayedUrls: {} });
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
  toggleReportDetails() { this.setData({ detailsExpanded: !this.data.detailsExpanded }); },
  goConsult() {
    const session = this.data.session;
    const scoreSummary = (this.data.scorecards || []).map((item) => `${item.label}${item.scoreLabel}`).join("；");
    const prioritySummary = ((session && session.report && session.report.priorities) || []).slice(0, 3).join("；");
    const summary = session
      ? `希望规划老师制定学习方案：${session.studentCode}；${session.ageBand}；${scoreSummary || session.overallBand || "待评分"}；优先提升：${prioritySummary || "待老师结合报告确认"}`
      : "希望规划老师结合入学准备度测评制定学习方案";
    wx.navigateTo({ url: "/pages/guide-consult/guide-consult?summary=" + encodeURIComponent(summary) });
  },
  onShareAppMessage() { return { title: "新加坡学校指南｜入学准备度测评", path: "/pages/guide-academic-assessment/guide-academic-assessment" }; }
});
