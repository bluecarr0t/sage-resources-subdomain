import { Metadata } from 'next';
import ProximityInsightsClient from './ProximityInsightsClient';

export const metadata: Metadata = {
  title: 'Proximity Insights - Sage Admin',
  description: 'Glamping and RV proximity analytics vs ski resorts and national parks',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProximityInsightsPage() {
  return <ProximityInsightsClient />;
}
