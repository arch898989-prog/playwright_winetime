const product = require("../test-data/product.json");

class ProductPage {
  constructor(page) {
    this.page = page;
  }

  get card() {
    return this.page.locator("#product-page .product-page--right-column");
  }

  get productSection() {
    return this.page.locator("#product-page section").filter({
      has: this.page.getByRole("heading", { level: 1, name: product.name }),
    }).first();
  }

  get heading() {
    return this.page.getByRole("heading", { level: 1 });
  }

  get mainImage() {
    return this.page.locator("#product-page .product--gallery--slide img").first();
  }

  get buyButton() {
    return this.productSection.getByRole("button", {
      name: product.buyButton,
      exact: true,
    }).first();
  }

  get price() {
    return this.productSection.locator(".j-weight-600-xs")
      .filter({ hasText: product.currency }).first();
  }

  get characteristics() {
    return this.page.locator("#product-page .properties-table");
  }

  get quantity() {
    return this.productSection.locator(".cart--good--counter input");
  }

  get decreaseQuantity() {
    return this.productSection.locator(".cart--good--counter button").first();
  }

  get increaseQuantity() {
    return this.productSection.locator(".cart--good--counter button").last();
  }

  get breadcrumbs() {
    return this.page.locator("#content-wrapper").locator("nav").first();
  }

  async getVisiblePrice() {
    const text = await this.price.innerText();
    const amount = Number(text.replace(/[^\d,.-]/g, "").replace(",", "."));
    return { text, amount };
  }
}

module.exports = { ProductPage };
