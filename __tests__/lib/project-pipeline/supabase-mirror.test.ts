import {
  isProjectPipelineSupabaseMirrorComplete,
} from '@/lib/project-pipeline/fetch-from-supabase';

describe('isProjectPipelineSupabaseMirrorComplete', () => {
  it('returns false when the mirror is empty', () => {
    expect(isProjectPipelineSupabaseMirrorComplete(0, { jobs_fetched: 120 })).toBe(false);
  });

  it('returns false when there is no successful cron sync run', () => {
    expect(isProjectPipelineSupabaseMirrorComplete(1, null)).toBe(false);
    expect(isProjectPipelineSupabaseMirrorComplete(50, undefined)).toBe(false);
  });

  it('returns false when the mirror has fewer rows than the last sync fetched', () => {
    expect(isProjectPipelineSupabaseMirrorComplete(1, { jobs_fetched: 120 })).toBe(false);
    expect(isProjectPipelineSupabaseMirrorComplete(119, { jobs_fetched: 120 })).toBe(false);
  });

  it('returns true when the mirror matches the last successful sync count', () => {
    expect(isProjectPipelineSupabaseMirrorComplete(120, { jobs_fetched: 120 })).toBe(true);
    expect(isProjectPipelineSupabaseMirrorComplete(150, { jobs_fetched: 120 })).toBe(true);
  });
});
