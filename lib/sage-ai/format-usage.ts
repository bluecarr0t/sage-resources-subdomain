/** Compact token display for admin UI (e.g. 12400 → "12.4k"). */
export function formatTokenCount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n < 1000) return String(Math.round(n));
  if (n < 1_000_000) {
    const k = n / 1000;
    return k >= 100 ? `${Math.round(k)}k` : `${k.toFixed(1).replace(/\.0$/, '')}k`;
  }
  const m = n / 1_000_000;
  return `${m.toFixed(1).replace(/\.0$/, '')}M`;
}

/** Short model label for footer (strip gateway path noise). */
export function formatSageAiModelLabel(model: string | null | undefined): string {
  if (!model) return '—';
  const slash = model.lastIndexOf('/');
  return slash >= 0 ? model.slice(slash + 1) : model;
}
