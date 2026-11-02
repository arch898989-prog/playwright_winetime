const product = require("../test-data/product.json");

class CityConfirmationComponent {
  constructor(page) {
    this.page = page;
  }

  get question() {
    return this.page.getByText(product.cityPopup.question, { exact: false })
      .filter({ visible: true }).first();
  }

  get confirmButton() {
    return this.page.locator("button.js-selected-city-confirm:visible").last();
  }

  get changeLink() {
    return this.page.getByText(product.cityPopup.change, { exact: true })
      .filter({ visible: true }).first();
  }
}

module.exports = { CityConfirmationComponent };
