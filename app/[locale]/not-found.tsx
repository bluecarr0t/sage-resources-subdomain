'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import NotFoundPageContent from '@/components/not-found/NotFoundPageContent';
import type { NotFoundLabels } from '@/components/not-found/not-found-labels';
import { locales, defaultLocale } from '@/i18n';

export default function NotFound() {
  const pathname = usePathname();
  const t = useTranslations('notFound');
  const pathLocale = pathname?.split('/')[1];
  const locale =
    pathLocale && locales.includes(pathLocale as (typeof locales)[number])
      ? pathLocale
      : defaultLocale;

  const labels: NotFoundLabels = {
    eyebrow: t('eyebrow'),
    title: t('title'),
    description: t('description'),
    homeLink: t('homeLink'),
    mapLink: t('mapLink'),
  };

  return <NotFoundPageContent locale={locale} labels={labels} />;
};
