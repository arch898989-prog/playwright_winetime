const { test, expect } = require("@playwright/test");
const product = require("../test-data/product.json");
const { ProductPage } = require("../pages/ProductPage");
const { HeaderComponent } = require("../pages/HeaderComponent");
const { CartPage } = require("../pages/CartPage");
const { dismissPopups } = require("../utils/popups");

test.describe("Cart", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(product.url, { waitUntil: "domcontentloaded" });
    await dismissPopups(page);
  });

  test("quantity changes update totals and removing the item empties the cart", async ({ page }) => {
    const header = new HeaderComponent(page);
    const productPage = new ProductPage(page);
    const cartPage = new CartPage(page);
    const price = (await productPage.getVisiblePrice()).amount;

    await test.step("Add the product and change cart quantity to two", async () => {
      await productPage.buyButton.click();
      await expect(header.cartCounter).toHaveText(product.quantity.singleItem);
      await cartPage.open();
      const quantity = cartPage.quantityInput;
      await expect(cartPage.productName).toBeVisible();
      await expect(cartPage.productName).toContainText(product.name);
      expect(new URL(await cartPage.productName.getAttribute("href"), page.url()).pathname)
        .toBe(product.url);
      await expect(quantity).toHaveValue(product.quantity.singleItem);
      await cartPage.increaseButton.click();
      await expect(quantity).toHaveValue(product.quantity.increased);
      await expect(page.getByText(new RegExp(`${price * 2}\\s*${product.currency}`)).last()).toBeVisible();
    });

    await test.step("Remove the item and verify the empty cart", async () => {
      await cartPage.removeButton.click();
      await expect(header.cartCounter).toHaveText(product.quantity.emptyCart);
      await expect(cartPage.productName).toBeHidden();
    });
  });
});
