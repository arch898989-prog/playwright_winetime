const { test, expect } = require("@playwright/test");
const product = require("../test-data/product.json");
const { ProductPage } = require("../pages/ProductPage");
const { CartPage } = require("../pages/CartPage");
const { HeaderComponent } = require("../pages/HeaderComponent");
const { FooterComponent } = require("../pages/FooterComponent");
const { dismissAgePopup, dismissPopups } = require("../utils/popups");

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

  test("page loads with the expected metadata @smoke", async ({ page }) => {
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
    });
  });

  test("header navigation and contact information are visible", async ({ page }, testInfo) => {
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
    });
  });

  test("product breadcrumbs point to the expected categories", async ({ page }) => {
    await test.step("Check parent breadcrumb links and product label", async () => {
      for (const crumb of product.breadcrumbs) {
        const link = page.getByRole("link", { name: crumb.name, exact: true }).first();
        await expect(link).toHaveAttribute("href", new RegExp(`${crumb.href.replaceAll("/", "\\/")}/?$`));
      }
      await expect(page.getByText(product.name, { exact: true }).first()).toBeVisible();
    });
  });

  test("product image, price, characteristics, and availability are visible @smoke", async ({ page }) => {
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
    });
  });

  test("product card controls are accessible and quantity never drops below one @smoke", async ({ page }, testInfo) => {
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
    });
  });

  test("adding the product opens the cart with the correct price and quantity @smoke", async ({ page }) => {
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
    });
  });

  test("footer links resolve and required notices are present", async ({ page, request }, testInfo) => {
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
    });
  });

  test("page load has no JavaScript errors or failed first-party requests", async ({ page }) => {
    await test.step("Review browser diagnostics captured during navigation", async () => {
      expect(page.consoleErrors).toEqual([]);
      expect(page.firstPartyFailures).toEqual([]);
    });
  });
});

test.describe("City confirmation", () => {
  test("city popup displays and closes after confirmation", async ({ page }) => {
    await loadProduct(page);
    await dismissAgePopup(page);
    const cityQuestion = page.getByText(product.cityPopup.question, { exact: false })
      .filter({ visible: true }).first();
    await expect(cityQuestion).toBeVisible();
    await expect(page.getByRole("button", { name: product.cityPopup.confirm, exact: true }).last()).toBeVisible();
    await expect(page.getByText(product.cityPopup.change, { exact: true })
      .filter({ visible: true }).first()).toBeVisible();
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

  test("language switch changes locale and can return to Ukrainian", async ({ page }) => {
    const header = new HeaderComponent(page);
    await header.languageMenu.click();
    await header.russianSwitch.click();
    await expect.poll(() => new URL(page.url()).pathname)
      .toBe(product.url.replace(/^\/ua/, ""));
    await expect(page.getByRole("heading", { level: 1 }))
      .toContainText(product.russianNameContains);
    await header.languageMenu.click();
    await header.ukrainianSwitch.click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(product.url);
  });

  test("mobile layout opens navigation and keeps purchase action in viewport", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Runs only in the Pixel 7 project");
    const header = new HeaderComponent(page);
    const menu = header.mobileMenuButton;
    await expect(menu).toBeVisible();
    await menu.click();
    await expect(header.mobileMenu).toBeVisible();
    await menu.click();
    await expect.poll(() => page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    )).toBe(true);
    await expect(new ProductPage(page).buyButton).toBeVisible();
  });

  test("SEO metadata and Product structured data match the product", async ({ page }) => {
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
  });

  test("related products show imagery, prices, names, and working links", async ({ page, request }) => {
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
  });

  test("review area displays form validation without submitting a review", async ({ page }) => {
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
  });

  test("site search returns this product", async ({ page }, testInfo) => {
    if (testInfo.project.name === "mobile") {
      await new HeaderComponent(page).mobileSearchButton.click();
    }
    const search = page.getByPlaceholder(product.header.searchPlaceholder)
      .filter({ visible: true }).first();
    await expect(search).toBeVisible();
    await search.fill(product.searchTerm);
    await search.press("Enter");
    await expect(page.getByText(product.name, { exact: true }).last()).toBeVisible();
  });

  test("category navigation lists the product", async ({ page }) => {
    const category = page.getByRole("link", { name: product.subcategory, exact: true }).first();
    expect(new URL(await category.getAttribute("href"), page.url()).pathname)
      .toBe(product.breadcrumbs[2].href);
    await category.click();
    await expect(page).toHaveURL(new RegExp(`${product.breadcrumbs[2].href.replaceAll("/", "\\/")}$`));
    await expect(page.getByText(product.name, { exact: true }).first()).toBeVisible();
  });

  test("shopping cart persists after reload and in a new tab", async ({ page, context }) => {
    const header = new HeaderComponent(page);
    await new ProductPage(page).buyButton.click();
    await expect(header.cartCounter).toHaveText("1");
    await page.reload();
    await dismissPopups(page);
    await expect(header.cartCounter).toHaveText("1");
    const newTab = await context.newPage();
    await newTab.goto(product.url);
    await dismissPopups(newTab);
    await expect(new HeaderComponent(newTab).cartCounter).toHaveText("1");
  });

  test("axe reports serious and critical accessibility issues", async ({ page }) => {
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
  });

  test("product-card visual snapshot masks dynamic pricing and banners", async ({ page }) => {
    test.skip(test.info().project.name === "mobile", "Mobile layout has a separate responsive check");
    await expect(new ProductPage(page).card).toHaveScreenshot("product-card.png", {
      mask: [
        page.locator("#product-page .product-page--right-column .j-mb-30-xs .j-weight-600-xs"),
        page.locator("#product-page [class*='banner']"),
      ],
      animations: "disabled",
    });
  });

  test("performance and product images meet smoke thresholds", async ({ page }) => {
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
  });

  test("missing product URL returns 404 with shop navigation", async ({ page }) => {
    const response = await page.goto("/ua/non-existing-product-e2e-check", {
      waitUntil: "domcontentloaded",
    });
    expect(response.status()).toBe(404);
    await expect(page.getByRole("link", {
      name: product.siteNavigation.backToShop,
    }).first()).toBeVisible();
  });
});
