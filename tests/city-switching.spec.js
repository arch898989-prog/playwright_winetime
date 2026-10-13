const { test, expect } = require("@playwright/test");
const product = require("../test-data/product.json");
const cities = require("../test-data/cities.json");
const { HeaderComponent } = require("../pages/HeaderComponent");
const {
  dismissNewsletterPopup,
  dismissPopups,
  registerNewsletterPopupHandler,
} = require("../utils/popups");
const { getTags, getTestMeta } = require("../utils/matrix");
const { attachElementScreenshot } = require("../utils/test-evidence");

async function openCitySelection(header, city) {
  if (await header.citySelectionDialog.isVisible()) {
    return;
  }

  await dismissNewsletterPopup(header.page);
  await header.cityLabel(city).click();
  try {
    await expect(header.citySelectionDialog).toBeVisible({ timeout: 1500 });
  } catch (error) {
    if (await header.citySelectionDialog.isVisible()) {
      throw error;
    }
    await header.cityLabel(city).click();
    await expect(header.citySelectionDialog).toBeVisible();
  }
}

test.describe("City selection", () => {
  const meta = getTestMeta("TC-003");
  test(`${meta.id} ${meta.name}`, {
    tag: getTags("TC-003"),
    annotation: { type: "description", description: meta.description },
  }, async ({ page }, testInfo) => {
    test.setTimeout(120_000);

    test.skip(
      testInfo.project.name === "mobile",
      "The city selector is not available in the mobile header",
    );

    await page.goto(product.url, { waitUntil: "domcontentloaded" });
    await dismissPopups(page);
    registerNewsletterPopupHandler(page);

    const header = new HeaderComponent(page);
    let selectedCity = cities.defaultCity;
    let availableCities;

    await test.step("Verify Kyiv is selected by default and read all available cities", async () => {
      await expect(header.cityLabel(cities.defaultCity)).toHaveText(cities.defaultCity);
      await openCitySelection(header, cities.defaultCity);
      await expect(
        header.citySelectionDialog.getByText(cities.selectionDialogTitle, { exact: true }),
      ).toBeVisible();
      await expect(header.cityOption(cities.defaultCity)).toHaveClass(/selected/);

      availableCities = (await header.citySelectionDialog.locator("li").allTextContents())
        .map(city => city.trim())
        .filter(Boolean);
      expect(availableCities.length).toBeGreaterThan(0);
      expect(availableCities).toContain(cities.defaultCity);
      expect(new Set(availableCities).size).toBe(availableCities.length);
      await attachElementScreenshot(testInfo, header.citySelectionDialog, "City selection dialog");
      await attachElementScreenshot(testInfo, header.cityLabel(cities.defaultCity), "Default city");
    });

    for (const city of availableCities) {
      await test.step(`Select ${city}`, async () => {
        await test.step("Close the blocking newsletter popup if it appears", async () => {
          await dismissNewsletterPopup(page);
        });
        await openCitySelection(header, selectedCity);
        await expect(header.cityOption(selectedCity)).toHaveClass(/selected/);
        await header.citySearch.fill(city);
        await expect(header.cityOption(city)).toBeVisible();
        await test.step("Check and close the blocking popup before choosing a city", async () => {
          await dismissNewsletterPopup(page);
        });
        await header.cityOption(city).click();
        await expect(header.citySelectionDialog).toBeHidden();
        await expect(header.cityLabel(city)).toHaveText(city);
        await attachElementScreenshot(testInfo, header.cityLabel(city), `Selected city ${city}`);
        selectedCity = city;
      });
    }

    await test.step("Restore Kyiv after checking every city", async () => {
      if (selectedCity !== cities.defaultCity) {
        await openCitySelection(header, selectedCity);
        await header.cityOption(cities.defaultCity).click();
        await expect(header.citySelectionDialog).toBeHidden();
        await expect(header.cityLabel(cities.defaultCity)).toHaveText(cities.defaultCity);
        await attachElementScreenshot(testInfo, header.cityLabel(cities.defaultCity), "Restored default city");
      }
    });
  });
});
