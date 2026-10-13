const { defineConfig, devices } = require("@playwright/test");

const reportTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
const reportStagingDirectory = `.playwright-report-staging/${reportTimestamp}`;

module.exports = defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 1,
  workers: 2,
  reporter: [
    ["list"],
    ["html", { outputFolder: reportStagingDirectory, open: "never" }],
    ["./utils/highlight-failures-reporter.js", {
      outputFolder: reportStagingDirectory,
      archiveFolder: "playwright-report",
      timestamp: reportTimestamp,
    }],
  ],
  use: {
    baseURL: "https://winetime.com.ua",
    locale: "uk-UA",
    timezoneId: "Europe/Kiev",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        timezoneId: "Europe/Kyiv",
      },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
