Component({
  properties: {
    active: { type: String, value: "home" }
  },
  methods: {
    go(event) {
      const page = event.currentTarget.dataset.page;
      const routes = {
        home: "/pages/guide-home/guide-home",
        schools: "/pages/guide-schools/guide-schools",
        assessment: "/pages/guide-assessment/guide-assessment",
        cases: "/pages/guide-cases/guide-cases",
        plan: "/pages/guide-plan/guide-plan"
      };
      if (page === this.data.active || !routes[page]) return;
      wx.redirectTo({ url: routes[page] });
    }
  }
});
