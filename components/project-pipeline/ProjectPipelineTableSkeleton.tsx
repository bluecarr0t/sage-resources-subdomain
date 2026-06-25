'use client';

interface ProjectPipelineTableSkeletonProps {
  rowCount?: number;
}

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      className={`h-4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700 ${className ?? ''}`}
      aria-hidden
    />
  );
}

export function ProjectPipelineTableSkeleton({
  rowCount = 10,
}: ProjectPipelineTableSkeletonProps) {
  return (
    <div
      className="admin-surface overflow-x-auto"
      aria-busy="true"
      aria-live="polite"
    >
      <table className="w-full min-w-full table-fixed divide-y divide-neutral-200 dark:divide-neutral-800">
        <colgroup>
          <col className="w-[8.5rem]" />
          <col className="w-[6.75rem]" />
          <col className="w-[11rem]" />
          <col />
          <col className="w-[9rem]" />
          <col className="w-[6.5rem]" />
          <col className="w-[10rem]" />
          <col className="w-[7.5rem]" />
        </colgroup>
        <thead className="admin-table-head">
          <tr>
            {Array.from({ length: 8 }).map((_, index) => (
              <th key={index} className="px-3 py-3">
                <SkeletonBar className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {Array.from({ length: rowCount }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              <td className="px-3 py-3">
                <SkeletonBar className="w-20" />
              </td>
              <td className="px-2 py-3">
                <SkeletonBar className="h-6 w-20 rounded-full" />
              </td>
              <td className="px-3 py-3">
                <SkeletonBar className="w-24" />
              </td>
              <td className="px-3 py-3">
                <SkeletonBar className="w-full max-w-[12rem]" />
              </td>
              <td className="px-3 py-3">
                <SkeletonBar className="w-14" />
              </td>
              <td className="px-3 py-3">
                <SkeletonBar className="w-16" />
              </td>
              <td className="px-3 py-3">
                <SkeletonBar className="w-20" />
              </td>
              <td className="px-3 py-3">
                <SkeletonBar className="h-8 w-full max-w-[7.5rem] rounded-md" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
