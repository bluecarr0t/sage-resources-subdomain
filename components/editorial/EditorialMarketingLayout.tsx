import type { ReactNode } from 'react';
import FloatingHeader from '@/components/FloatingHeader';
import Footer from '@/components/Footer';
import {
  EditorialPageShell,
  EDITORIAL_H1_CLASS,
  EDITORIAL_LEAD_CLASS,
  EDITORIAL_MAIN_WITH_HEADER_CLASS,
} from '@/components/editorial/EditorialPageShell';

type EditorialMarketingLayoutProps = {
  locale: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Use full site footer with links; default minimal shell footer */
  footerVariant?: 'full' | 'minimal';
  showFullNav?: boolean;
};

/**
 * Shared layout for home, guides, and glossary — matches glamping market overview shell.
 */
export function EditorialMarketingLayout({
  locale,
  title,
  subtitle,
  children,
  footerVariant = 'full',
  showFullNav = true,
}: EditorialMarketingLayoutProps) {
  return (
    <EditorialPageShell footer={footerVariant === 'minimal' ? undefined : null}>
      <FloatingHeader locale={locale} showFullNav={showFullNav} showSpacer={false} />
      <main className={EDITORIAL_MAIN_WITH_HEADER_CLASS}>
        <header className="mb-12 border-b border-sage-200/80 pb-10">
          <h1 className={EDITORIAL_H1_CLASS}>{title}</h1>
          {subtitle ? <p className={EDITORIAL_LEAD_CLASS}>{subtitle}</p> : null}
        </header>
        {children}
      </main>
      {footerVariant === 'full' ? <Footer locale={locale} /> : null}
    </EditorialPageShell>
  );
}
