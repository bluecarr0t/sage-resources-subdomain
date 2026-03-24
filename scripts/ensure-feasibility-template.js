#!/usr/bin/env node
/**
 * Ensures a Report Builder DOCX template exists before build:
 * templates/Development Costs.docx (production / Vercel) or templates/feasibility-draft.docx.
 * Run: npx tsx scripts/create-feasibility-draft-template.ts if missing.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const developmentCostsPath = path.join(process.cwd(), 'templates', 'Development Costs.docx');
const feasibilityDraftPath = path.join(process.cwd(), 'templates', 'feasibility-draft.docx');

if (fs.existsSync(developmentCostsPath) || fs.existsSync(feasibilityDraftPath)) {
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
