#!/usr/bin/env node
/**
 * Downloads pinned Pyodide runtime files into public/pyodide/ so the admin
 * Sage AI chat can run Python code blocks same-origin (no CDN dependency at
 * request time, better CSP story, and we can pin a known-good version).
 *
 * Idempotent: skips downloads if files already exist. Runs as a postinstall
 * hook and before `next build`.
 *
 * To upgrade Pyodide: bump PYODIDE_VERSION below and delete public/pyodide/.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

// Keep in sync with lib/sage-ai/pyodide/pyodide-version.ts (PYODIDE_VERSION).
const PYODIDE_VERSION = '0.26.4';
const BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const PUBLIC_DIR = path.join(__dirname, '..', 'public', 'pyodide');

// Core runtime + packages we actually load (micropip bootstraps the rest at
// runtime). This list intentionally mirrors the packages the usePyodide hook
// requests. If usePyodide adds a new package, add it here too.
const FILES = [
  'pyodide.js',
  'pyodide.asm.js',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
  'package.json',
];

function download(file) {
  return new Promise((resolve, reject) => {
    const dest = path.join(PUBLIC_DIR, file);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      return resolve({ file, skipped: true });
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const tmp = `${dest}.part`;
    const stream = fs.createWriteStream(tmp);
    https
      .get(`${BASE_URL}${file}`, (res) => {
        if (res.statusCode !== 200) {
          stream.close();
          fs.unlinkSync(tmp);
          return reject(new Error(`GET ${file} -> ${res.statusCode}`));
        }
        res.pipe(stream);
        stream.on('finish', () => {
          stream.close(() => {
            fs.renameSync(tmp, dest);
            resolve({ file, skipped: false });
          });
        });
      })
      .on('error', (err) => {
        stream.close();
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
        reject(err);
      });
  });
}

async function main() {
  if (process.env.SKIP_PYODIDE_DOWNLOAD === '1') {
    console.log('pyodide: SKIP_PYODIDE_DOWNLOAD=1, skipping');
    return;
  }

  const offline = process.env.CI_OFFLINE === '1' || process.env.npm_config_offline === 'true';
  if (offline) {
    console.log('pyodide: offline mode, skipping download');
    return;
  }

  fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  try {
    const results = await Promise.all(FILES.map(download));
    const downloaded = results.filter((r) => !r.skipped).length;
    const skipped = results.filter((r) => r.skipped).length;
    console.log(
      `pyodide v${PYODIDE_VERSION}: downloaded ${downloaded} file(s), skipped ${skipped} (already present)`
    );
  } catch (err) {
    console.warn(
      `pyodide: download failed (${err.message}); will fall back to CDN at runtime if files are missing`
    );
  }
}

main();
