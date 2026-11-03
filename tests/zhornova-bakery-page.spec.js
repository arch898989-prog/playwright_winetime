const { test, expect } = require("@playwright/test");
const bakery = require("../test-data/zhornova-bakery-page.json");
const { ZhornovaBakeryPage } = require("../pages/ZhornovaBakeryPage");
const {
  dismissPopups,
  dismissNewsletterPopup,
  registerNewsletterPopupHandler,
} = require("../utils/popups");
const { getTags, getTestMeta } = require("../utils/matrix");
const { attachElementScreenshot } = require("../utils/test-evidence");

const meta = getTestMeta("TC-028");

test(`${meta.id} ${meta.name}`, {
  tag: getTags("TC-028"),
  annotation: { type: "description", description: meta.description },
}, async ({ page }, testInfo) => {
  const response = await page.goto(bakery.url, { waitUntil: "domcontentloaded" });
  expect(response.status()).toBe(200);
  await dismissPopups(page);
  registerNewsletterPopupHandler(page);
  await dismissNewsletterPopup(page);

  const bakeryPage = new ZhornovaBakeryPage(page, bakery);
  await expect(page).toHaveURL(`https://winetime.com.ua${bakery.url}`);

  await test.step("Verify the bakery page identity and introduction", async () => {
    await expect(bakeryPage.heading).toBeVisible();
    await expect(bakeryPage.introduction).toBeVisible();
    await attachElementScreenshot(testInfo, bakeryPage.heading, "Bakery page heading");
    await attachElementScreenshot(testInfo, bakeryPage.introduction, "Bakery introduction");
  });

  await test.step("Verify the bakery product catalog", async () => {
    expect(await bakeryPage.productCards.count()).toBeGreaterThan(0);
    await expect(bakeryPage.firstProductCard).toContainText(bakery.productBrand);
    await attachElementScreenshot(
      testInfo,
      bakeryPage.firstProductCard,
      "First bakery product card",
    );
  });
});
