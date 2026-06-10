export default function SageAiLoading() {
  return (
    <div className="flex h-full min-h-[320px] items-center justify-center bg-white dark:bg-neutral-950">
      <div className="flex flex-col items-center gap-3 text-center px-6">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-sage-200 border-t-sage-600 dark:border-sage-800 dark:border-t-sage-400"
          aria-hidden
        />
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading Sage AI…</p>
      </div>
    </div>
  );
}
