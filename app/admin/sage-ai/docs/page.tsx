import { Metadata } from 'next';
import Link from 'next/link';
import { readFile } from 'fs/promises';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sage AI — Configuration',
  robots: { index: false, follow: false },
};

async function loadSageAiDocMarkdown(): Promise<string> {
  const docPath = path.join(process.cwd(), 'docs/admin/SAGE_AI.md');
  return readFile(docPath, 'utf8');
}

export default async function SageAiDocsPage() {
  const markdown = await loadSageAiDocMarkdown();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white dark:bg-neutral-950">
      <div className="flex items-center gap-3 border-b border-neutral-200/75 px-4 py-3 dark:border-neutral-800">
        <Link
          href="/admin/sage-ai"
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Sage AI
        </Link>
        <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Configuration &amp; ops
        </h1>
      </div>
      <article className="prose prose-sm prose-neutral dark:prose-invert max-w-3xl flex-1 overflow-y-auto px-6 py-8">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </article>
    </div>
  );
}
