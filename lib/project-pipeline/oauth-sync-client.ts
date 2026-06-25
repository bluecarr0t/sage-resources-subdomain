import { PROJECT_PIPELINE_SHEET_TABS } from '@/lib/project-pipeline/sheet-tabs';
import type { PipelineOAuthSyncProgress } from '@/components/project-pipeline/ProjectPipelineOAuthSyncProgress';

export function createInitialPipelineOAuthSyncProgress(): PipelineOAuthSyncProgress[] {
  return PROJECT_PIPELINE_SHEET_TABS.map((sheetName, index) => ({
    sheetName,
    index,
    total: PROJECT_PIPELINE_SHEET_TABS.length,
    status: 'pending' as const,
  }));
}

export async function syncProjectPipelineTabsWithOAuth(input: {
  accessToken: string;
  onProgress: (progress: PipelineOAuthSyncProgress[]) => void;
}): Promise<void> {
  const tabs = [...PROJECT_PIPELINE_SHEET_TABS];
  const progress = createInitialPipelineOAuthSyncProgress();
  input.onProgress(progress);

  for (let index = 0; index < tabs.length; index += 1) {
    const sheetName = tabs[index];
    progress[index] = { ...progress[index], status: 'syncing' };
    input.onProgress([...progress]);

    try {
      const res = await fetch('/api/admin/project-pipeline/oauth-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: input.accessToken, sheetName }),
      });
      const body = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        throw new Error(body.message || body.error || 'Sync failed');
      }
      progress[index] = { ...progress[index], status: 'done' };
    } catch {
      progress[index] = { ...progress[index], status: 'error' };
    }

    input.onProgress([...progress]);
  }

  const failed = progress.some((item) => item.status === 'error');
  if (failed) {
    throw new Error('One or more sheet tabs failed to sync');
  }
}
