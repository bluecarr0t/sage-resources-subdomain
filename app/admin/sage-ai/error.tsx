'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function SageAiError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[sage-ai] page error', error);
  }, [error]);

  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4 bg-white px-6 text-center dark:bg-neutral-950">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Sage AI failed to load
      </h1>
      <p className="max-w-md text-sm text-gray-600 dark:text-gray-400">
        {error.message || 'An unexpected error occurred. Try again or start a new chat.'}
      </p>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
