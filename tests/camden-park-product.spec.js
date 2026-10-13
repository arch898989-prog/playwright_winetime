const { test, expect } = require("@playwright/test");
const product = require("../test-data/camden-park-product.json");
const { dismissPopups } = require("../utils/popups");

test.describe("Camden Park product page", () => {
  test("product details are visible", async ({ page }, testInfo) => {
    const response = await page.goto(product.url, { waitUntil: "domcontentloaded" });
    expect(response.status()).toBe(200);
    await dismissPopups(page);

    const heading = page.getByRole("heading", { level: 1, name: product.name });
    const productSection = page.locator("#product-page .product-page--right-column")
      .filter({ has: heading });
    const mainImage = page.locator("#product-page .product--gallery--slide img").first();
    const characteristics = page.locator("#product-page .properties-table");
    const price = testInfo.project.name === "mobile"
      ? page.locator(".j-pv-10-xs.j-mt-20 .j-weight-600-xs")
      : productSection.locator(".j-weight-600-xs").first();

    await test.step("Verify product identity, image, price, and characteristics", async () => {
      await expect(page).toHaveURL(`https://winetime.com.ua${product.url}`);
      await expect(heading).toBeVisible();
      await expect(mainImage).toBeVisible();
      await expect(mainImage).toHaveAttribute("alt", product.name);
      await expect.poll(() => mainImage.evaluate(image =>
        image.complete && image.naturalWidth > 0,
      )).toBe(true);

      const priceText = await price.innerText();
      expect(priceText).toMatch(new RegExp(product.pricePattern));
      expect(Number(priceText.replace(/[^\d,.-]/g, "").replace(",", "."))).toBeGreaterThan(0);
      await expect(characteristics).toBeVisible();
      for (const characteristic of product.characteristics) {
        await expect(characteristics).toContainText(characteristic);
      }
      await expect(characteristics).toContainText(product.volume);
      if (testInfo.project.name === "mobile") {
        await expect(page.getByText(product.available, { exact: true })
          .filter({ visible: true }).first()).toBeVisible();
      } else {
        await expect(productSection).toContainText(product.available);
      }
    });
  });
});
