const fs = require("node:fs");
const path = require("node:path");
const { loadMatrix } = require("./matrix");

const testsDirectory = path.join(__dirname, "..", "tests");
const errors = [];
let rows;

try {
  rows = loadMatrix();
} catch (error) {
  console.error(`Test matrix validation failed: ${error.message}`);
  process.exitCode = 1;
  return;
}

const rowsById = new Map();
for (const row of rows) {
  if (!/^TC-\d{3}$/.test(row.id)) {
    errors.push(`Invalid test id "${row.id}"; expected format TC-001.`);
  }
  if (rowsById.has(row.id)) {
    errors.push(`Duplicate test matrix id: ${row.id}.`);
  } else {
    rowsById.set(row.id, row);
  }
}

const usedIds = new Map();
for (const file of fs.readdirSync(testsDirectory).filter(name => name.endsWith(".spec.js"))) {
  const source = fs.readFileSync(path.join(testsDirectory, file), "utf8");
  const referencePattern = /getTestMeta\(\s*["'](TC-\d{3})["']\s*\)/g;
  let match;

  while ((match = referencePattern.exec(source)) !== null) {
    const [, id] = match;
    const previousFile = usedIds.get(id);
    if (previousFile) {
      errors.push(`Test id ${id} is used more than once (${previousFile} and ${file}).`);
      continue;
    }

    usedIds.set(id, file);
    const row = rowsById.get(id);
    if (!row) {
      errors.push(`${file} uses ${id}, but that id is missing from the CSV.`);
    } else if (row.file !== file) {
      errors.push(`${id} lists "${row.file}" in the CSV but is used in "${file}".`);
    }
  }
}

for (const id of rowsById.keys()) {
  if (!usedIds.has(id)) {
    errors.push(`${id} is in the CSV but is not used in any spec.`);
  }
}

if (errors.length > 0) {
  console.error("Test matrix validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Test matrix validation passed: ${rows.length} tests, all ids unique and in sync.`);
}
