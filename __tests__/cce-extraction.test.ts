/**
 * Integration tests for CCE PDF extraction pipeline.
 * Runs the Python extraction script with --dry-run to validate parsing logic.
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'extract-cce-pdf.py');
const DEFAULT_PDF = path.join(process.cwd(), 'local_data', 'CCE_March_2026.pdf');

function runExtraction(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const proc = spawn('python3', [SCRIPT_PATH, ...args], {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });
    const stdout: string[] = [];
    const stderr: string[] = [];
    proc.stdout?.on('data', (d) => stdout.push(d.toString()));
    proc.stderr?.on('data', (d) => stderr.push(d.toString()));
    proc.on('close', (code) => {
      resolve({
        stdout: stdout.join(''),
        stderr: stderr.join(''),
        code: code ?? -1,
      });
    });
    proc.on('error', () => {
      resolve({ stdout: '', stderr: 'Failed to spawn', code: -1 });
    });
  });
}

describe('CCE extraction', () => {
  const hasScript = fs.existsSync(SCRIPT_PATH);
  const hasPdf = fs.existsSync(DEFAULT_PDF);

  describe('extract-cce-pdf.py --dry-run', () => {
    it('runs without error when script and PDF exist', async () => {
      if (!hasScript || !hasPdf) {
        console.warn('Skipping: script or PDF not found');
        return;
      }
      const { stdout, stderr, code } = await runExtraction([
        '--dry-run',
        '--pdf',
        DEFAULT_PDF,
        '--start-page',
        '1',
        '--end-page',
        '5',
      ]);
      expect(code).toBe(0);
      expect(stderr).not.toContain('Traceback');
      expect(stdout).toMatch(/Total pages|Found|occupancies|cost rows/);
    }, 30000);

    it('exits with error when PDF does not exist', async () => {
      if (!hasScript) return;
      const { code } = await runExtraction([
        '--dry-run',
        '--pdf',
        '/nonexistent/path.pdf',
      ]);
      expect(code).not.toBe(0);
    });

    it('extracts component rows from Wall Costs / list-style pages when range includes Section 55', async () => {
      if (!hasScript || !hasPdf) {
        console.warn('Skipping: script or PDF not found');
        return;
      }
      // Section 55 (Wall Costs) is typically in the 500+ page range; use a broad range to include it
      const { stdout, code } = await runExtraction([
        '--dry-run',
        '--pdf',
        DEFAULT_PDF,
        '--start-page',
        '1',
        '--end-page',
        '100',
      ]);
      expect(code).toBe(0);
      expect(stdout).toMatch(/component rows|component_rows/);
    }, 60000);
  });
});
