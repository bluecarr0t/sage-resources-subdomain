import { Metadata } from 'next';
import ReportBuilderClient from './ReportBuilderClient';

export const metadata: Metadata = {
  title: 'Report Builder - Sage Admin',
  description: 'Generate an AI-assisted feasibility study draft from property details',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ReportBuilderPage() {
  return <ReportBuilderClient />;
}
