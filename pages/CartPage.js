const product = require("../test-data/product.json");

class CartPage {
  constructor(page) {
    this.page = page;
  }

  get trigger() {
    return this.page.locator("#header--cart-button");
  }

  get dialog() {
    return this.page.locator("dialog.cart-dropdown");
  }

  async open() {
    if (!(await this.dialog.isVisible())) {
      await this.trigger.click();
    }
    await this.dialog.waitFor({ state: "visible" });
  }

  get productName() {
    return this.dialog.locator(`a[href$="${product.url}"]`)
      .filter({ hasText: product.brandName.split(" ")[0] });
  }

  get quantityInput() {
    return this.dialog.locator(".cart--good--counter input");
  }

  get increaseButton() {
    return this.dialog.locator(".cart--good--counter button").last();
  }

  get decreaseButton() {
    return this.dialog.locator(".cart--good--counter button").first();
  }

  get removeButton() {
    return this.dialog.locator(".cart--good--action .j-btn.remove");
  }

  get total() {
    return this.dialog.getByText(/разом|до сплати|сума/i).last();
  }
}

module.exports = { CartPage };
