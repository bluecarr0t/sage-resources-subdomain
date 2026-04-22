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

// Core runtime files always required to bootstrap Pyodide. Package wheels are
// resolved dynamically below from `pyodide-lock.json` so we pull *all* the
// transitive dependencies of the packages the usePyodide hook installs at
// startup (micropip + matplotlib + numpy + pandas). Missing any of those
// wheels would surface to the user as a "ModuleNotFoundError: micropip" tile
// when generate_python_code runs — which is exactly the failure mode this
// script exists to prevent.
const CORE_FILES = [
  'pyodide.js',
  'pyodide.asm.js',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
  'package.json',
];

// Packages explicitly loaded by usePyodide() at startup. Mirror this list with
// the runPythonAsync() bootstrap call in lib/sage-ai/pyodide/use-pyodide.ts.
const RUNTIME_PACKAGES = ['micropip', 'matplotlib', 'numpy', 'pandas'];

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

/**
 * Resolve the transitive closure of wheel filenames for the given top-level
 * packages by walking the `depends` graph from `pyodide-lock.json`. Returns a
 * sorted, de-duplicated list of `file_name` values ready to feed into
 * `download()`.
 */
function resolveRuntimeWheels(lockPath, topLevel) {
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const packages = lock.packages || {};
  const wheels = new Set();
  const visited = new Set();
  const stack = [...topLevel];
  while (stack.length > 0) {
    const name = stack.pop();
    if (visited.has(name)) continue;
    visited.add(name);
    const info = packages[name];
    if (!info || typeof info.file_name !== 'string') {
      // Skip silently: a future Pyodide release may rename or merge a
      // package, and we'd rather fall back to the CDN at runtime than fail
      // the postinstall hook.
      continue;
    }
    wheels.add(info.file_name);
    for (const dep of info.depends || []) {
      if (!visited.has(dep)) stack.push(dep);
    }
  }
  return Array.from(wheels).sort();
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
    const coreResults = await Promise.all(CORE_FILES.map(download));
    const coreDownloaded = coreResults.filter((r) => !r.skipped).length;
    const coreSkipped = coreResults.filter((r) => r.skipped).length;

    let wheelDownloaded = 0;
    let wheelSkipped = 0;
    const lockPath = path.join(PUBLIC_DIR, 'pyodide-lock.json');
    if (fs.existsSync(lockPath)) {
      const wheelFiles = resolveRuntimeWheels(lockPath, RUNTIME_PACKAGES);
      const wheelResults = await Promise.all(wheelFiles.map(download));
      wheelDownloaded = wheelResults.filter((r) => !r.skipped).length;
      wheelSkipped = wheelResults.filter((r) => r.skipped).length;
    }

    console.log(
      `pyodide v${PYODIDE_VERSION}: core downloaded=${coreDownloaded} skipped=${coreSkipped}; ` +
      `wheels downloaded=${wheelDownloaded} skipped=${wheelSkipped}`
    );
  } catch (err) {
    console.warn(
      `pyodide: download failed (${err.message}); will fall back to CDN at runtime if files are missing`
    );
  }
}

main();
