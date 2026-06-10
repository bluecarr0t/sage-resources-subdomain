/** Vercel function max duration (seconds). Default 120; override with SAGE_AI_MAX_DURATION. */
export function getSageAiChatMaxDuration(): number {
  const raw = process.env.SAGE_AI_MAX_DURATION;
  if (raw == null || raw === '') return 120;
  const n = Number(raw.replace(/_/g, ''));
  if (!Number.isFinite(n) || n <= 0) return 120;
  return Math.min(Math.floor(n), 300);
}

/** Max tool+model steps per chat turn. Default 10; override with SAGE_AI_MAX_STEPS. */
export function getSageAiChatMaxSteps(): number {
  const raw = process.env.SAGE_AI_MAX_STEPS;
  if (raw == null || raw === '') return 10;
  const n = Number(raw.replace(/_/g, ''));
  if (!Number.isFinite(n) || n <= 0) return 10;
  return Math.min(Math.floor(n), 20);
}

export function isSageAiTimeoutError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('timeout') ||
    m.includes('timed out') ||
    m.includes('aborted') ||
    m.includes('max duration') ||
    m.includes('function_invocation_timeout') ||
    m.includes('504')
  );
}
