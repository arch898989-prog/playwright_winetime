const { test, expect } = require("@playwright/test");
const product = require("../test-data/product.json");
const { FooterComponent } = require("../pages/FooterComponent");
const {
  dismissPopups,
  registerNewsletterPopupHandler,
} = require("../utils/popups");
const { getTags, getTestMeta } = require("../utils/matrix");
const { attachElementScreenshot } = require("../utils/test-evidence");

const meta = getTestMeta("TC-026");

test(`${meta.id} ${meta.name}`, {
  tag: getTags("TC-026"),
  annotation: { type: "description", description: meta.description },
}, async ({ page }, testInfo) => {
  await page.goto(product.url, { waitUntil: "domcontentloaded" });
  await dismissPopups(page);
  registerNewsletterPopupHandler(page);

  const footer = new FooterComponent(page);
  const workingHours = footer.workingHours;

  await test.step("Verify weekday and weekend hours are displayed in the footer", async () => {
    await expect(workingHours).toBeVisible();
    for (const schedule of product.header.workingHours) {
      await expect(workingHours).toContainText(schedule);
    }

    await attachElementScreenshot(testInfo, workingHours, "WINETIME working hours");
  });
});
