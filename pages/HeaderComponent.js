const product = require("../test-data/product.json");

class HeaderComponent {
  constructor(page) {
    this.page = page;
  }

  get root() {
    return this.page.locator("header");
  }

  get logo() {
    return this.root.locator("a.header--logo").first();
  }

  get allProducts() {
    return this.root.getByRole("button", {
      name: product.header.allProducts,
    });
  }

  get russianSwitch() {
    return this.root.locator(".lang-select--dropdown a.js-change-lang:visible")
      .filter({ hasText: product.language.russian }).first();
  }

  get ukrainianSwitch() {
    return this.root.locator(".lang-select--dropdown a.js-change-lang:visible")
      .filter({ hasText: product.language.ukrainian }).first();
  }

  get languageMenu() {
    return this.root.locator(".lang-select--title:visible").first();
  }

  get phone() {
    return this.root.getByRole("link", {
      name: product.header.phone,
    });
  }

  get login() {
    return this.root.getByRole("link", { name: product.header.login });
  }

  get cartCounter() {
    return this.page.locator("#header--cart-button .header--value");
  }

  get cartLink() {
    return this.page.locator("#header--cart-button");
  }

  get mobileMenuButton() {
    return this.root.locator(".main-menu--button:visible");
  }

  get mobileSearchButton() {
    return this.page.locator("#header-search-button");
  }

  get mobileMenu() {
    return this.page.locator(".the-main-menu--content");
  }
}

module.exports = { HeaderComponent };
