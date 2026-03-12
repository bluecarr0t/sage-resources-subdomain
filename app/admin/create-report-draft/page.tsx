import { Metadata } from 'next';
import CreateReportDraftClient from './CreateReportDraftClient';

export const metadata: Metadata = {
  title: 'Create Report Draft - Sage Admin',
  description: 'Generate an AI-assisted feasibility study draft from property details',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CreateReportDraftPage() {
  return <CreateReportDraftClient />;
}
