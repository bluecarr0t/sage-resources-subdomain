import { Metadata } from 'next';
import SageAiClient from './SageAiClient';

export const metadata: Metadata = {
  title: 'Sage AI - Admin',
  description: 'AI-powered assistant for querying and analyzing glamping property data',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SageAiPage() {
  return <SageAiClient />;
}
