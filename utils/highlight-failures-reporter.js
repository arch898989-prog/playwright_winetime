const fs = require("node:fs/promises");
const crypto = require("node:crypto");
const path = require("node:path");
const { chromium } = require("playwright");

function getIssue(test, result) {
  const title = test.titlePath().join(" ").toLowerCase();
  const details = result.errors.map(error => error.message || "").join(" ").toLowerCase();

  if (title.includes("header navigation") || details.includes("вхід") || details.includes("login")) {
    return {
      label: "Missing login link (profile icon only)",
      position: "header",
    };
  }
  if (details.includes("&amp;")) {
    return {
      label: "Product title is rendered incorrectly",
      position: "cart",
    };
  }
  if (title.includes("quantity") || details.includes("accessible name")) {
    return {
      label: "Quantity control failure",
      position: "controls",
    };
  }
  if (title.includes("search") || details.includes("search results")) {
    return {
      label: "Expected product missing from search results",
      position: "results",
    };
  }
  if (title.includes("performance") || details.includes("largest contentful paint") || details.includes("lcp")) {
    return {
      label: "LCP performance threshold exceeded",
      position: "hero",
    };
  }
  return {
    label: "Failure location: see error details",
    position: "unknown",
  };
}

function getHighlight(position, width, height) {
  const mobile = width < 700;
  if (position === "header") {
    const boxWidth = Math.max(32, Math.round(width * 0.03));
    const boxHeight = Math.max(40, Math.round(height * 0.07));
    return {
      x: width - boxWidth - 8,
      y: Math.round(height * 0.09),
      width: boxWidth,
      height: boxHeight,
    };
  }
  if (position === "cart") {
    return mobile
      ? {
          x: Math.round(width * 0.25),
          y: Math.round(height * 0.22),
          width: Math.round(width * 0.6),
          height: Math.round(height * 0.11),
        }
      : {
          x: Math.round(width * 0.23),
          y: Math.round(height * 0.28),
          width: Math.round(width * 0.27),
          height: Math.round(height * 0.16),
        };
  }
  if (position === "controls") {
    return {
      x: Math.round(width * 0.72),
      y: Math.round(height * 0.65),
      width: Math.round(width * 0.2),
      height: Math.round(height * 0.12),
    };
  }
  if (position === "results") {
    return mobile
      ? {
          x: Math.round(width * 0.04),
          y: Math.round(height * 0.5),
          width: Math.round(width * 0.92),
          height: Math.round(height * 0.32),
        }
      : {
          x: Math.round(width * 0.24),
          y: Math.round(height * 0.55),
          width: Math.round(width * 0.72),
          height: Math.round(height * 0.32),
        };
  }
  if (position === "hero") {
    return {
      x: Math.round(width * 0.28),
      y: Math.round(height * 0.27),
      width: Math.round(width * 0.19),
      height: Math.round(height * 0.62),
    };
  }
  return {
    x: 8,
    y: 8,
    width: width - 16,
    height: height - 16,
  };
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

class HighlightFailuresReporter {
  constructor(options = {}) {
    this.reportDataDirectory = path.resolve(options.outputFolder || "playwright-report", "data");
    this.stagingDirectory = path.resolve(options.outputFolder || "playwright-report");
    this.archiveDirectory = path.resolve(options.archiveFolder || "playwright-report");
    this.timestamp = options.timestamp || new Date().toISOString().replace(/[:.]/g, "-");
    this.reportImages = new Map();
  }

  onTestEnd(test, result) {
    if (result.status === "passed") return;
    this.pending = (this.pending || Promise.resolve())
      .then(() => this.annotate(test, result));
    return this.pending;
  }

  async annotate(test, result) {
    const screenshots = result.attachments.filter(attachment =>
      attachment.contentType === "image/png" && attachment.path,
    );
    if (screenshots.length === 0) return;

    const issue = getIssue(test, result);
    const browser = await this.getBrowser();
    for (const attachment of screenshots) {
      const image = await fs.readFile(attachment.path);
      const reportFileName = `${crypto.createHash("sha1").update(image).digest("hex")}.png`;
      const width = image.readUInt32BE(16);
      const height = image.readUInt32BE(20);
      const rect = getHighlight(issue.position, width, height);
      const labelWidth = Math.min(width - 16, Math.max(280, issue.label.length * 10 + 24));
      const labelX = Math.min(Math.max(8, rect.x), width - labelWidth - 8);
      const labelY = rect.y >= 48 ? rect.y - 40 : Math.min(height - 40, rect.y + rect.height + 8);
      const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
        `<image width="${width}" height="${height}" href="data:image/png;base64,${image.toString("base64")}"/>`,
        `<rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" rx="6" fill="#ff000022" stroke="#d00000" stroke-width="6"/>`,
        `<rect x="${labelX}" y="${labelY}" width="${labelWidth}" height="32" rx="5" fill="#c90000"/>`,
        `<text x="${labelX + 11}" y="${labelY + 22}" fill="white" font-family="Arial,sans-serif" font-size="14" font-weight="700">${escapeXml(issue.label)}</text>`,
        "</svg>",
      ].join("");
      const page = await browser.newPage({
        viewport: { width, height },
        deviceScaleFactor: 1,
      });
      await page.setContent(
        `<body style="margin:0"><img style="display:block;width:${width}px;height:${height}px" src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}"/></body>`,
      );
      await page.locator("img").evaluate(imageElement => imageElement.decode());
      await page.screenshot({ path: attachment.path });
      await page.close();
      const annotatedImage = await fs.readFile(attachment.path);
      const annotatedFileName = `${crypto.createHash("sha1").update(annotatedImage).digest("hex")}.png`;
      this.reportImages.set(reportFileName, annotatedImage);
      this.reportImages.set(annotatedFileName, annotatedImage);
    }
  }

  async getBrowser() {
    if (!this.browser) this.browser = await chromium.launch({ headless: true });
    return this.browser;
  }

  async onExit() {
    await this.pending;
    try {
      for (const [fileName, image] of this.reportImages) {
        const reportPath = path.join(this.reportDataDirectory, fileName);
        try {
          await fs.access(reportPath);
          await fs.writeFile(reportPath, image);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      }
      await this.archiveReport();
    } finally {
      if (this.browser) await this.browser.close();
    }
  }

  async archiveReport() {
    try {
      await fs.access(this.reportDataDirectory);
      await fs.mkdir(path.join(this.archiveDirectory, "data"), { recursive: true });
      await fs.cp(
        this.reportDataDirectory,
        path.join(this.archiveDirectory, "data"),
        { recursive: true, force: true },
      );
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    const stagingTraceDirectory = path.join(this.stagingDirectory, "trace");
    try {
      await fs.access(stagingTraceDirectory);
      await fs.cp(stagingTraceDirectory, path.join(this.archiveDirectory, "trace"), {
        recursive: true,
        force: true,
      });
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    const reportPath = path.join(this.stagingDirectory, "index.html");
    await fs.copyFile(
      reportPath,
      path.join(this.archiveDirectory, `index-${this.timestamp}.html`),
    );
    await fs.copyFile(reportPath, path.join(this.archiveDirectory, "index.html"));
    await fs.rm(this.stagingDirectory, { recursive: true, force: true });
  }
}

module.exports = HighlightFailuresReporter;
