const { test, expect } = require("@playwright/test");
const farm = require("../test-data/trostynka-farm-page.json");
const { TrostynkaFarmPage } = require("../pages/TrostynkaFarmPage");
const {
  dismissPopups,
  dismissNewsletterPopup,
  registerNewsletterPopupHandler,
} = require("../utils/popups");
const { getTags, getTestMeta } = require("../utils/matrix");
const { attachElementScreenshot } = require("../utils/test-evidence");

const meta = getTestMeta("TC-030");

test(`${meta.id} ${meta.name}`, {
  tag: getTags("TC-030"),
  annotation: { type: "description", description: meta.description },
}, async ({ page }, testInfo) => {
  const response = await page.goto(farm.url, { waitUntil: "domcontentloaded" });
  expect(response.status()).toBe(200);
  await dismissPopups(page);
  registerNewsletterPopupHandler(page);
  await dismissNewsletterPopup(page);

  const farmPage = new TrostynkaFarmPage(page, farm);
  await expect(page).toHaveURL(`https://winetime.com.ua${farm.url}`);

  await test.step("Verify the farm page identity and introduction", async () => {
    await expect(farmPage.heading).toBeVisible();
    await expect(farmPage.introduction).toBeVisible();
    await attachElementScreenshot(testInfo, farmPage.heading, "Farm page heading");
    await attachElementScreenshot(testInfo, farmPage.introduction, "Farm introduction");
  });

  await test.step("Verify the farm product catalog", async () => {
    expect(await farmPage.productCards.count()).toBeGreaterThan(0);
    await expect(farmPage.firstProductCard).toContainText(farm.productBrand);
    await attachElementScreenshot(
      testInfo,
      farmPage.firstProductCard,
      "First farm product card",
    );
  });
});
