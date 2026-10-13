const fs = require("node:fs");
const path = require("node:path");
const { parse } = require("csv-parse/sync");

const matrixPath = path.join(__dirname, "..", "test-data", "test-matrix.csv");
const validPriorities = new Set(["P1", "P2", "P3"]);
let matrixCache;

function loadMatrix() {
  if (!matrixCache) {
    const contents = fs.readFileSync(matrixPath, "utf8");
    matrixCache = parse(contents, {
      bom: true,
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const expectedColumns = ["id", "name", "description", "priority", "area", "file"];
    const actualColumns = Object.keys(matrixCache[0] || {});
    if (actualColumns.join(",") !== expectedColumns.join(",")) {
      throw new Error(
        `Invalid test matrix header in ${matrixPath}. Expected: ${expectedColumns.join(",")}`,
      );
    }

    for (const row of matrixCache) {
      if (!validPriorities.has(row.priority)) {
        throw new Error(
          `Invalid priority "${row.priority}" for ${row.id || "row without id"} in ` +
          `${matrixPath}; use P1, P2, or P3.`,
        );
      }
    }
  }

  return matrixCache;
}

function getTestMeta(id) {
  const row = loadMatrix().find(test => test.id === id);
  if (!row) {
    throw new Error(`Test matrix is missing ${id}. Add a row to test-data/test-matrix.csv.`);
  }
  return row;
}

function getTags(id) {
  const { priority, area } = getTestMeta(id);
  return [`@${priority}`, `@${area.toLowerCase()}`];
}

module.exports = { getTags, getTestMeta, loadMatrix };
