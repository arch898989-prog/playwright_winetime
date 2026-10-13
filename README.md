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
```

Playwright treats positional test arguments as regular-expression filters, so
avoid Windows backslashes in these filters. To run one test within the file,
add `--grep "part of the test title"`.

The suite runs with two workers and includes desktop Chromium, Firefox, and a
Pixel 7 mobile project. HTML report history is written to `playwright-report/`.
Tests use a fresh browser context for each case and never complete checkout,
submit an order, submit a review, or provide login credentials.

Failure screenshots are annotated before the HTML report is written. Known
failure types, such as a missing login link or a malformed cart title, receive
a targeted highlight; other failures receive a general marker and can be
diagnosed from the report's error details.
