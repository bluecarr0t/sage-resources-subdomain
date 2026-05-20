import Link from 'next/link';
import {
  EDITORIAL_BODY_CLASS,
  EDITORIAL_BUTTON_OUTLINE_CLASS,
  EDITORIAL_H2_CLASS,
} from '@/components/editorial/EditorialPageShell';

type EditorialCtaBandProps = {
  title: string;
  description: string;
  buttonLabel: string;
  buttonHref: string;
  external?: boolean;
};

export function EditorialCtaBand({
  title,
  description,
  buttonLabel,
  buttonHref,
  external = false,
}: EditorialCtaBandProps) {
  const linkClass = `${EDITORIAL_BUTTON_OUTLINE_CLASS} mt-6`;
  return (
    <section className="mt-16 border border-sage-200/90 bg-white/40 px-6 py-10 sm:px-8">
      <h2 className={EDITORIAL_H2_CLASS}>{title}</h2>
      <p className={`mt-4 max-w-xl ${EDITORIAL_BODY_CLASS}`}>{description}</p>
      {external ? (
        <a
          href={buttonHref}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          {buttonLabel}
        </a>
      ) : (
        <Link href={buttonHref} className={linkClass}>
          {buttonLabel}
        </Link>
      )}
    </section>
  );
}
