#!/usr/bin/env npx tsx
/**
 * Opens the local OAuth sync UI (dev server must be running on :3003).
 *
 *   npm run dev
 *   npm run sync:project-pipeline:oauth
 */

import { exec } from 'child_process';

const url = 'http://localhost:3003/pipeline-oauth-sync';
const command =
  process.platform === 'darwin'
    ? `open "${url}"`
    : process.platform === 'win32'
      ? `start "" "${url}"`
      : `xdg-open "${url}"`;

console.log(`Opening ${url}`);
console.log('Click "Authorize & Sync 2026 Jobs" and sign in with Google when prompted.');

exec(command, (error) => {
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
});
