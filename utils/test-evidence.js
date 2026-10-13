const { expect } = require("@playwright/test");

async function attachElementScreenshot(testInfo, locator, name) {
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeInViewport();
  const body = await locator.screenshot({ animations: "disabled" });
  await testInfo.attach(name, { body, contentType: "image/png" });
}

module.exports = { attachElementScreenshot };
