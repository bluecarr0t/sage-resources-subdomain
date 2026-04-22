'use client';

import { useSyncExternalStore } from 'react';

const activeControllers = new Set<AbortController>();
let runCount = 0;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

/** Avoid notifying React inline while a Python run is being set up; prevents sync re-renders in the same stack as `track` / `untrack` (useSyncExternalStore + setState in children). */
function notifyAfterCurrentTask() {
  queueMicrotask(notify);
}

/**
 * While a `PythonCodeBlock` run is in progress, register the AbortController
 * so the global Stop button can abort it even after the chat stream has finished.
 */
export function trackPythonBlockRun(abort: AbortController): () => void {
  activeControllers.add(abort);
  runCount += 1;
  notifyAfterCurrentTask();
  return () => {
    activeControllers.delete(abort);
    runCount = Math.max(0, runCount - 1);
    notifyAfterCurrentTask();
  };
}

function subscribe(notifySelf: () => void) {
  listeners.add(notifySelf);
  return () => listeners.delete(notifySelf);
}

export function useAnyPythonBlockRunActive(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => runCount > 0,
    () => false
  );
}

/**
 * Aborts all in-flight Python runs (load + user code) for every mounted block.
 * Safe to call when stopping the chat; idempotent.
 */
export function abortAllPythonBlockRuns(): void {
  for (const ac of activeControllers) {
    try {
      ac.abort();
    } catch {
      // ignore
    }
  }
}
