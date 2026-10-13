const { test, expect } = require("@playwright/test");
const contacts = require("../test-data/contacts-page.json");
const product = require("../test-data/product.json");
const { ContactsPage } = require("../pages/ContactsPage");
const {
  dismissPopups,
  dismissNewsletterPopup,
  registerNewsletterPopupHandler,
} = require("../utils/popups");
const { getTags, getTestMeta } = require("../utils/matrix");
const { attachElementScreenshot } = require("../utils/test-evidence");

const meta = getTestMeta("TC-027");

test(`${meta.id} ${meta.name}`, {
  tag: getTags("TC-027"),
  annotation: { type: "description", description: meta.description },
}, async ({ page }, testInfo) => {
  const response = await page.goto(contacts.url, { waitUntil: "domcontentloaded" });
  expect(response.status()).toBe(200);
  await dismissPopups(page);
  registerNewsletterPopupHandler(page);
  await dismissNewsletterPopup(page);

  const contactsPage = new ContactsPage(page);
  await expect(page).toHaveURL(`https://winetime.com.ua${contacts.url}`);
  await expect(page).toHaveTitle(contacts.title);

  await test.step("Verify consultation phone contacts", async () => {
    await expect(contactsPage.heading).toBeVisible();
    await attachElementScreenshot(testInfo, contactsPage.heading, "Contacts page heading");

    for (const number of contacts.consultationPhones) {
      const phone = contactsPage.consultationPhone(number);
      await expect(phone).toBeVisible();
      await expect(phone).toHaveAttribute("href", `tel:${number}`);
    }
    await attachElementScreenshot(
      testInfo,
      contactsPage.consultationPhones,
      "Consultation phone numbers",
    );
  });

  await test.step("Verify business and product-quality email contacts", async () => {
    for (const address of contacts.businessEmails) {
      const email = contactsPage.businessEmail(address);
      await expect(email).toBeVisible();
      await expect(email).toHaveAttribute("href", `mailto:${address}`);
    }
    await attachElementScreenshot(
      testInfo,
      contactsPage.businessContacts,
      "Business and quality email contacts",
    );
  });

  await test.step("Verify contact-center working hours and store locations", async () => {
    await expect(contactsPage.workingHours).toBeVisible();
    for (const schedule of product.header.workingHours) {
      await expect(contactsPage.workingHours).toContainText(schedule);
    }
    await attachElementScreenshot(
      testInfo,
      contactsPage.workingHours,
      "Contact-center working hours",
    );

    const storeCount = await contactsPage.stores.count();
    expect(storeCount).toBeGreaterThan(0);
    const firstStore = contactsPage.stores.first();
    await expect(firstStore).toBeVisible();
    await expect(firstStore).toContainText("WINETIME");
    await expect(firstStore).toContainText(contacts.storeHoursLabel);
    const storePhone = firstStore.locator('a[href^="tel:"]');
    await expect(storePhone).toBeVisible();
    await expect(storePhone).toHaveAttribute("href", /^tel:/);
    await attachElementScreenshot(testInfo, firstStore, "First WINETIME store and phone");
  });
});
