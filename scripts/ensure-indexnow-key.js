#!/usr/bin/env node
/**
 * Ensures IndexNow key file exists in public/ for Bing/Copilot verification.
 * Run before build when INDEXNOW_KEY env var is set.
 * Generate key: openssl rand -hex 16
 */
const fs = require('fs');
const path = require('path');

const key = process.env.INDEXNOW_KEY;
if (!key) {
  console.log('IndexNow: INDEXNOW_KEY not set, skipping key file creation');
  process.exit(0);
}

// Key must be 8-128 hex chars (a-z, 0-9, A-Z, -)
const validKey = /^[a-fA-F0-9-]{8,128}$/.test(key);
if (!validKey) {
  console.warn('IndexNow: KEY must be 8-128 hexadecimal characters (a-f, 0-9, -)');
  process.exit(0);
}

const publicDir = path.join(process.cwd(), 'public');
const keyPath = path.join(publicDir, `${key}.txt`);

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(keyPath, key, 'utf8');
console.log(`IndexNow: Key file written to public/${key}.txt`);
