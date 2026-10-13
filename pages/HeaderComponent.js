const product = require("../test-data/product.json");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

  get phoneDropdown() {
    return this.root.locator('.j-hoverdown:has(a[href="tel:0 800 330 370"])');
  }

  phoneContact(number) {
    return this.phoneDropdown.getByRole("link", {
      name: number,
      exact: true,
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

  cityLabel(city) {
    return this.root.locator(".dashed-link").filter({
      hasText: new RegExp(`^${escapeRegExp(city)}$`),
    });
  }

  get citySelectionDialog() {
    return this.page.locator("dialog.the-city-select");
  }

  get citySearch() {
    return this.citySelectionDialog.locator('input[name="city-search-input"]');
  }

  cityOption(city) {
    return this.citySelectionDialog.locator("li").filter({
      hasText: new RegExp(`^\\s*${escapeRegExp(city)}\\s*$`),
    });
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

  mobilePhoneContact(number) {
    return this.mobileMenu.getByRole("link", {
      name: number,
      exact: true,
    });
  }
}

module.exports = { HeaderComponent };
