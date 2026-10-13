const { test, expect } = require("@playwright/test");
const product = require("../test-data/product.json");
const { HeaderComponent } = require("../pages/HeaderComponent");
const {
  dismissPopups,
  registerNewsletterPopupHandler,
} = require("../utils/popups");
const { getTags, getTestMeta } = require("../utils/matrix");
const { attachElementScreenshot } = require("../utils/test-evidence");

const meta = getTestMeta("TC-025");

test(`${meta.id} ${meta.name}`, {
  tag: getTags("TC-025"),
  annotation: { type: "description", description: meta.description },
}, async ({ page }, testInfo) => {
  await page.goto(product.url, { waitUntil: "domcontentloaded" });
  await dismissPopups(page);
  registerNewsletterPopupHandler(page);

  const header = new HeaderComponent(page);

  if (testInfo.project.name === "mobile" || testInfo.project.name === "tablet") {
    await test.step("Open responsive navigation and verify its phone contacts", async () => {
      await expect(header.mobileMenuButton).toBeVisible();
      await header.mobileMenuButton.click();
      await expect(header.mobileMenu).toBeVisible();

      const phoneLinks = [];
      for (const number of product.header.mobileMenuPhones) {
        const phoneLink = header.mobilePhoneContact(number);
        await expect(phoneLink).toBeVisible();
        await expect(phoneLink).toHaveAttribute("href", `tel:${number}`);
        phoneLinks.push(phoneLink);
      }

      await phoneLinks[0].scrollIntoViewIfNeeded();
      for (const phoneLink of phoneLinks) {
        await expect(phoneLink).toBeInViewport();
        await attachElementScreenshot(testInfo, phoneLink, `Mobile phone ${await phoneLink.innerText()}`);
      }
    });
  } else {
    await test.step("Verify the toll-free phone is visible and uses a telephone link", async () => {
      await expect(header.phone).toBeVisible();
      await expect(header.phone).toHaveAttribute("href", `tel:${product.header.phone}`);
      await attachElementScreenshot(testInfo, header.phone, "Header toll-free phone");
    });

    await test.step("Reveal the phone menu and verify every contact number", async () => {
      await header.phone.hover();
      const dropdown = header.phoneDropdown.locator("dialog.hoverdown--dialog");
      await expect(dropdown).toBeVisible();
      await expect(dropdown).toContainText(product.header.phoneDropdownLabel);

      for (const number of product.header.additionalPhones) {
        const phoneLink = header.phoneContact(number);
        await expect(phoneLink).toBeVisible();
        await expect(phoneLink).toHaveAttribute("href", `tel:${number}`);
        await attachElementScreenshot(testInfo, phoneLink, `Header phone ${number}`);
      }
    });
  }
});
