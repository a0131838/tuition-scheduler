const api = require("../../utils/api");

Page({
  data: { query: "", summary: { students: 0, unreadOther: 0 }, students: [], selectedStudent: null, timeline: [], loading: false },
  onShow() { if (!this.data.selectedStudent) this.loadStudents(); },
  onPullDownRefresh() {
    const task = this.data.selectedStudent ? this.openStudentById(this.data.selectedStudent.id) : this.loadStudents();
    task.finally(() => wx.stopPullDownRefresh());
  },
  inputQuery(e) { this.setData({ query: e.detail.value || "" }); },
  search() { this.loadStudents(); },
  clearSearch() { this.setData({ query: "" }); this.loadStudents(); },
  loadStudents() {
    this.setData({ loading: true, selectedStudent: null, timeline: [] });
    return api.requestStaff("/api/miniapp/staff/teacher/student-feedbacks?q=" + encodeURIComponent(this.data.query.trim()), { timeout: 30000 })
      .then((data) => this.setData({ summary: data.summary || this.data.summary, students: data.students || [] }))
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },
  openStudent(e) { return this.openStudentById(e.currentTarget.dataset.id); },
  openStudentById(id) {
    if (!id) return Promise.resolve();
    this.setData({ loading: true });
    return api.requestStaff("/api/miniapp/staff/teacher/student-feedbacks?studentId=" + encodeURIComponent(id), { timeout: 30000 })
      .then((data) => {
        const timeline = data.timeline || [];
        this.setData({ selectedStudent: data.selectedStudent || null, timeline, summary: data.summary || this.data.summary });
        const unreadIds = timeline.filter((item) => !item.isMine && !item.isRead).map((item) => item.id);
        if (!unreadIds.length) return null;
        return api.requestStaff("/api/miniapp/staff/teacher/student-feedbacks", {
          method: "POST",
          data: { studentId: id, feedbackIds: unreadIds },
          timeout: 20000
        }).then(() => {
          const marked = timeline.map((item) => Object.assign({}, item, { isRead: true }));
          this.setData({ timeline: marked });
        }).catch(() => null);
      })
      .catch((err) => api.toast(err.message))
      .finally(() => this.setData({ loading: false }));
  },
  backToStudents() { this.loadStudents(); }
});
