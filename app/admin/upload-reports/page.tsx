'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { Button, Card } from '@/components/ui';

import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Link as LinkIcon,
} from 'lucide-react';
import Link from 'next/link';

const MAX_FILES = 20;
const MAX_XLSX_SIZE_MB = 50;
const MAX_DOCX_SIZE_MB = 100;
const MAX_XLSX_SIZE_BYTES = MAX_XLSX_SIZE_MB * 1024 * 1024;
const MAX_DOCX_SIZE_BYTES = MAX_DOCX_SIZE_MB * 1024 * 1024;

interface QueuedFile {
  file: File;
  id: string;
  studyId: string;
  type: 'xlsx' | 'docx';
}

interface StudyPair {
  studyId: string;
  xlsx: QueuedFile | null;
  docx: QueuedFile | null;
}

interface UploadResult {
  study_id: string;
  success: boolean;
  xlsx_processed: boolean;
  docx_processed: boolean;
  error?: string;
  warnings?: string[];
}

function extractStudyIdPreview(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '');
  const match = base.match(/^(\d{2}-\d{3}[A-Z]?-\d{2})/);
  return match ? match[1] : base.slice(0, 30);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileType(name: string): 'xlsx' | 'docx' | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xlsm') || lower.endsWith('.xlsxm')) return 'xlsx';
  if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'docx';
  return null;
}

function uploadFileToStorage(
  signedUrl: string,
  file: File,
  contentType: string,
  onProgress: (loaded: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.setRequestHeader('Cache-Control', 'max-age=3600');

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(e.loaded);
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        const body = xhr.responseText;
        console.error(`[upload] ${xhr.status} for ${file.name}:`, body);
        reject(new Error(`Storage upload failed (${xhr.status}): ${body}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Storage upload network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    // Use Blob with explicit type - browser may override Content-Type when sending raw File
    const blob = new Blob([file], { type: contentType });
    xhr.send(blob);
  });
}

export default function UploadReportsPage() {
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingPhase, setProcessingPhase] = useState(false);
  const [results, setResults] = useState<UploadResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [dragActiveXlsx, setDragActiveXlsx] = useState(false);
  const [dragActiveDocx, setDragActiveDocx] = useState(false);
  const xlsxInputRef = useRef<HTMLInputElement>(null);
  const docxInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((fileList: FileList | File[], expectedType?: 'xlsx' | 'docx') => {
    const newFiles: QueuedFile[] = [];
    const rejected: string[] = [];
    const oversized: string[] = [];

    for (const f of Array.from(fileList)) {
      const ft = getFileType(f.name);
      if (!ft) {
        rejected.push(f.name);
        continue;
      }
      if (expectedType && ft !== expectedType) {
        rejected.push(`${f.name} (expected .${expectedType})`);
        continue;
      }
      const maxBytes = ft === 'docx' ? MAX_DOCX_SIZE_BYTES : MAX_XLSX_SIZE_BYTES;
      if (f.size > maxBytes) {
        oversized.push(f.name);
        continue;
      }

      newFiles.push({
        file: f,
        id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        studyId: extractStudyIdPreview(f.name),
        type: ft,
      });
    }

    if (rejected.length > 0) {
      setError(`Unsupported file(s): ${rejected.join(', ')}. Only .xlsx, .xlsm, .xlsxm and .docx files are accepted.`);
      return;
    }
    if (oversized.length > 0) {
      setError(`File(s) exceed size limit (XLSX: ${MAX_XLSX_SIZE_MB} MB, DOCX: ${MAX_DOCX_SIZE_MB} MB): ${oversized.join(', ')}`);
      return;
    }

    setQueuedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.file.name));
      const filtered = newFiles.filter((f) => {
        if (existingNames.has(f.file.name)) return false;
        const sameStudySameType = prev.find(
          (p) => p.studyId === f.studyId && p.type === f.type
        );
        return !sameStudySameType;
      });

      const combined = [...prev, ...filtered];
      if (combined.length > MAX_FILES) {
        setError(`Maximum ${MAX_FILES} files per batch.`);
        return combined.slice(0, MAX_FILES);
      }
      setError(null);
      return combined;
    });
    setResults(null);
    setInfo(null);
  }, []);

  const removeFile = (id: string) => {
    setQueuedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAll = () => {
    setQueuedFiles([]);
    setResults(null);
    setError(null);
    setInfo(null);
    if (xlsxInputRef.current) xlsxInputRef.current.value = '';
    if (docxInputRef.current) docxInputRef.current.value = '';
  };

  const handleDrop = useCallback(
    (e: React.DragEvent, expectedType: 'xlsx' | 'docx') => {
      e.preventDefault();
      if (expectedType === 'xlsx') setDragActiveXlsx(false);
      else setDragActiveDocx(false);
      if (e.dataTransfer.files) addFiles(e.dataTransfer.files, expectedType);
    },
    [addFiles]
  );

  const studyPairs = useMemo((): StudyPair[] => {
    const map = new Map<string, StudyPair>();
    for (const qf of queuedFiles) {
      const pair = map.get(qf.studyId) || { studyId: qf.studyId, xlsx: null, docx: null };
      if (qf.type === 'xlsx') pair.xlsx = qf;
      else pair.docx = qf;
      map.set(qf.studyId, pair);
    }
    return Array.from(map.values());
  }, [queuedFiles]);

  const handleUpload = async () => {
    if (queuedFiles.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    setProcessingPhase(false);
    setError(null);
    setInfo(null);
    setResults(null);

    try {
      // Phase 1: Get signed upload URLs (small JSON request)
      const presignRes = await fetch('/api/admin/reports/presign-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          files: queuedFiles.map((qf) => ({ name: qf.file.name, size: qf.file.size })),
        }),
      });

      const presignData = await presignRes.json();
      if (!presignRes.ok || !presignData.success) {
        throw new Error(presignData.message || 'Failed to prepare upload');
      }

      const { uploads } = presignData as {
        batchId: string;
        uploads: Array<{ name: string; storagePath: string; signedUrl: string; token: string; contentType: string }>;
      };

      // Phase 2: Upload files directly to Supabase Storage (bypasses Vercel 4.5MB limit)
      const totalBytes = queuedFiles.reduce((sum, qf) => sum + qf.file.size, 0);
      let completedBytes = 0;

      for (const upload of uploads) {
        const qf = queuedFiles.find((f) => f.file.name === upload.name);
        if (!qf) continue;

        await uploadFileToStorage(upload.signedUrl, qf.file, upload.contentType, (loaded) => {
          const pct = Math.round(((completedBytes + loaded) / totalBytes) * 75);
          setUploadProgress(pct);
        });

        completedBytes += qf.file.size;
      }

      setUploadProgress(75);
      setProcessingPhase(true);

      // Phase 3: Process uploaded files (small JSON request, no file data)
      const processRes = await fetch('/api/admin/reports/unified-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          files: uploads.map((u) => ({ name: u.name, storagePath: u.storagePath })),
        }),
      });

      const text = await processRes.text();
      let data: { results?: UploadResult[]; message?: string };
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          processRes.status === 413
            ? 'Request too large. Please try uploading fewer or smaller files.'
            : `Invalid response: ${text.slice(0, 60)}...`
        );
      }

      if (!processRes.ok && !data.results) {
        throw new Error(data.message || 'Processing failed');
      }

      setUploadProgress(100);
      setResults(data.results || []);

      if (data.results?.every((r: UploadResult) => r.success)) {
        setQueuedFiles([]);
        if (xlsxInputRef.current) xlsxInputRef.current.value = '';
        if (docxInputRef.current) docxInputRef.current.value = '';
      } else if (data.results) {
        const failedStudyIds = new Set(
          data.results.filter((r: UploadResult) => !r.success).map((r: UploadResult) => r.study_id)
        );
        setQueuedFiles((prev) => prev.filter((qf) => failedStudyIds.has(qf.studyId)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setProcessingPhase(false);
    }
  };

  const successCount = results?.filter((r) => r.success).length ?? 0;
  const failCount = results ? results.length - successCount : 0;

  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Upload Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Upload paired .xlsx/.xlsm/.xlsxm workbooks and .docx report files per feasibility study.
            Files are automatically matched by job number from the filename.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        {info && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-lg">
            {info}
          </div>
        )}

        {/* Upload Results */}
        {results && (
          <div className={`mb-6 p-4 rounded-lg border ${
            failCount === 0
              ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'
              : 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Upload Results: {successCount} succeeded, {failCount} failed
              </h3>
              {failCount > 0 && queuedFiles.length > 0 && (
                <Button variant="secondary" size="sm" onClick={handleUpload} className="flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4" />
                  Retry failed
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {r.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                      )}
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {r.study_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {r.success ? (
                        <>
                          <span className="text-gray-600 dark:text-gray-400 text-xs flex items-center gap-2">
                            {r.xlsx_processed && (
                              <span className="px-1.5 py-0.5 bg-sage-100 dark:bg-sage-800 rounded text-[10px] font-medium">
                                XLSX
                              </span>
                            )}
                            {r.docx_processed && (
                              <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-[10px] font-medium">
                                DOCX
                              </span>
                            )}
                          </span>
                          <Link
                            href={`/admin/reports/${r.study_id}`}
                            className="text-sage-600 dark:text-sage-400 hover:underline text-xs flex items-center gap-1"
                          >
                            <LinkIcon className="w-3 h-3" /> View
                          </Link>
                        </>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 text-xs max-w-md truncate" title={r.error}>
                          {r.error}
                        </span>
                      )}
                    </div>
                  </div>
                  {r.warnings && r.warnings.length > 0 && (
                    <ul className="text-amber-700 dark:text-amber-400 text-xs pl-6 space-y-0.5" title="Extraction warnings">
                      {r.warnings.slice(0, 3).map((w, wi) => (
                        <li key={wi} className="truncate max-w-md" title={w}>{w}</li>
                      ))}
                      {r.warnings.length > 3 && (
                        <li className="text-amber-600 dark:text-amber-500">+{r.warnings.length - 3} more</li>
                      )}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Two drop zones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* XLSX Drop Zone */}
          <Card>
            <div
              onDrop={(e) => handleDrop(e, 'xlsx')}
              onDragOver={(e) => { e.preventDefault(); setDragActiveXlsx(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragActiveXlsx(false); }}
              onClick={() => xlsxInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                dragActiveXlsx
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                  : 'border-amber-400 dark:border-amber-500 bg-amber-50/50 dark:bg-amber-900/10 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
              }`}
            >
              <FileSpreadsheet className={`w-10 h-10 mx-auto mb-3 ${
                dragActiveXlsx ? 'text-amber-600 dark:text-amber-400' : 'text-amber-600 dark:text-amber-400'
              }`} />
              <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-1">
                {dragActiveXlsx ? 'Drop .xlsx/.xlsm files here' : '.xlsx/.xlsm Workbooks'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Financial data, comparables, pro forma
              </p>
              <input
                ref={xlsxInputRef}
                type="file"
                accept=".xlsx,.xlsm,.xlsxm"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files, 'xlsx');
                }}
              />
            </div>
          </Card>

          {/* DOCX Drop Zone */}
          <Card>
            <div
              onDrop={(e) => handleDrop(e, 'docx')}
              onDragOver={(e) => { e.preventDefault(); setDragActiveDocx(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragActiveDocx(false); }}
              onClick={() => docxInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                dragActiveDocx
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                  : 'border-amber-400 dark:border-amber-500 bg-amber-50/50 dark:bg-amber-900/10 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
              }`}
            >
              <FileText className={`w-10 h-10 mx-auto mb-3 ${
                dragActiveDocx ? 'text-amber-600 dark:text-amber-400' : 'text-amber-600 dark:text-amber-400'
              }`} />
              <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-1">
                {dragActiveDocx ? 'Drop .docx files here' : '.docx/.doc Reports'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Narrative report, executive summary, SWOT
              </p>
              <input
                ref={docxInputRef}
                type="file"
                accept=".docx,.doc"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files, 'docx');
                }}
              />
            </div>
          </Card>
        </div>

        {/* Paired Studies Table */}
        {studyPairs.length > 0 && (
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Paired Jobs ({studyPairs.length})
              </h3>
              <button
                onClick={clearAll}
                className="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Job Number
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      XLSX
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      DOCX
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {studyPairs.map((pair) => {
                    const hasBoth = !!pair.xlsx && !!pair.docx;
                    return (
                      <tr key={pair.studyId} className="bg-white dark:bg-gray-800">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                          {pair.studyId}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {pair.xlsx ? (
                            <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[140px]" title={pair.xlsx.file.name}>
                                {formatBytes(pair.xlsx.file.size)}
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-xs">Missing</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {pair.docx ? (
                            <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[140px]" title={pair.docx.file.name}>
                                {formatBytes(pair.docx.file.size)}
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-xs">Missing</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {hasBoth ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                              Paired
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                              <AlertTriangle className="w-3 h-3" />
                              Partial
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {pair.xlsx && (
                              <button
                                onClick={() => removeFile(pair.xlsx!.id)}
                                className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                                title="Remove XLSX"
                                disabled={uploading}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {pair.docx && (
                              <button
                                onClick={() => removeFile(pair.docx!.id)}
                                className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                                title="Remove DOCX"
                                disabled={uploading}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Progress bar */}
        {uploading && (
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>
                {uploadProgress < 75
                  ? 'Uploading files...'
                  : uploadProgress < 100
                  ? 'Processing & extracting data...'
                  : 'Complete'}
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-sage-500 transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Upload button */}
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={uploading || queuedFiles.length === 0}
          onClick={handleUpload}
        >
          {uploading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing {studyPairs.length} {studyPairs.length === 1 ? 'job' : 'jobs'}...
            </span>
          ) : (
            `Upload ${studyPairs.length} ${studyPairs.length === 1 ? 'job' : 'jobs'} (${queuedFiles.length} ${queuedFiles.length === 1 ? 'file' : 'files'})`
          )}
        </Button>
      </div>
    </main>
  );
}
