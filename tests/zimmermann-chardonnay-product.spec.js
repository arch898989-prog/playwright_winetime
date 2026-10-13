const { test, expect } = require("@playwright/test");
const product = require("../test-data/product.json");
const { ProductPage } = require("../pages/ProductPage");
const { CartPage } = require("../pages/CartPage");
const { HeaderComponent } = require("../pages/HeaderComponent");
const { FooterComponent } = require("../pages/FooterComponent");
const { dismissAgePopup, dismissPopups } = require("../utils/popups");
const { getTags, getTestMeta } = require("../utils/matrix");
const { attachElementScreenshot } = require("../utils/test-evidence");

async function loadProduct(page) {
  const response = await page.goto(product.url, { waitUntil: "domcontentloaded" });
  return response;
}

test.describe("Product page", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__lcp = null;
      if (window.PerformanceObserver?.supportedEntryTypes.includes("largest-contentful-paint")) {
        new PerformanceObserver(entries => {
          const lastEntry = entries.getEntries().at(-1);
          if (lastEntry) window.__lcp = lastEntry.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
      }
    });
    page.consoleErrors = [];
    page.firstPartyFailures = [];
    page.on("pageerror", error => page.consoleErrors.push(error.message));
    page.on("console", message => {
      const browserCookieWarning = /Cookie .+ has been rejected for invalid domain/i
        .test(message.text());
      if (message.type() === "error" &&
          !/^Failed to load resource:/i.test(message.text()) &&
          !browserCookieWarning) {
        page.consoleErrors.push(message.text());
      }
    });
    page.on("response", response => {
      const url = new URL(response.url());
      if (url.origin === "https://winetime.com.ua" && response.status() >= 400) {
        page.firstPartyFailures.push(`${response.status()} ${response.url()}`);
      }
    });
    const response = await loadProduct(page);
    page.navigationStatus = response.status();
    await dismissPopups(page);
  });

  const pageLoadMeta = getTestMeta("TC-004");
  test(`${pageLoadMeta.id} ${pageLoadMeta.name}`, {
    tag: [...getTags("TC-004"), "@smoke"],
    annotation: { type: "description", description: pageLoadMeta.description },
  }, async ({ page }, testInfo) => {
    const productPage = new ProductPage(page);
    await test.step("Verify successful navigation and SEO metadata", async () => {
      expect(page.navigationStatus).toBe(200);
      expect(page.url()).toBe(`https://winetime.com.ua${product.url}`);
      const title = await page.title();
      expect(title).toContain(product.seo.titleIncludes[0]);
      expect(title).toContain(product.seo.titleIncludes[1]);
      await expect(productPage.heading).toHaveText(product.name);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        `https://winetime.com.ua${product.url}`,
      );
      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute("content");
      expect(ogTitle).toContain(product.name);
      await attachElementScreenshot(testInfo, productPage.heading, "Product page heading");
    });
  });

  const headerMeta = getTestMeta("TC-005");
  test(`${headerMeta.id} ${headerMeta.name}`, {
    tag: getTags("TC-005"),
    annotation: { type: "description", description: headerMeta.description },
  }, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Desktop header controls are replaced by the mobile menu");
    const header = new HeaderComponent(page);
    await test.step("Verify logo, menus, locale, contacts, and cart indicator", async () => {
      await expect(header.logo).toHaveAttribute("href", /\/ua\/?$/);
      await expect(header.allProducts).toBeVisible();
      await header.languageMenu.click();
      await expect(header.russianSwitch).toBeVisible();
      expect(new URL(await header.russianSwitch.getAttribute("href")).pathname)
        .toBe(product.url.replace(/^\/ua/, ""));
      await expect(header.phone).toBeVisible();
      await expect(header.phone).toHaveAttribute("href", `tel:${product.header.phone}`);
      await expect(header.cartLink).toBeVisible();
      await expect(header.cartCounter).toHaveText(product.quantity.emptyCart);
      for (const hours of product.header.workingHours) {
        await expect(page.getByText(hours, { exact: false }).first()).toBeVisible();
      }
      await expect(header.login).toBeVisible();
      await attachElementScreenshot(testInfo, header.root, "Desktop header navigation");
      await attachElementScreenshot(testInfo, header.phone, "Header phone");
    });
  });

  const breadcrumbsMeta = getTestMeta("TC-006");
  test(`${breadcrumbsMeta.id} ${breadcrumbsMeta.name}`, {
    tag: getTags("TC-006"),
    annotation: { type: "description", description: breadcrumbsMeta.description },
  }, async ({ page }, testInfo) => {
    const productPage = new ProductPage(page);
    await test.step("Check parent breadcrumb links and product label", async () => {
      for (const crumb of product.breadcrumbs) {
        const link = page.getByRole("link", { name: crumb.name, exact: true }).first();
        await expect(link).toHaveAttribute("href", new RegExp(`${crumb.href.replaceAll("/", "\\/")}/?$`));
      }
      await expect(page.getByText(product.name, { exact: true }).first()).toBeVisible();
      await attachElementScreenshot(testInfo, productPage.breadcrumbs, "Product breadcrumbs");
    });
  });

  const productDetailsMeta = getTestMeta("TC-007");
  test(`${productDetailsMeta.id} ${productDetailsMeta.name}`, {
    tag: [...getTags("TC-007"), "@smoke"],
    annotation: { type: "description", description: productDetailsMeta.description },
  }, async ({ page }, testInfo) => {
    const productPage = new ProductPage(page);
    await test.step("Verify product details", async () => {
      await expect(productPage.heading).toHaveText(product.name);
      await expect(productPage.mainImage).toBeVisible();
      await expect(productPage.mainImage).toHaveAttribute("alt", /\S+/);
      await expect.poll(() => productPage.mainImage.evaluate(image =>
        image.complete && image.naturalWidth > 0,
      )).toBe(true);
      const price = await productPage.getVisiblePrice();
      expect(price.amount).toBeGreaterThan(0);
      expect(price.text).toMatch(new RegExp(product.pricePattern));
      await expect(productPage.characteristics).toBeVisible();
      await expect(productPage.characteristics).toContainText(product.volume);
      await expect(productPage.productSection).toContainText(product.available);
      for (const characteristic of product.characteristics) {
        await expect(productPage.characteristics).toContainText(characteristic);
      }
      await attachElementScreenshot(testInfo, productPage.mainImage, "Product main image");
      await attachElementScreenshot(testInfo, productPage.productSection, "Product details and price");
      await attachElementScreenshot(testInfo, productPage.characteristics, "Product characteristics");
    });
  });

  const productControlsMeta = getTestMeta("TC-008");
  test(`${productControlsMeta.id} ${productControlsMeta.name}`, {
    tag: [...getTags("TC-008"), "@smoke"],
    annotation: { type: "description", description: productControlsMeta.description },
  }, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "The mobile purchase bar omits desktop quantity controls");
    const productPage = new ProductPage(page);
    await test.step("Verify quantity starts at one and cannot drop below one", async () => {
      await expect(productPage.quantity).toHaveValue(product.quantity.initial);
      await expect(productPage.decreaseQuantity).toHaveClass(/disabled/);
      await productPage.increaseQuantity.click();
      await expect(productPage.quantity).toHaveValue(product.quantity.increased);
      await productPage.decreaseQuantity.click();
      await expect(productPage.quantity).toHaveValue(product.quantity.initial);
      await expect(productPage.decreaseQuantity).toHaveClass(/disabled/);
    });

    await test.step("Check every visible product-card button", async () => {
      const buttons = productPage.card.getByRole("button");
      const count = await buttons.count();
      expect(count).toBeGreaterThan(0);
      for (let index = 0; index < count; index += 1) {
        const button = buttons.nth(index);
        await expect(button).toBeVisible();
        await expect(button).toBeEnabled();
        const accessibleName = await button.evaluate(element =>
          element.getAttribute("aria-label") || element.innerText.trim(),
        );
        expect(accessibleName).toBeTruthy();
      }
      await expect(productPage.buyButton).toHaveText(product.buyButton);
      await attachElementScreenshot(testInfo, productPage.card, "Product card controls");
    });
  });

  const addToCartMeta = getTestMeta("TC-009");
  test(`${addToCartMeta.id} ${addToCartMeta.name}`, {
    tag: [...getTags("TC-009"), "@smoke"],
    annotation: { type: "description", description: addToCartMeta.description },
  }, async ({ page }, testInfo) => {
    const productPage = new ProductPage(page);
    const header = new HeaderComponent(page);
    const cartPage = new CartPage(page);
    await test.step("Add one item and verify the cart", async () => {
      const productPrice = (await productPage.getVisiblePrice()).amount;
      await productPage.buyButton.click();
      await expect(header.cartCounter).toHaveText("1");
      await cartPage.open();
      await expect(cartPage.productName).toBeVisible();
      await expect(cartPage.productName).toContainText(product.name);
      expect(new URL(await cartPage.productName.getAttribute("href"), page.url()).pathname)
        .toBe(product.url);
      await expect(cartPage.quantityInput).toHaveValue(product.quantity.singleItem);
      await expect(cartPage.dialog.getByText(new RegExp(`${productPrice}\\s*${product.currency}`)).last())
        .toBeVisible();
      await attachElementScreenshot(testInfo, cartPage.dialog, "Cart item and price");
    });
  });

  const footerMeta = getTestMeta("TC-010");
  test(`${footerMeta.id} ${footerMeta.name}`, {
    tag: getTags("TC-010"),
    annotation: { type: "description", description: footerMeta.description },
  }, async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Footer navigation links are desktop-only");
    const footer = new FooterComponent(page);
    await test.step("Check footer content and linked pages", async () => {
      for (const item of product.footer.links) {
        const link = footer.link(item.text);
        await expect(link).toBeVisible();
        const href = new URL(await link.getAttribute("href"), page.url());
        expect(href.pathname).toBe(item.href);
        const response = await request.get(href.href);
        expect(response.status(), `${item.text} returned ${response.status()}`).toBeLessThan(400);
      }
      await expect(footer.root).toContainText(product.ageNotice);
      await expect(footer.root).toContainText(product.footer.copyright);
      await attachElementScreenshot(testInfo, footer.root, "Footer links and legal notices");
    });
  });

  const pageDiagnosticsMeta = getTestMeta("TC-011");
  test(`${pageDiagnosticsMeta.id} ${pageDiagnosticsMeta.name}`, {
    tag: getTags("TC-011"),
    annotation: { type: "description", description: pageDiagnosticsMeta.description },
  }, async ({ page }, testInfo) => {
    await test.step("Review browser diagnostics captured during navigation", async () => {
      expect(page.consoleErrors).toEqual([]);
      expect(page.firstPartyFailures).toEqual([]);
      await attachElementScreenshot(
        testInfo,
        new ProductPage(page).heading,
        "Page under JavaScript and network diagnostics",
      );
    });
  });
});

test.describe("City confirmation", () => {
  const cityConfirmationMeta = getTestMeta("TC-012");
  test(`${cityConfirmationMeta.id} ${cityConfirmationMeta.name}`, {
    tag: getTags("TC-012"),
    annotation: { type: "description", description: cityConfirmationMeta.description },
  }, async ({ page }, testInfo) => {
    await loadProduct(page);
    await dismissAgePopup(page);
    const cityQuestion = page.getByText(product.cityPopup.question, { exact: false })
      .filter({ visible: true }).first();
    await expect(cityQuestion).toBeVisible();
    await expect(page.getByRole("button", { name: product.cityPopup.confirm, exact: true }).last()).toBeVisible();
    await expect(page.getByText(product.cityPopup.change, { exact: true })
      .filter({ visible: true }).first()).toBeVisible();
    await attachElementScreenshot(testInfo, cityQuestion, "City confirmation prompt");
    await page.locator("button.js-selected-city-confirm:visible").last().click();
    await expect(cityQuestion).toBeHidden();
  });
});

test.describe("Regression checks", { tag: "@regression" }, () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__lcp = null;
      if (window.PerformanceObserver?.supportedEntryTypes.includes("largest-contentful-paint")) {
        new PerformanceObserver(entries => {
          const lastEntry = entries.getEntries().at(-1);
          if (lastEntry) window.__lcp = lastEntry.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
      }
    });
    await loadProduct(page);
    await dismissPopups(page);
  });

  const languageSwitchMeta = getTestMeta("TC-013");
  test(`${languageSwitchMeta.id} ${languageSwitchMeta.name}`, {
    tag: getTags("TC-013"),
    annotation: { type: "description", description: languageSwitchMeta.description },
  }, async ({ page }, testInfo) => {
    const header = new HeaderComponent(page);
    await header.languageMenu.click();
    await header.russianSwitch.click();
    await expect.poll(() => new URL(page.url()).pathname)
      .toBe(product.url.replace(/^\/ua/, ""));
    await expect(page.getByRole("heading", { level: 1 }))
      .toContainText(product.russianNameContains);
    await attachElementScreenshot(
      testInfo,
      page.getByRole("heading", { level: 1 }),
      "Russian product heading",
    );
    await header.languageMenu.click();
    await header.ukrainianSwitch.click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(product.url);
    await attachElementScreenshot(
      testInfo,
      page.getByRole("heading", { level: 1 }),
      "Ukrainian product heading after switching back",
    );
  });

  const mobileLayoutMeta = getTestMeta("TC-014");
  test(`${mobileLayoutMeta.id} ${mobileLayoutMeta.name}`, {
    tag: getTags("TC-014"),
    annotation: { type: "description", description: mobileLayoutMeta.description },
  }, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Runs only in the Pixel 7 project");
    const header = new HeaderComponent(page);
    const menu = header.mobileMenuButton;
    await expect(menu).toBeVisible();
    await menu.click();
    await expect(header.mobileMenu).toBeVisible();
    await attachElementScreenshot(testInfo, header.mobileMenu, "Mobile navigation menu");
    await menu.click();
    await expect.poll(() => page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    )).toBe(true);
    const buyButton = new ProductPage(page).buyButton;
    await expect(buyButton).toBeVisible();
    await attachElementScreenshot(testInfo, buyButton, "Mobile purchase button");
  });

  const seoMeta = getTestMeta("TC-015");
  test(`${seoMeta.id} ${seoMeta.name}`, {
    tag: getTags("TC-015"),
    annotation: { type: "description", description: seoMeta.description },
  }, async ({ page }, testInfo) => {
    await expect(page.locator("meta[name='description']")).toHaveAttribute("content", /\S+/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const price = (await new ProductPage(page).getVisiblePrice()).amount;
    const productSchema = await page.locator('script[type="application/ld+json"]').evaluateAll(scripts =>
      scripts.map(script => JSON.parse(script.textContent))
        .flatMap(schema => Array.isArray(schema) ? schema : [schema])
        .find(schema => schema["@type"] === "Product"),
    );
    expect(productSchema).toBeTruthy();
    expect(productSchema.name).toContain(product.brandName);
    expect(Number(productSchema.offers.price)).toBe(price);
    expect(productSchema.offers.priceCurrency).toBe(product.priceCurrency);
    await attachElementScreenshot(
      testInfo,
      new ProductPage(page).productSection,
      "Visible product price for structured data comparison",
    );
  });

  const relatedProductsMeta = getTestMeta("TC-016");
  test(`${relatedProductsMeta.id} ${relatedProductsMeta.name}`, {
    tag: getTags("TC-016"),
    annotation: { type: "description", description: relatedProductsMeta.description },
  }, async ({ page, request }, testInfo) => {
    const cards = page.locator("#product-page a.product-micro:visible")
      .filter({ has: page.locator("img:visible") });
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    const card = cards.first();
    await expect(card.locator("img").first()).toBeVisible();
    await expect(card).toContainText(new RegExp(product.pricePattern));
    await expect(card).toContainText(/\S+/);
    const href = await card.getAttribute("href");
    expect(href).toBeTruthy();
    expect(new URL(href, page.url()).origin).toBe("https://winetime.com.ua");
    const response = await request.get(href);
    expect(response.status()).toBeLessThan(400);
    await attachElementScreenshot(testInfo, card, "Related product card");
  });

  const reviewValidationMeta = getTestMeta("TC-017");
  test(`${reviewValidationMeta.id} ${reviewValidationMeta.name}`, {
    tag: getTags("TC-017"),
    annotation: { type: "description", description: reviewValidationMeta.description },
  }, async ({ page }, testInfo) => {
    const reviews = page.locator(".product-page--tab:visible")
      .filter({ hasText: product.seo.reviewSection }).first();
    await expect(reviews).toBeVisible();
    await reviews.click();
    await page.getByRole("button", { name: product.reviews.open }).click();
    const form = page.locator("form").filter({
      has: page.getByRole("button", {
        name: new RegExp(product.reviews.submitButtonPattern, "i"),
      }),
    }).first();
    if (!(await form.count())) {
      await expect(page.getByText(product.reviews.loginTitle, { exact: true }).last()).toBeVisible();
      test.skip(true, "Review form is gated by authentication; no credentials are used");
    }
    await form.getByRole("button", {
      name: new RegExp(product.reviews.submitButtonPattern, "i"),
    }).click();
    await expect(form.getByText(new RegExp(product.reviews.requiredError), { exact: false }).first())
      .toBeVisible();
    await attachElementScreenshot(
      testInfo,
      form.getByText(new RegExp(product.reviews.requiredError), { exact: false }).first(),
      "Review form validation error",
    );
  });

  const siteSearchMeta = getTestMeta("TC-018");
  test(`${siteSearchMeta.id} ${siteSearchMeta.name}`, {
    tag: getTags("TC-018"),
    annotation: { type: "description", description: siteSearchMeta.description },
  }, async ({ page }, testInfo) => {
    if (testInfo.project.name === "mobile") {
      await new HeaderComponent(page).mobileSearchButton.click();
    }
    const search = page.getByPlaceholder(product.header.searchPlaceholder)
      .filter({ visible: true }).first();
    await expect(search).toBeVisible();
    await search.fill(product.searchTerm);
    await search.press("Enter");
    const result = page.getByText(product.name, { exact: true }).last();
    await expect(result).toBeVisible();
    await attachElementScreenshot(testInfo, result, "Search result product");
  });

  const categoryNavigationMeta = getTestMeta("TC-019");
  test(`${categoryNavigationMeta.id} ${categoryNavigationMeta.name}`, {
    tag: getTags("TC-019"),
    annotation: { type: "description", description: categoryNavigationMeta.description },
  }, async ({ page }, testInfo) => {
    const category = page.getByRole("link", { name: product.subcategory, exact: true }).first();
    expect(new URL(await category.getAttribute("href"), page.url()).pathname)
      .toBe(product.breadcrumbs[2].href);
    await category.click();
    await expect(page).toHaveURL(new RegExp(`${product.breadcrumbs[2].href.replaceAll("/", "\\/")}$`));
    const result = page.getByText(product.name, { exact: true }).first();
    await expect(result).toBeVisible();
    await attachElementScreenshot(testInfo, result, "Product in category listing");
  });

  const cartPersistenceMeta = getTestMeta("TC-020");
  test(`${cartPersistenceMeta.id} ${cartPersistenceMeta.name}`, {
    tag: getTags("TC-020"),
    annotation: { type: "description", description: cartPersistenceMeta.description },
  }, async ({ page, context }, testInfo) => {
    const header = new HeaderComponent(page);
    await new ProductPage(page).buyButton.click();
    await expect(header.cartCounter).toHaveText("1");
    await attachElementScreenshot(testInfo, header.cartCounter, "Cart counter after adding item");
    await page.reload();
    await dismissPopups(page);
    await expect(header.cartCounter).toHaveText("1");
    await attachElementScreenshot(testInfo, header.cartCounter, "Cart counter after reload");
    const newTab = await context.newPage();
    await newTab.goto(product.url);
    await dismissPopups(newTab);
    const newTabCounter = new HeaderComponent(newTab).cartCounter;
    await expect(newTabCounter).toHaveText("1");
    await attachElementScreenshot(testInfo, newTabCounter, "Cart counter in new tab");
  });

  const accessibilityMeta = getTestMeta("TC-021");
  test(`${accessibilityMeta.id} ${accessibilityMeta.name}`, {
    tag: getTags("TC-021"),
    annotation: { type: "description", description: accessibilityMeta.description },
  }, async ({ page }, testInfo) => {
    const AxeBuilder = require("@axe-core/playwright");
    const accessibility = await new AxeBuilder({ page }).analyze();
    const severe = accessibility.violations.filter(violation =>
      ["serious", "critical"].includes(violation.impact),
    );
    const findings = severe.map(({ id, impact, nodes }) => ({
      id,
      impact,
      affectedNodes: nodes.length,
    }));
    if (findings.length) {
      test.info().annotations.push({
        type: "axe-serious-critical",
        description: JSON.stringify(findings),
      });
    }
    await attachElementScreenshot(
      testInfo,
      new ProductPage(page).card,
      "Product page evaluated for accessibility",
    );
  });

  const visualRegressionMeta = getTestMeta("TC-022");
  test(`${visualRegressionMeta.id} ${visualRegressionMeta.name}`, {
    tag: getTags("TC-022"),
    annotation: { type: "description", description: visualRegressionMeta.description },
  }, async ({ page }, testInfo) => {
    test.skip(test.info().project.name === "mobile", "Mobile layout has a separate responsive check");
    await expect(new ProductPage(page).card).toHaveScreenshot("product-card.png", {
      mask: [
        page.locator("#product-page .product-page--right-column .j-mb-30-xs .j-weight-600-xs"),
        page.locator("#product-page [class*='banner']"),
      ],
      animations: "disabled",
    });
    await attachElementScreenshot(
      testInfo,
      new ProductPage(page).card,
      "Product card visual regression evidence",
    );
  });

  const performanceMeta = getTestMeta("TC-023");
  test(`${performanceMeta.id} ${performanceMeta.name}`, {
    tag: getTags("TC-023"),
    annotation: { type: "description", description: performanceMeta.description },
  }, async ({ page }, testInfo) => {
    test.skip(!(await page.evaluate(() =>
      PerformanceObserver.supportedEntryTypes.includes("largest-contentful-paint"),
    )), "Largest Contentful Paint entry type is unsupported in this browser");
    const lcp = await page.evaluate(() => window.__lcp ??
      performance.getEntriesByType("largest-contentful-paint").at(-1)?.startTime ?? null);
    expect(lcp).not.toBeNull();
    expect(lcp).toBeLessThan(product.performanceLimitMs);
    const images = page.locator("img");
    for (let index = 0; index < await images.count(); index += 1) {
      const image = images.nth(index);
      if (await image.isVisible()) {
        await expect.poll(() => image.evaluate(element =>
          element.complete && element.naturalWidth > 0,
        )).toBe(true);
      }
    }
    await attachElementScreenshot(
      testInfo,
      new ProductPage(page).mainImage,
      "Loaded product image for performance check",
    );
  });

  const missingProductMeta = getTestMeta("TC-024");
  test(`${missingProductMeta.id} ${missingProductMeta.name}`, {
    tag: getTags("TC-024"),
    annotation: { type: "description", description: missingProductMeta.description },
  }, async ({ page }, testInfo) => {
    const response = await page.goto("/ua/non-existing-product-e2e-check", {
      waitUntil: "domcontentloaded",
    });
    expect(response.status()).toBe(404);
    const backToShop = page.getByRole("link", {
      name: product.siteNavigation.backToShop,
    }).first();
    await expect(backToShop).toBeVisible();
    await attachElementScreenshot(testInfo, backToShop, "404 page shop navigation");
  });
});
