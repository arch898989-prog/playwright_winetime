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

async function dismissNewsletterPopup(page) {
  const newsletterPopup = page.locator(
    '.cl-dialog[aria-label="Popup"], .cl-floating-box[aria-label="Popup"]',
  ).filter({
    hasText: product.newsletterPopupTitle,
  });

  if (await newsletterPopup.isVisible()) {
    await closeNewsletterPopup(newsletterPopup);
  }
}

async function closeNewsletterPopup(newsletterPopup) {
  const closeButton = newsletterPopup.locator(
    ".cl-dialog-close-icon, .cl-floating-box-close-icon",
  );
  await expect(closeButton).toBeVisible();
  await closeButton.evaluate(element => element.click());
  await expect(newsletterPopup).toBeHidden();
}

function registerNewsletterPopupHandler(page) {
  const newsletterPopup = page.locator(
    '.cl-dialog[aria-label="Popup"], .cl-floating-box[aria-label="Popup"]',
  ).filter({
    hasText: product.newsletterPopupTitle,
  });

  page.addLocatorHandler(newsletterPopup, async popup => {
    await closeNewsletterPopup(popup);
  });
}

module.exports = {
  dismissAgePopup,
  dismissNewsletterPopup,
  dismissPopups,
  registerNewsletterPopupHandler,
};
