const fs = require("node:fs");
const path = require("node:path");
const { loadMatrix } = require("../utils/matrix");

const priorityOrder = { P1: 1, P2: 2, P3: 3 };
const rows = [...loadMatrix()].sort((left, right) =>
  priorityOrder[left.priority] - priorityOrder[right.priority] ||
  left.id.localeCompare(right.id),
);
const counts = rows.reduce((summary, row) => {
  summary[row.priority] += 1;
  return summary;
}, { P1: 0, P2: 0, P3: 0 });
const escapeCell = value => String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

const markdown = [
  "# Test Coverage Matrix",
  "",
  "| ID | Name | Description | Priority | Area |",
  "| --- | --- | --- | --- | --- |",
  ...rows.map(row =>
    `| ${escapeCell(row.id)} | ${escapeCell(row.name)} | ${escapeCell(row.description)} | ` +
    `${escapeCell(row.priority)} | ${escapeCell(row.area)} |`,
  ),
  "",
  "## Summary",
  "",
  `- P1: ${counts.P1}`,
  `- P2: ${counts.P2}`,
  `- P3: ${counts.P3}`,
  `- Total: ${rows.length}`,
  "",
].join("\n");

const outputPath = path.join(__dirname, "..", "TEST_MATRIX.md");
fs.writeFileSync(outputPath, markdown, "utf8");
console.log(`Generated ${path.relative(process.cwd(), outputPath)} (${rows.length} tests).`);
console.log(`P1: ${counts.P1} | P2: ${counts.P2} | P3: ${counts.P3}`);
