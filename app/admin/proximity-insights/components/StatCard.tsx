'use client';

export function StatCard({
  label,
  value,
  icon: Icon,
  tooltip,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tooltip?: string;
}) {
  return (
    <div
      className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl"
      title={tooltip}
    >
      <div className="p-2 bg-sage-50 dark:bg-sage-900/30 rounded-lg">
        <Icon className="w-5 h-5 text-sage-600 dark:text-sage-400" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}
