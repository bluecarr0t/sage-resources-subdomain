#!/usr/bin/env node
/**
 * Ensures templates/market-report/template.docx exists before build (Vercel / CI).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const templatePath = path.join(process.cwd(), 'templates', 'market-report', 'template.docx');

if (fs.existsSync(templatePath)) {
  process.exit(0);
}

console.log('Market Report: template.docx missing, generating...');
const result = spawnSync('npx', ['tsx', 'scripts/create-market-report-template.ts'], {
  stdio: 'inherit',
  cwd: process.cwd(),
});

if (result.status !== 0) {
  console.error('Failed to create market report template.');
  process.exit(1);
}
