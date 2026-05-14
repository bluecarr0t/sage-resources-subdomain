// One-shot helper: extract the JSON array embedded in an MCP execute_sql output
// and write it to a CSV. Used to materialize the $300+ national glamping master
// CSV from the agent-tools spill file.
//
// Usage:
//   node scripts/_tmp-mcp-to-csv.mjs <input.txt> <output.csv> [columnsCsv]
//
// If columnsCsv is omitted, columns are inferred from the first JSON row in
// insertion order (matches the SELECT order from execute_sql).

import { readFileSync, writeFileSync } from 'node:fs';

const [, , inputPath, outputPath, columnsArg] = process.argv;
if (!inputPath || !outputPath) {
  console.error('usage: node scripts/_tmp-mcp-to-csv.mjs <input.txt> <output.csv> [colsCsv]');
  process.exit(1);
}

const raw = readFileSync(inputPath, 'utf8');

// MCP spill files are JSON like {"result":"...<untrusted-data>\n[...]\n</untrusted-data>"}.
// Two-step decode: parse the outer JSON, then find the `[...]` array in `.result`.
let inner;
try {
  const outer = JSON.parse(raw);
  if (typeof outer.result !== 'string') {
    console.error('Outer JSON has no string `.result` field.');
    process.exit(2);
  }
  inner = outer.result;
} catch {
  inner = raw;
}
const start = inner.indexOf('[');
const end = inner.lastIndexOf(']');
if (start === -1 || end === -1 || end <= start) {
  console.error('Could not find JSON array in MCP payload.');
  process.exit(2);
}
const jsonText = inner.slice(start, end + 1);

let rows;
try {
  rows = JSON.parse(jsonText);
} catch (e) {
  console.error('Failed to parse JSON:', e.message);
  process.exit(3);
}
if (!Array.isArray(rows)) {
  console.error('Parsed value is not an array.');
  process.exit(4);
}
if (rows.length === 0) {
  writeFileSync(outputPath, '', 'utf8');
  console.log(`Wrote 0 rows to ${outputPath}`);
  process.exit(0);
}

const cols = columnsArg ? columnsArg.split(',') : Object.keys(rows[0]);

function csvEscape(v) {
  if (v == null) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const lines = [cols.join(',')];
for (const row of rows) {
  lines.push(cols.map((c) => csvEscape(row[c])).join(','));
}

writeFileSync(outputPath, lines.join('\n') + '\n', 'utf8');
console.log(`Wrote ${rows.length} rows × ${cols.length} cols to ${outputPath}`);
