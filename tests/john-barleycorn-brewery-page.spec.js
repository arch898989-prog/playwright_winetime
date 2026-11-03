const { test, expect } = require("@playwright/test");
const brewery = require("../test-data/john-barleycorn-brewery-page.json");
const { JohnBarleycornBreweryPage } = require("../pages/JohnBarleycornBreweryPage");
const {
  dismissPopups,
  dismissNewsletterPopup,
  registerNewsletterPopupHandler,
} = require("../utils/popups");
const { getTags, getTestMeta } = require("../utils/matrix");
const { attachElementScreenshot } = require("../utils/test-evidence");

const meta = getTestMeta("TC-029");

test(`${meta.id} ${meta.name}`, {
  tag: getTags("TC-029"),
  annotation: { type: "description", description: meta.description },
}, async ({ page }, testInfo) => {
  const response = await page.goto(brewery.url, { waitUntil: "domcontentloaded" });
  expect(response.status()).toBe(200);
  await dismissPopups(page);
  registerNewsletterPopupHandler(page);
  await dismissNewsletterPopup(page);

  const breweryPage = new JohnBarleycornBreweryPage(page, brewery);
  await expect(page).toHaveURL(`https://winetime.com.ua${brewery.url}`);

  await test.step("Verify the brewery page identity and introduction", async () => {
    await expect(breweryPage.heading).toBeVisible();
    await expect(breweryPage.introduction).toBeVisible();
    await attachElementScreenshot(testInfo, breweryPage.heading, "Brewery page heading");
    await attachElementScreenshot(testInfo, breweryPage.introduction, "Brewery introduction");
  });

  await test.step("Verify the brewery product catalog", async () => {
    expect(await breweryPage.productCards.count()).toBeGreaterThan(0);
    await expect(breweryPage.firstProductCard).toContainText(brewery.productBrand);
    await attachElementScreenshot(
      testInfo,
      breweryPage.firstProductCard,
      "First brewery product card",
    );
  });
});
