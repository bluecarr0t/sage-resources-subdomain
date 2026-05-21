'use client';

import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/Footer';
import FloatingHeader from '@/components/FloatingHeader';
import {
  EDITORIAL_BUTTON_OUTLINE_CLASS,
  EDITORIAL_BUTTON_PRIMARY_CLASS,
  EDITORIAL_SECTION_LABEL_CLASS,
  EDITORIAL_TOPO_BG_URL,
} from '@/components/editorial/EditorialPageShell';
import { createLocaleLinks } from '@/lib/locale-links';
import type { NotFoundLabels } from '@/components/not-found/not-found-labels';

const NOT_FOUND_CAMPSITE_IMAGE = '/images/404-campsite.png';

type NotFoundPageContentProps = {
  locale: string;
  labels: NotFoundLabels;
};

export default function NotFoundPageContent({ locale, labels }: NotFoundPageContentProps) {
  const links = createLocaleLinks(locale);

  return (
    <>
      <div className="relative grid min-h-screen min-h-[100dvh] min-h-[100svh] grid-rows-[auto_1fr] bg-[#faf9f3] text-neutral-900">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.05]"
          style={{ backgroundImage: `url(${EDITORIAL_TOPO_BG_URL})` }}
          aria-hidden
        />
        <div className="relative z-10">
          <FloatingHeader locale={locale} showFullNav showSpacer />
        </div>

        <main className="relative z-10 mx-auto flex w-full max-w-2xl min-h-[calc(100dvh-4rem)] min-h-[calc(100svh-4rem)] flex-col items-center justify-center px-6 py-32 sm:py-40 md:py-48">
        <div className="flex w-full flex-col items-center text-center">
          <Image
            src={NOT_FOUND_CAMPSITE_IMAGE}
            alt="Illustration of a campsite with a yellow tent, trees, and sun"
            width={256}
            height={256}
            className="h-40 w-40 sm:h-48 sm:w-48"
            priority
          />
          <p className={`mt-8 ${EDITORIAL_SECTION_LABEL_CLASS}`}>{labels.eyebrow}</p>
          <h1 className="mt-4 font-[Georgia] text-3xl font-medium tracking-tight text-neutral-900 sm:text-4xl md:text-[2.75rem] md:leading-tight">
            {labels.title}
          </h1>
          <p className="mt-5 max-w-lg text-sm font-light leading-relaxed text-neutral-600 sm:text-base">
            {labels.description}
          </p>
          <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
            <Link href={links.home} className={EDITORIAL_BUTTON_PRIMARY_CLASS}>
              {labels.homeLink}
            </Link>
            <Link href={links.map} className={EDITORIAL_BUTTON_OUTLINE_CLASS}>
              {labels.mapLink}
            </Link>
          </div>
        </div>
        </main>
      </div>

      <Footer locale={locale} />
    </>
  );
}
