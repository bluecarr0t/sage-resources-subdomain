import Link from 'next/link';
import { defaultLocale } from '@/i18n';

type GlossaryEnglishNoticeProps = {
  locale: string;
  message: string;
  linkLabel: string;
};

export function GlossaryEnglishNotice({
  locale,
  message,
  linkLabel,
}: GlossaryEnglishNoticeProps) {
  if (locale === defaultLocale) {
    return null;
  }

  return (
    <div
      role="status"
      className="mb-8 border border-sage-200/90 bg-sage-50/60 px-4 py-3 text-sm font-light leading-relaxed text-neutral-700"
    >
      <p>{message}</p>
      <Link
        href={`/${defaultLocale}/glossary`}
        className="mt-2 inline-block text-[11px] font-medium uppercase tracking-wider text-sage-teal-text underline decoration-sage-200 underline-offset-2 hover:text-sage-teal-text-hover"
      >
        {linkLabel}
      </Link>
    </div>
  );
}
