import { redirect } from 'next/navigation';
import { JOB_PIPELINE_ADMIN_PATH } from '@/lib/admin-ui';

type ActiveJobsRedirectPageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default function ActiveJobsRedirectPage({ searchParams }: ActiveJobsRedirectPageProps) {
  const qs = new URLSearchParams();
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (typeof value === 'string') qs.set(key, value);
      else if (Array.isArray(value)) {
        for (const entry of value) qs.append(key, entry);
      }
    }
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  redirect(`${JOB_PIPELINE_ADMIN_PATH}${suffix}`);
}
