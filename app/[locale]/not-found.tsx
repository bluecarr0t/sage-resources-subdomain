'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { locales, defaultLocale } from '@/i18n';
import { createLocaleLinks } from '@/lib/locale-links';
import FloatingHeader from '@/components/FloatingHeader';
import Footer from '@/components/Footer';

export default function NotFound() {
  const pathname = usePathname();
  const t = useTranslations('notFound');

  // Extract locale from pathname (e.g. /en/bad-page -> en)
  const pathLocale = pathname?.split('/')[1];
  const locale = pathLocale && locales.includes(pathLocale as typeof locales[number])
    ? pathLocale
    : defaultLocale;

  const links = createLocaleLinks(locale);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <FloatingHeader locale={locale} showSpacer={false} />

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-6xl font-bold text-[#006b5f] mb-4">404</h1>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {t('title')}
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            {t('description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={links.home}
              className="inline-block px-8 py-4 bg-[#006b5f] text-white font-semibold rounded-lg hover:bg-[#005a4f] transition-colors"
            >
              {t('homeLink')}
            </Link>
            <Link
              href={links.map}
              className="inline-block px-8 py-4 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
            >
              {t('mapLink')}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
