const { test, expect } = require("@playwright/test");
const product = require("../test-data/product.json");
const { ProductPage } = require("../pages/ProductPage");
const { HeaderComponent } = require("../pages/HeaderComponent");
const { CartComponent } = require("../pages/CartComponent");
const { dismissPopups } = require("../utils/popups");
const { getTags, getTestMeta } = require("../utils/matrix");
const { attachElementScreenshot } = require("../utils/test-evidence");

test.describe("Cart", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(product.url, { waitUntil: "domcontentloaded" });
    await dismissPopups(page);
  });

  const meta = getTestMeta("TC-002");
  test(`${meta.id} ${meta.name}`, {
    tag: getTags("TC-002"),
    annotation: { type: "description", description: meta.description },
  }, async ({ page }, testInfo) => {
    const header = new HeaderComponent(page);
    const productPage = new ProductPage(page);
    const cart = new CartComponent(page);
    const price = (await productPage.getVisiblePrice()).amount;

    await test.step("Add the product and change cart quantity to two", async () => {
      await productPage.buyButton.click();
      await expect(header.cartCounter).toHaveText(product.quantity.singleItem);
      await cart.open();
      const quantity = cart.quantityInput;
      await expect(cart.productName).toBeVisible();
      await expect(cart.productName).toContainText(product.name);
      expect(new URL(await cart.productName.getAttribute("href"), page.url()).pathname)
        .toBe(product.url);
      await expect(quantity).toHaveValue(product.quantity.singleItem);
      await cart.increaseButton.click();
      await expect(quantity).toHaveValue(product.quantity.increased);
      await expect(page.getByText(new RegExp(`${price * 2}\\s*${product.currency}`)).last()).toBeVisible();
      await attachElementScreenshot(testInfo, cart.dialog, "Cart with quantity two and updated total");
    });

    await test.step("Remove the item and verify the empty cart", async () => {
      await cart.removeButton.click();
      await expect(header.cartCounter).toHaveText(product.quantity.emptyCart);
      await expect(cart.productName).toBeHidden();
      await attachElementScreenshot(testInfo, header.cartLink, "Empty cart counter");
    });
  });
});
