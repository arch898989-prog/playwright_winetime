class FooterComponent {
  constructor(page) {
    this.page = page;
  }

  get root() {
    return this.page.locator("footer");
  }

  link(text) {
    return this.root.getByRole("link", { name: text, exact: true });
  }
}

module.exports = { FooterComponent };
