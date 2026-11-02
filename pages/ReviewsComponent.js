const product = require("../test-data/product.json");

class ReviewsComponent {
  constructor(page) {
    this.page = page;
  }

  get tab() {
    return this.page.locator(".product-page--tab:visible")
      .filter({ hasText: product.seo.reviewSection }).first();
  }

  get openButton() {
    return this.page.getByRole("button", { name: product.reviews.open });
  }

  get form() {
    return this.page.locator("form").filter({ has: this.submitButton }).first();
  }

  get submitButton() {
    return this.page.getByRole("button", {
      name: new RegExp(product.reviews.submitButtonPattern, "i"),
    });
  }

  get loginTitle() {
    return this.page.getByText(product.reviews.loginTitle, { exact: true }).last();
  }

  get validationError() {
    return this.form.getByText(new RegExp(product.reviews.requiredError), { exact: false }).first();
  }
}

module.exports = { ReviewsComponent };
