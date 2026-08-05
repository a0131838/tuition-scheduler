const api = require("../../utils/api");

const SESSION_KEY = "school_guide_academic_assessment_token";

Page({
  data: {
    phase: "setup",
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
    answerInput: "",
    domainRows: [],
    questionStartedAt: 0
  },

  onLoad() {
    wx.setKeepScreenOn({ keepScreenOn: true });
    const token = wx.getStorageSync(SESSION_KEY) || "";
    if (token) {
      this.setData({ sessionToken: token, loading: true });
      this.loadSession().catch(() => {
        wx.removeStorageSync(SESSION_KEY);
        this.setData({ sessionToken: "", phase: "setup" });
      }).finally(() => this.setData({ loading: false }));
    }
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

  applySession(session) {
    let phase = "test";
    if (session.status === "AWAITING_REVIEW") phase = "awaiting";
    if (session.status === "COMPLETED") phase = "report";
    const domainRows = Object.keys(session.domainScores || {}).map((name) => ({ name, score: session.domainScores[name] }));
    this.setData({
      session,
      phase,
      answerInput: session.currentAnswer || "",
      domainRows,
      questionStartedAt: Date.now()
    });
  },

  loadSession() {
    return api.request("/api/public/school-guide/academic-assessment/session", {
      method: "POST",
      data: { action: "load", sessionToken: this.data.sessionToken },
      timeout: 20000
    }).then((data) => this.applySession(data.session));
  },

  start() {
    if (!this.data.code.trim()) return api.toast("请输入评估码");
    if (!this.data.consent) return api.toast("请由家长或监护人确认资料使用授权");
    this.setData({ loading: true });
    api.request("/api/public/school-guide/academic-assessment/start", {
      method: "POST",
      data: {
        code: this.data.code,
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
      this.setData({ sessionToken: data.sessionToken });
      this.applySession(data.session);
    }).catch((err) => api.toast(err.message)).finally(() => this.setData({ loading: false }));
  },

  saveAnswer() {
    const session = this.data.session || {};
    if (!session.question || !String(this.data.answerInput || "").trim()) return api.toast("请先作答");
    const durationSeconds = Math.max(1, Math.round((Date.now() - this.data.questionStartedAt) / 1000));
    this.setData({ loading: true });
    api.request("/api/public/school-guide/academic-assessment/session", {
      method: "POST",
      data: {
        action: "answer",
        sessionToken: this.data.sessionToken,
        questionId: session.question.id,
        answer: this.data.answerInput,
        durationSeconds
      },
      timeout: 20000
    }).then((data) => this.applySession(data.session))
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },

  submitAssessment() {
    wx.showModal({
      title: "确认提交",
      content: "提交后不能继续修改答案；开放任务将进入老师评分队列。",
      success: (result) => {
        if (!result.confirm) return;
        this.setData({ loading: true });
        api.request("/api/public/school-guide/academic-assessment/session", {
          method: "POST",
          data: { action: "submit", sessionToken: this.data.sessionToken },
          timeout: 20000
        }).then((data) => {
          api.toast(data.message);
          this.applySession(data.session);
        }).catch((err) => api.toast(err.message)).finally(() => this.setData({ loading: false }));
      }
    });
  },

  refresh() {
    this.setData({ loading: true });
    this.loadSession().catch((err) => api.toast(err.message)).finally(() => this.setData({ loading: false }));
  },

  goConsult() {
    const summary = this.data.session ? `${this.data.session.studentCode}；${this.data.session.ageBand}；${this.data.session.overallBand || "待评分"}` : "入学准备度测评";
    wx.navigateTo({ url: "/pages/guide-consult/guide-consult?summary=" + encodeURIComponent(summary) });
  },

  onShareAppMessage() {
    return { title: "新加坡学校指南｜入学准备度测评", path: "/pages/guide-academic-assessment/guide-academic-assessment" };
  }
});
