class FooterComponent {
  constructor(page) {
    this.page = page;
  }

  get root() {
    return this.page.locator("footer");
  }

  get workingHours() {
    return this.root.locator(".j-mt-30.j-h-center.j-h-left-bg");
  }

  link(text) {
    return this.root.getByRole("link", { name: text, exact: true });
  }
}

module.exports = { FooterComponent };
