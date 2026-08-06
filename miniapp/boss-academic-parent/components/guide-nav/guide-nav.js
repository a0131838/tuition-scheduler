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
        assessment: "/pages/guide-assessments/guide-assessments",
        account: "/pages/guide-account/guide-account"
      };
      if (page === this.data.active || !routes[page]) return;
      wx.redirectTo({ url: routes[page] });
    }
  }
});
