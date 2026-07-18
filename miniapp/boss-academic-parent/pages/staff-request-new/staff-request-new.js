const api = require("../../utils/api");

const types = ["投诉", "普通反馈", "给老师的话", "排课要求", "新排课", "补课加课", "请假/取消", "财务问题", "学校事务", "其他"];
const communicationSources = ["微信群", "电话", "线下", "老师转达", "内部发现", "家长小程序", "其他"];
const priorities = ["普通", "1小时紧急", "6小时紧急", "24小时紧急"];
const owners = ["自动分配", "Jasmine", "Eva", "Emily"];

let searchTimer = null;
let studentSearchSeq = 0;

Page({
  data: {
    types,
    communicationSources,
    priorities,
    owners,
    typeIndex: 1,
    communicationSourceIndex: 0,
    priorityIndex: 0,
    ownerIndex: 0,
    studentQuery: "",
    studentResults: [],
    selectedStudentId: "",
    selectedStudentLabel: "",
    sourceDetail: "",
    originalContent: "",
    publicSummary: "",
    requiredAction: "",
    latestDeadlineText: "",
    files: [],
    searching: false,
    loading: false
  },

  onUnload() {
    if (searchTimer) clearTimeout(searchTimer);
    studentSearchSeq += 1;
  },

  onTypeChange(e) {
    this.setData({ typeIndex: Number(e.detail.value || 0) });
  },

  onSourceChange(e) {
    this.setData({ communicationSourceIndex: Number(e.detail.value || 0) });
  },

  onPriorityChange(e) {
    this.setData({ priorityIndex: Number(e.detail.value || 0) });
  },

  onOwnerChange(e) {
    this.setData({ ownerIndex: Number(e.detail.value || 0) });
  },

  onStudentInput(e) {
    const value = e.detail.value || "";
    this.setData({
      studentQuery: value,
      selectedStudentId: "",
      selectedStudentLabel: ""
    });
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => this.searchStudents(), 450);
  },

  searchStudents(event) {
    if (searchTimer) clearTimeout(searchTimer);
    const seq = ++studentSearchSeq;
    const query = this.data.studentQuery.trim();
    if (query.length < 2) {
      this.setData({ studentResults: [], searching: false });
      if (event) api.toast("请输入至少两个字");
      return;
    }
    this.setData({ searching: true });
    api.requestStaff("/api/miniapp/staff/students?q=" + encodeURIComponent(query), { timeout: 12000 })
      .then((data) => {
        if (seq !== studentSearchSeq) return;
        this.setData({ studentResults: data.students || [] });
      })
      .catch((err) => {
        if (seq === studentSearchSeq) api.toast(err.message);
      })
      .finally(() => {
        if (seq === studentSearchSeq) this.setData({ searching: false });
      });
  },

  clearStudentSearch() {
    if (searchTimer) clearTimeout(searchTimer);
    studentSearchSeq += 1;
    this.setData({
      studentQuery: "",
      studentResults: [],
      selectedStudentId: "",
      selectedStudentLabel: "",
      searching: false
    });
  },

  selectStudent(e) {
    const id = e.currentTarget.dataset.id;
    const label = e.currentTarget.dataset.label;
    studentSearchSeq += 1;
    if (searchTimer) clearTimeout(searchTimer);
    this.setData({
      selectedStudentId: id,
      selectedStudentLabel: label,
      studentQuery: label,
      studentResults: [],
      searching: false
    });
  },

  onSourceDetailInput(e) {
    this.setData({ sourceDetail: e.detail.value });
  },

  onOriginalInput(e) {
    this.setData({ originalContent: e.detail.value });
  },

  onPublicInput(e) {
    this.setData({ publicSummary: e.detail.value });
  },

  onActionInput(e) {
    this.setData({ requiredAction: e.detail.value });
  },

  onDeadlineInput(e) {
    this.setData({ latestDeadlineText: e.detail.value });
  },

  appendFiles(nextFiles) {
    const merged = this.data.files.slice();
    (nextFiles || []).forEach((file) => {
      if (!file.path || merged.some((item) => item.path === file.path)) return;
      if (merged.length < 9) merged.push(file);
    });
    this.setData({ files: merged });
  },

  choosePhotos() {
    const remaining = 9 - this.data.files.length;
    if (remaining <= 0) return api.toast("最多上传 9 个附件");
    wx.chooseMedia({
      count: remaining,
      mediaType: ["image"],
      sourceType: ["album"],
      success: (res) => {
        const photos = (res.tempFiles || []).map((file, index) => ({
          path: file.tempFilePath,
          name: `相册截图 ${this.data.files.length + index + 1}`,
          size: file.size || 0,
          isImage: true
        }));
        this.appendFiles(photos);
      },
      fail: () => {}
    });
  },

  chooseFiles() {
    const remaining = 9 - this.data.files.length;
    if (remaining <= 0) return api.toast("最多上传 9 个附件");
    wx.chooseMessageFile({
      count: remaining,
      type: "all",
      success: (res) => {
        const files = (res.tempFiles || []).map((file) => ({
          path: file.path,
          name: file.name || "微信文件",
          size: file.size || 0,
          isImage: /\.(jpe?g|png|webp|gif)$/i.test(file.name || "")
        }));
        this.appendFiles(files);
      },
      fail: () => {}
    });
  },

  previewFile(e) {
    const index = Number(e.currentTarget.dataset.index || 0);
    const file = this.data.files[index];
    if (!file || !file.isImage) return;
    const urls = this.data.files.filter((item) => item.isImage).map((item) => item.path);
    wx.previewImage({ current: file.path, urls });
  },

  removeFile(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (!Number.isFinite(index)) return;
    this.setData({ files: this.data.files.filter((_, itemIndex) => itemIndex !== index) });
  },

  submit() {
    if (!this.data.selectedStudentId) {
      api.toast("请先搜索并选择学生");
      return;
    }
    if (!this.data.originalContent.trim()) {
      api.toast("请填写微信群原话摘要");
      return;
    }
    if (!this.data.publicSummary.trim()) {
      api.toast("请填写对家长可见摘要");
      return;
    }

    this.setData({ loading: true });
    api.requestStaff("/api/miniapp/staff/parent-requests", {
      method: "POST",
      data: {
        studentId: this.data.selectedStudentId,
        type: types[this.data.typeIndex],
        communicationSource: communicationSources[this.data.communicationSourceIndex],
        sourceDetail: this.data.sourceDetail.trim(),
        originalContent: this.data.originalContent.trim(),
        publicSummary: this.data.publicSummary.trim(),
        requiredAction: this.data.requiredAction.trim(),
        latestDeadlineText: this.data.latestDeadlineText.trim(),
        priority: priorities[this.data.priorityIndex],
        owner: this.data.ownerIndex > 0 ? owners[this.data.ownerIndex] : ""
      },
      timeout: 20000
    })
      .then((data) => {
        const req = data.request;
        const paths = this.data.files.map((file) => file.path).filter(Boolean);
        if (!req || !req.id || paths.length === 0) return data;
        return api.uploadFiles(`/api/miniapp/staff/parent-requests/${req.id}/attachments`, paths, { staff: true }).then(() => data);
      })
      .then((data) => {
        wx.showToast({ title: "已创建", icon: "success" });
        setTimeout(() => {
          const id = data.request && data.request.id;
          wx.redirectTo({ url: id ? `/pages/staff-request-detail/staff-request-detail?id=${id}` : "/pages/staff-requests/staff-requests" });
        }, 500);
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  }
});
