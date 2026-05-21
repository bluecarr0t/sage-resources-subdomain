import { SAGE_CONTENT_AUTHOR_NAME } from '@/lib/sage-content-author';

type ContentAuthorBylineProps = {
  /** ISO date string or YYYY-MM-DD */
  lastUpdated?: string | null;
  className?: string;
};

export default function ContentAuthorByline({
  lastUpdated,
  className = '',
}: ContentAuthorBylineProps) {
  const formattedDate =
    lastUpdated &&
    new Date(lastUpdated).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  return (
    <p
      className={`text-[11px] font-light text-neutral-500 ${className}`.trim()}
      itemProp="author"
    >
      <span className="text-neutral-600">Author:</span>{' '}
      <span className="font-medium text-neutral-700">{SAGE_CONTENT_AUTHOR_NAME}</span>
      {formattedDate ? (
        <>
          <span className="text-neutral-400"> · </span>
          <time dateTime={lastUpdated!}>Last updated {formattedDate}</time>
        </>
      ) : null}
    </p>
  );
}
