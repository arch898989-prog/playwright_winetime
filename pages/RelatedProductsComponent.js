class RelatedProductsComponent {
  constructor(page) {
    this.page = page;
  }

  get cards() {
    return this.page.locator("#product-page a.product-micro:visible")
      .filter({ has: this.page.locator("img:visible") });
  }

  get firstCard() {
    return this.cards.first();
  }
}

module.exports = { RelatedProductsComponent };
