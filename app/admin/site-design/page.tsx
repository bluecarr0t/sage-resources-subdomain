import { Metadata } from 'next';
import SiteDesignClient from './SiteDesignClient';

export const metadata: Metadata = {
  title: 'RV Site Setup - Sage Admin',
  description: 'RV park site layout optimization calculator',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SiteDesignPage() {
  return <SiteDesignClient />;
}
