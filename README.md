# WINETIME Playwright E2E

End-to-end checks for the WINETIME product page, written in JavaScript using
CommonJS and `@playwright/test`.

## Setup

In PowerShell, use the `.cmd` shims to avoid execution-policy errors from
`npm.ps1` and `npx.ps1`:

```powershell
npm.cmd install
npx.cmd playwright install chromium firefox
```

In Command Prompt, the regular `npm` and `npx` commands work:

```cmd
npm install
npx playwright install chromium firefox
```

## Run

```powershell
npm.cmd test
npm.cmd run test:smoke
npm.cmd run test:headed
npm.cmd run test:ui
npm.cmd run report
```

The list reporter prints test progress in the terminal as tests execute. The
HTML report is still generated when the run completes. Reports are preserved
in the single `playwright-report/` directory: each run adds an
`index-<UTC timestamp>.html` file, while `index.html` always points to the
latest run. `npm.cmd run report` opens the latest report; open a timestamped
HTML file from that directory to view an older run.

To run only the Camden Park spec in PowerShell, pass its filename as the
Playwright test filter (without the `tests\` prefix):

```powershell
npm.cmd test -- camden-park-product.spec.js
npm.cmd test -- camden-park-product.spec.js --project=chromium
npm.cmd test -- city-switching.spec.js
```

Playwright treats positional test arguments as regular-expression filters, so
avoid Windows backslashes in these filters. To run one test within the file,
add `--grep "part of the test title"`.

The suite runs with two workers and includes desktop Chromium and Firefox,
iPad tablet, and Pixel 7 mobile projects. HTML report history is written to `playwright-report/`.
Tests use a fresh browser context for each case and never complete checkout,
submit an order, submit a review, or provide login credentials.

Screenshots are captured and attached to the HTML report for both passed and
failed tests. Failure screenshots are annotated before the HTML report is written. Known
failure types, such as a missing login link or a malformed cart title, receive
a targeted highlight; other failures receive a general marker and can be
diagnosed from the report's error details.

## Test matrix & priorities

All tests are listed in `test-data/test-matrix.csv`. To reprioritize a test,
edit its `priority` column to `P1`, `P2`, or `P3` and save the CSV. Test tags
are read from the matrix, so no spec edit is needed when only changing
priority.

To add a test, first add a CSV row with a unique ID, its exact test title
without the ID prefix, a one-sentence description, priority, area, and spec
filename. Then add the test to that spec using the same ID with `getTestMeta`
and `getTags`. Every `npm test` run checks the CSV against all specs before
starting.

Run tests by priority:

```powershell
npm.cmd run test:p1
npm.cmd run test:p2
npm.cmd run test:p3
npm.cmd run test:p1-p2
```

Validate the matrix or regenerate `TEST_MATRIX.md` manually:

```powershell
npm.cmd run matrix:check
npm.cmd run matrix
```

If editing in Excel, save the file as **CSV UTF-8** so Ukrainian text remains
correctly encoded.
