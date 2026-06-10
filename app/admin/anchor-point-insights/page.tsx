import { redirect } from 'next/navigation';

/** Legacy route — Proximity Insights lives at /admin/proximity-insights */
export default function AnchorPointInsightsRedirectPage() {
  redirect('/admin/proximity-insights');
}
