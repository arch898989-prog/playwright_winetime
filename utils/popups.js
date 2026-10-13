const { expect } = require("@playwright/test");
const product = require("../test-data/product.json");

async function dismissAgePopup(page) {
  const agePopup = page.locator(".popup").filter({
    hasText: product.agePopup.question,
  }).first();

  if (await agePopup.isVisible()) {
    await agePopup.getByRole("button", {
      name: product.agePopup.confirm,
      exact: true,
    }).click();
    await expect(agePopup).toBeHidden();
  }
}

async function dismissPopups(page) {
  await dismissAgePopup(page);
  const cityQuestion = page.getByText(product.cityPopup.question, {
    exact: false,
  }).filter({ visible: true }).first();
  if (await cityQuestion.isVisible()) {
    await page.locator("button.js-selected-city-confirm:visible").last().click();
    await expect(cityQuestion).toBeHidden();
  }

  const cookieDialog = page.getByRole("dialog").filter({
    hasText: /cookie|cookies|файли cookie|кукі/i,
  }).first();
  if (await cookieDialog.isVisible()) {
    const consent = cookieDialog.getByRole("button", {
      name: /прийняти|погоджуюсь|зрозуміло|accept|agree/i,
    }).first();
    if (await consent.isVisible()) {
      await consent.click();
      await expect(cookieDialog).toBeHidden();
    }
  }
}

module.exports = { dismissAgePopup, dismissPopups };
