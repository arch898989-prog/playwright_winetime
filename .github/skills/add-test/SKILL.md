---
name: add-test
description: "Use when adding a new Playwright end-to-end test or UI validation in this WINETIME JavaScript project, including product-specific checks, city switching, popup handling, and test-matrix priority tagging."
---

# Add a WINETIME Playwright Test

Use this workflow whenever adding coverage to the WINETIME Playwright suite.
Follow the project's established CommonJS, `@playwright/test`, Page Object,
popup, and CSV-matrix patterns.

## Project requirements

- Put every new logical test in a **new spec file** under `tests/`. Do not add
  new tests to an existing spec, even if that spec tests a related feature.
- Name product-specific specs after the product, such as
  `tests/<product-name>-product.spec.js`. Keep product expectations in a
  product-specific JSON file under `test-data/` when appropriate; do not mix
  a product-only scenario into another product's spec or test data.
- Reuse existing Page Objects and utilities after inspecting them. Add or
  extend shared helpers only when the behavior is genuinely reusable.
- Verify every new UI behavior on desktop, tablet, and mobile form factors.
  Keep the Playwright configuration equipped with explicit projects for all
  three; if a tablet project is missing, add one using a Playwright tablet
  device descriptor before validating the new test. Configure the tablet
  project's browser engine explicitly: Playwright tablet descriptors such as
  iPad may default to WebKit, so set `browserName: "chromium"` when the suite
  should use Chromium and WebKit is not an intentional requirement. Preserve
  the existing desktop browser coverage and mobile device coverage.
- Do not skip a form-factor project just because a desktop control is absent
  from its layout. Inspect the responsive UI and verify the equivalent
  control, interaction, or expected responsive behavior on that form factor.
  The responsive equivalent may expose different content or a different
  interaction (for example, phone contacts inside the mobile navigation rather
  than a desktop hover dropdown); inspect the live DOM and assert the actual
  form-factor-specific behavior instead of reusing an assumed desktop locator.
  Avoid `test.skip()` based only on project name or viewport.
- Keep tests independent: use Playwright's per-test `page`/browser context,
  navigate and establish the test's own state, and clean up state changed by
  the test when practical. Do not rely on another test's order or storage.
- Never complete checkout, place a real order, submit a real review, or use
  login credentials.
- Keep Playwright screenshots enabled for both passed and failed tests
  (`screenshot: "on"` in the shared `use` configuration) so the HTML report
  includes visual evidence for successful assertions as well as failures.
  Do not override this to `"only-on-failure"` in a project or test unless the
  user explicitly requests that change.
- Make the final screenshot useful evidence for the test: every UI element
  being verified must be inside the captured viewport, not merely present or
  visible somewhere in a scrollable page. Before the test ends, scroll the
  primary verified element(s) into view and use `toBeInViewport()` where
  appropriate. If verified elements cannot fit in one viewport, take and
  attach additional screenshots at the relevant assertion steps so each
  screenshot visibly contains the element it supports.
- When a scenario covers a dynamic list (for example, all cities), read the
  options from the UI, verify each option, and restore the default selection
  after the check.

## Workflow

1. **Inspect before implementing.**
   - Read the relevant Page Objects, popup helpers, product JSON, and nearby
     test data. Check `test-data/test-matrix.csv`, `utils/matrix.js`, and
     `utils/validate-matrix.js` for the current matrix conventions.
   - Inspect the live page's DOM or use Playwright codegen before choosing
     selectors for dynamic controls. Prefer `getByRole`, then
     `getByLabel`/`getByText`, then stable `data-testid`, then a verified
     stable CSS selector. Avoid guessed selectors, XPath, and
     `nth-child`-style chains.
   - Identify overlays that can block interaction, including delayed or
     third-party popups. Verify their actual close control and the state that
     indicates they are gone.
2. **Add the matrix row first.**
   - Add one unique ID to `test-data/test-matrix.csv`, continuing the
     `TC-###` sequence (for example, `TC-025`).
   - Put the exact test title in `name`, **without** the ID prefix. The title
     in the spec will be `<ID> <name>`.
   - Write one short sentence in `description`; choose a valid priority
     (`P1`, `P2`, or `P3`), an area, and the new spec's filename.
   - Preserve the UTF-8 BOM. Quote any CSV field containing a comma, double
     quote, or newline; escape embedded quotes by doubling them.
3. **Create the new spec.**
   - Load metadata from the matrix instead of duplicating its title,
     description, priority, or area:

     ```js
     const { getTags, getTestMeta } = require("../utils/matrix");

     const meta = getTestMeta("TC-025");
     test(`${meta.id} ${meta.name}`, {
       tag: getTags("TC-025"),
       annotation: { type: "description", description: meta.description },
     }, async ({ page }) => {
       // Arrange this test's own page and state, then assert its behavior.
     });
     ```

   - Keep existing `@smoke` tags on tests that already have them. When a new
     test should also be smoke coverage, include `@smoke` alongside the tags
     returned by `getTags`.
   - Use `test.step()` for meaningful report sections. Prefer web-first
     assertions (`await expect(locator).toBeVisible()`, `toHaveText()`,
     `toHaveURL()`, etc.) and Playwright auto-waiting. Do not use
     `waitForTimeout`.
   - Use actual accessible names and verified labels. Keep expected text in
     the appropriate JSON test data rather than embedding it throughout the
     assertions.
4. **Handle popups and overlays explicitly.**
   - Use existing helpers from `utils/popups.js` for age, city-confirmation,
     cookie, and newsletter dialogs as applicable. If an overlay can appear
     after navigation, register the existing newsletter popup handler where
     appropriate and explicitly check/dismiss it immediately before the
     action it could block.
   - Assert the popup is hidden after closing it, then perform the intended
     action. A screenshot showing a popup is not proof the action succeeded.
   - Do not merely hide an overlay with CSS: it may continue intercepting
     events. Use its real close control. For the verified WINETIME newsletter
     popup, `dismissNewsletterPopup(page)` handles both
     `.cl-dialog-close-icon` and `.cl-floating-box-close-icon` and asserts
     that the popup disappears. The utility dispatches the verified close
     element's click because ordinary pointer clicks have been intercepted
     in Firefox; do not replace this with a guessed selector or blanket
     `force: true` on the test action.
   - If a popup type is new, inspect its DOM and close control first; add
     reusable helper behavior only after verification. Do not suppress
     unrelated dialogs silently.
5. **Choose a priority consistently.**
   - `P1`: core page load, primary product information and controls,
     add-to-cart, and essential cart totals.
   - `P2`: header/footer, breadcrumbs, city confirmation or switching,
     search, category navigation, language switching, and related
     functional navigation.
   - `P3`: SEO, accessibility, visual regression, performance, negative
     cases, and review validation.
   - When uncertain, use the closest existing matrix precedent and explain
     any unusual classification in the test description or response.
6. **Validate and report.**
   - Never start the entire test suite (all spec files and projects) without
     first asking the user for explicit permission. Prefer running only the
     new or directly affected spec and the smallest relevant project set.
     If full-suite validation would be useful, ask before launching it and
     wait for the user's answer.
   - Run `npm.cmd run matrix:check`; fix missing, unused, duplicate, invalid,
     or incorrectly mapped IDs.
   - Check that `playwright.config.js` has desktop, tablet, and mobile
     projects. Add the missing tablet project (using a Playwright tablet
     device descriptor) if needed; a single mobile project does not count as
     tablet coverage. Set the tablet browser engine explicitly so a device
     descriptor does not silently introduce an unintended browser dependency.
   - List the new spec without restricting projects, for example:
     `npx.cmd playwright test <new-spec>.spec.js --list`. Confirm the test is
     discovered for desktop, tablet, and mobile projects.
   - Run the new spec without `--project`, for example:
     `npm.cmd test -- <new-spec>.spec.js`. This must execute across every
     configured form factor; retain Chromium and Firefox desktop coverage for
     browser-specific interactions such as popups.
   - Implement responsive assertions where markup or interaction differs by
     form factor instead of skipping those projects. Only skip for a verified
     technical capability limitation unrelated to viewport layout, and
     explain the evidence and limitation in the skip reason and final report.
   - Run `npm.cmd run matrix` to regenerate `TEST_MATRIX.md`, and run
     `git diff --check`.
   - For UI tests, verify a passed test produces a screenshot attachment and
     that it is available from the HTML report. Inspect that screenshot to
     confirm the element under test is actually in the captured viewport; do
     not treat DOM visibility outside the viewport or `toHaveScreenshot()` as
     a substitute for this evidence.
   - If any test fails, inspect its error context, trace, and screenshot;
     distinguish an application behavior failure from a bad locator, delayed
     overlay, or browser-specific interaction before changing the test.
   - State exactly which commands passed, which projects were run or skipped,
     and any live-site failures. Do not claim an unrun test passed.

## Priority filters and reports

The CSV provides `@P1`/`@P2`/`@P3` and lowercase area tags through
`getTags(id)`. Use the existing npm scripts:

```powershell
npm.cmd run test:p1
npm.cmd run test:p2
npm.cmd run test:p3
npm.cmd run test:p1-p2
```

Tests retain the existing `list` reporter for terminal progress. The HTML
report setup keeps timestamped history in `playwright-report/`; `index.html`
is the latest-run alias used by `npm.cmd run report`, while
`index-<timestamp>.html` files are the archived runs. Keep the configured
failure-screenshot highlighting behavior intact.
