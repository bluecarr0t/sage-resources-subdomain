'use client';

import { useState, useRef, useCallback } from 'react';
import { Button, Card } from '@/components/ui';
import { UploadCloud, FileText, CheckCircle, XCircle, Loader2, Trash2, RotateCcw } from 'lucide-react';
import type { UploadResult } from '@/lib/types/feasibility';

const MAX_FILES = 10;
const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface QueuedFile {
  file: File;
  id: string;
  studyId: string;
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

export default function UploadComparablesPage() {
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingPhase, setProcessingPhase] = useState(false);
  const [results, setResults] = useState<UploadResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const xlsxFiles = Array.from(fileList).filter(
      (f) => f.name.toLowerCase().endsWith('.xlsx')
    );
    if (xlsxFiles.length === 0) {
      setError('Only .xlsx files are accepted');
      return;
    }

    const oversized = xlsxFiles.filter((f) => f.size > MAX_FILE_SIZE_BYTES);
    if (oversized.length > 0) {
      setError(
        `File(s) exceed ${MAX_FILE_SIZE_MB} MB limit: ${oversized.map((f) => f.name).join(', ')}. Large files may cause timeouts.`
      );
      return;
    }

    setQueuedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.file.name));
      const existingStudyIds = new Set(prev.map((f) => f.studyId));
      const newFiles: QueuedFile[] = [];
      const skipped: string[] = [];

      for (const f of xlsxFiles) {
        const studyId = extractStudyIdPreview(f.name);
        if (existingNames.has(f.name)) {
          skipped.push(`${f.name} (already in queue)`);
          continue;
        }
        if (existingStudyIds.has(studyId)) {
          skipped.push(`${f.name} (study ${studyId} already queued)`);
          continue;
        }
        newFiles.push({
          file: f,
          id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          studyId,
        });
        existingNames.add(f.name);
        existingStudyIds.add(studyId);
      }

      const combined = [...prev, ...newFiles];
      if (combined.length > MAX_FILES) {
        setError(`Maximum ${MAX_FILES} files per batch. ${combined.length - MAX_FILES} file(s) removed.`);
        setInfo(null);
        return combined.slice(0, MAX_FILES);
      }
      if (skipped.length > 0) {
        setInfo(`Skipped ${skipped.length} duplicate(s): ${skipped.join('; ')}`);
        setError(null);
      } else {
        setInfo(null);
        setError(null);
      }
      return combined;
    });
    setResults(null);
  }, []);

  const removeFile = (id: string) => {
    setQueuedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAll = () => {
    setQueuedFiles([]);
    setResults(null);
    setError(null);
    setInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleUpload = async () => {
    if (queuedFiles.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    setInfo(null);
    setResults(null);

    try {
      const fd = new FormData();
      queuedFiles.forEach((qf) => fd.append('files', qf.file));

      const data = await new Promise<{ results?: UploadResult[]; message?: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 70);
            setUploadProgress(pct);
          } else {
            setUploadProgress((prev) => Math.min(70, prev + 5));
          }
        });

        xhr.addEventListener('load', () => {
          setProcessingPhase(true);
          let p = 70;
          const interval = setInterval(() => {
            p = Math.min(95, p + 2);
            setUploadProgress(p);
          }, 200);
          setTimeout(() => {
            clearInterval(interval);
            setUploadProgress(100);
          }, 1500);
          try {
            const json = JSON.parse(xhr.responseText || '{}');
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(json);
            } else {
              reject(new Error(json.message || 'Upload failed'));
            }
          } catch {
            reject(new Error('Invalid response'));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        xhr.open('POST', '/api/admin/comparables/upload');
        xhr.send(fd);
      });

      setResults(data.results || []);
      if (data.results?.every((r: UploadResult) => r.success)) {
        setQueuedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
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
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Upload Feasibility Studies
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Upload complete .xlsx workbooks (up to {MAX_FILES} at a time).
            All sheets are automatically extracted: Comps, Best Comps, Pro Forma,
            Financing, IRR, Development Costs, Rate &amp; Occupancy Projections,
            Market Profile, and more.
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
                <div
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    {r.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                    )}
                    <span className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-xs">
                      {r.filename}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      ({r.study_id})
                    </span>
                  </div>
                  {r.success ? (
                    <span className="text-gray-600 dark:text-gray-400 text-xs flex items-center gap-2 flex-wrap justify-end">
                      <span className="px-1.5 py-0.5 bg-sage-100 dark:bg-sage-800 rounded text-[10px] font-medium">
                        {r.sheets_processed} sheets
                      </span>
                      {(r.comparables_count ?? 0) > 0 && `${r.comparables_count} comps`}
                      {(r.units_count ?? 0) > 0 && `, ${r.units_count} units`}
                      {(r.summaries_count ?? 0) > 0 && `, ${r.summaries_count} summaries`}
                      {(r.property_scores_count ?? 0) > 0 && `, ${r.property_scores_count} scores`}
                      {(r.pro_forma_units_count ?? 0) > 0 && `, ${r.pro_forma_units_count} PF units`}
                      {r.has_valuation && ', valuation'}
                      {r.has_financing && ', financing'}
                      {(r.dev_costs_count ?? 0) > 0 && `, ${r.dev_costs_count} cost items`}
                      {(r.rate_projections_count ?? 0) > 0 && `, ${r.rate_projections_count} rate proj`}
                      {(r.occ_projections_count ?? 0) > 0 && `, ${r.occ_projections_count} occ proj`}
                      {(r.market_data_count ?? 0) > 0 && `, ${r.market_data_count} market areas`}
                    </span>
                  ) : (
                    <span
                      className="text-red-600 dark:text-red-400 text-xs break-words max-w-md"
                      title={r.error}
                    >
                      {r.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Card>
          <div className="space-y-6">
            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
                dragActive
                  ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-sage-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              <UploadCloud className={`w-12 h-12 mx-auto mb-4 ${
                dragActive ? 'text-sage-500' : 'text-gray-400 dark:text-gray-500'
              }`} />
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">
                {dragActive ? 'Drop .xlsx files here' : 'Drag & drop .xlsx workbooks here'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                or click to browse (max {MAX_FILES} files, {MAX_FILE_SIZE_MB} MB each, one workbook per study)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                }}
              />
            </div>

            {/* Queued files list */}
            {queuedFiles.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Queued Files ({queuedFiles.length}/{MAX_FILES})
                  </h3>
                  <button
                    onClick={clearAll}
                    className="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  {queuedFiles.map((qf) => (
                    <div
                      key={qf.id}
                      className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900/50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-5 h-5 text-sage-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                            {qf.file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Study ID: {qf.studyId} &middot; {formatBytes(qf.file.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(qf.id)}
                        className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        disabled={uploading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress bar */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>
                    {uploadProgress < 70 ? 'Uploading...' : uploadProgress < 100 ? 'Processing...' : 'Complete'}
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
                  Uploading {queuedFiles.length} file{queuedFiles.length !== 1 ? 's' : ''}...
                </span>
              ) : (
                `Upload ${queuedFiles.length} file${queuedFiles.length !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
