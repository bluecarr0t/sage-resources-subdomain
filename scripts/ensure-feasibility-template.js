#!/usr/bin/env node
/**
 * Ensures templates/feasibility-draft.docx exists before build.
 * Run: npx tsx scripts/create-feasibility-draft-template.ts if missing.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const templatePath = path.join(process.cwd(), 'templates', 'feasibility-draft.docx');

if (fs.existsSync(templatePath)) {
  process.exit(0);
}

console.log('Create Report Draft: Template not found, generating...');
const result = spawnSync('npx', ['tsx', 'scripts/create-feasibility-draft-template.ts'], {
  stdio: 'inherit',
  cwd: process.cwd(),
});

if (result.status !== 0) {
  console.error('Failed to create feasibility draft template. Build may fail.');
  process.exit(1);
}
