import NotFoundPageContent from '@/components/not-found/NotFoundPageContent';
import { NOT_FOUND_LABELS_EN } from '@/components/not-found/not-found-labels';
import { defaultLocale } from '@/i18n';

export default function NotFound() {
  return <NotFoundPageContent locale={defaultLocale} labels={NOT_FOUND_LABELS_EN} />;
}
