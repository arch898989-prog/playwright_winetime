const product = require("../test-data/product.json");

class ProductPage {
  constructor(page, productData = product) {
    this.page = page;
    this.product = productData;
  }

  get card() {
    return this.page.locator("#product-page .product-page--right-column");
  }

  get productSection() {
    return this.page.locator("#product-page section").filter({
      has: this.page.getByRole("heading", { level: 1, name: this.product.name }),
    }).first();
  }

  get productDetails() {
    return this.page.locator("#product-page").filter({ has: this.heading });
  }

  get heading() {
    return this.page.getByRole("heading", { level: 1 });
  }

  get mainImage() {
    return this.page.locator("#product-page .product--gallery--slide img").first();
  }

  get buyButton() {
    return this.productSection.getByRole("button", {
      name: this.product.buyButton,
      exact: true,
    }).first();
  }

  get price() {
    return this.page.locator("#product-page .j-weight-600-xs:visible")
      .filter({ hasText: this.product.currency }).first();
  }

  get mobilePrice() {
    return this.page.locator(".j-pv-10-xs.j-mt-20 .j-weight-600-xs");
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
    const price = (await this.card.isVisible()) ? this.price : this.mobilePrice;
    const text = await price.innerText();
    const amount = Number(text.replace(/[^\d,.-]/g, "").replace(",", "."));
    return { text, amount };
  }
}

module.exports = { ProductPage };
