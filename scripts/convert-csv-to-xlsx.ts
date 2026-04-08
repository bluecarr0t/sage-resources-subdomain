#!/usr/bin/env npx tsx
/**
 * Convert a CSV file to .xlsx (first sheet, all rows).
 *
 * Usage:
 *   npx tsx scripts/convert-csv-to-xlsx.ts [input.csv] [output.xlsx]
 *
 * Defaults:
 *   csv/glamping-and-roverpass-unified.csv → csv/glamping-and-roverpass-unified.xlsx
 */

import { resolve } from 'path';
import * as XLSX from 'xlsx';

const cwd = process.cwd();
const defaultIn = resolve(cwd, 'csv/glamping-and-roverpass-unified.csv');
const defaultOut = resolve(cwd, 'csv/glamping-and-roverpass-unified.xlsx');

const inputPath = process.argv[2] ? resolve(cwd, process.argv[2]) : defaultIn;
const outputPath = process.argv[3] ? resolve(cwd, process.argv[3]) : defaultOut;

const wb = XLSX.readFile(inputPath, { raw: false, codepage: 65001 });
const firstSheet = wb.SheetNames[0];
if (!firstSheet) {
  console.error('Workbook has no sheets');
  process.exit(1);
}

const newWb = XLSX.utils.book_new();
const ws = wb.Sheets[firstSheet];
XLSX.utils.book_append_sheet(newWb, ws, 'Data');

XLSX.writeFile(newWb, outputPath, { bookType: 'xlsx', compression: true });
console.log(`Wrote ${outputPath}`);
