const { test, expect } = require("@playwright/test");
const product = require("../test-data/camden-park-product.json");
const { ProductPage } = require("../pages/ProductPage");
const { dismissPopups } = require("../utils/popups");
const { getTags, getTestMeta } = require("../utils/matrix");
const { attachElementScreenshot } = require("../utils/test-evidence");

test.describe("Camden Park product page", () => {
  const meta = getTestMeta("TC-001");
  test(`${meta.id} ${meta.name}`, {
    tag: getTags("TC-001"),
    annotation: { type: "description", description: meta.description },
  }, async ({ page }, testInfo) => {
    const response = await page.goto(product.url, { waitUntil: "domcontentloaded" });
    expect(response.status()).toBe(200);
    await dismissPopups(page);

    const productPage = new ProductPage(page, product);
    const heading = productPage.heading;
    const productSection = productPage.productDetails;
    const mainImage = productPage.mainImage;
    const characteristics = productPage.characteristics;
    const price = testInfo.project.name === "mobile"
      ? productPage.mobilePrice
      : productPage.price;

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
      await attachElementScreenshot(testInfo, mainImage, "Camden Park product image");
      await attachElementScreenshot(testInfo, productSection, "Camden Park product details");
    });
  });
});
