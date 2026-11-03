class JohnBarleycornBreweryPage {
  constructor(page, pageData) {
    this.page = page;
    this.pageData = pageData;
  }

  get heading() {
    return this.page.getByRole("heading", {
      level: 1,
      name: this.pageData.name,
      exact: true,
    });
  }

  get introduction() {
    return this.page.getByText(this.pageData.introduction, { exact: false });
  }

  get productCards() {
    return this.page.locator("a.product-micro:visible");
  }

  get firstProductCard() {
    return this.productCards.first();
  }
}

module.exports = { JohnBarleycornBreweryPage };
