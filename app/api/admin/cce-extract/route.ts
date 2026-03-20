/**
 * API Route: Trigger CCE PDF extraction
 * POST /api/admin/cce-extract
 *
 * Spawns the Python extraction script. Body: { pdfPath?: string, incremental?: boolean }
 * If pdfPath omitted, uses CCE_PDF_PATH or local_data/CCE_March_2026.pdf
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

import { withAdminAuth } from '@/lib/require-admin-auth';

export const dynamic = 'force-dynamic';

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    let pdfPath: string | null = null;
    let incremental = false;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => ({}));
      pdfPath = body.pdfPath ?? body.pdf_path ?? null;
      incremental = !!body.incremental;
    }

    const base = resolve(process.cwd());
    const defaultPath =
      process.env.CCE_PDF_PATH ||
      resolve(base, 'local_data', 'CCE_March_2026.pdf');

    const finalPath = pdfPath
      ? (pdfPath.startsWith('/') ? pdfPath : resolve(base, pdfPath))
      : defaultPath;

    if (!existsSync(finalPath)) {
      return NextResponse.json(
        { error: `PDF not found: ${finalPath}` },
        { status: 404 }
      );
    }

    const scriptPath = resolve(base, 'scripts', 'extract-cce-pdf.py');
    if (!existsSync(scriptPath)) {
      return NextResponse.json(
        { error: 'Extraction script not found' },
        { status: 500 }
      );
    }

    const args = ['--pdf', finalPath];
    if (incremental) args.push('--incremental');
    // Clear before insert so the UI shows only the new extraction (replaces Feb with Mar data)
    args.push('--clear-first');
    args.push('--clear-cce-cost-percentages');
    args.push('--clear-cce-component-costs');

    return new Promise<NextResponse>((resolvePromise) => {
      const proc = spawn('python3', [scriptPath, ...args], {
        cwd: base,
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
      });

      const stdout: string[] = [];
      const stderr: string[] = [];

      proc.stdout?.on('data', (d) => stdout.push(d.toString()));
      proc.stderr?.on('data', (d) => stderr.push(d.toString()));

      proc.on('close', (code) => {
        const out = stdout.join('').trim();
        const err = stderr.join('').trim();
        if (code === 0) {
          resolvePromise(
            NextResponse.json({
              success: true,
              message: 'Extraction completed',
              output: out || undefined,
            })
          );
        } else {
          resolvePromise(
            NextResponse.json(
              {
                success: false,
                error: err || out || `Process exited with code ${code}`,
                output: out,
              },
              { status: 500 }
            )
          );
        }
      });

      proc.on('error', (err) => {
        resolvePromise(
          NextResponse.json(
            { success: false, error: String(err.message) },
            { status: 500 }
          )
        );
      });
    });
  } catch (err) {
    console.error('[cce-extract] Error:', err);
    return NextResponse.json(
      { error: 'Failed to run extraction' },
      { status: 500 }
    );
  }
}, { requireRole: 'admin' });
