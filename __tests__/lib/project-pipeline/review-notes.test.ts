import {
  appendProjectPipelineReviewNote,
  parseProjectPipelineReviewNotes,
} from '@/lib/project-pipeline/review-notes';

describe('review-notes', () => {
  it('parses valid review note arrays', () => {
    const notes = parseProjectPipelineReviewNotes([
      {
        id: '1',
        type: 'submit_for_review',
        note: 'Ready',
        createdAt: '2026-06-24T00:00:00.000Z',
        createdByEmail: 'a@sage.com',
        createdByDisplayName: 'Author',
      },
    ]);

    expect(notes).toHaveLength(1);
    expect(notes[0]?.note).toBe('Ready');
  });

  it('ignores invalid entries', () => {
    expect(parseProjectPipelineReviewNotes([{ bad: true }])).toEqual([]);
    expect(parseProjectPipelineReviewNotes(null)).toEqual([]);
  });

  it('appends notes with trimmed text', () => {
    const next = appendProjectPipelineReviewNote([], {
      type: 'resubmit',
      note: '  Fixed items  ',
      createdByEmail: 'a@sage.com',
      createdByDisplayName: 'Author',
    });

    expect(next).toHaveLength(1);
    expect(next[0]?.note).toBe('Fixed items');
  });

  it('skips empty note text', () => {
    const next = appendProjectPipelineReviewNote([], {
      type: 'review_feedback',
      note: '   ',
      createdByEmail: 'a@sage.com',
      createdByDisplayName: 'Admin',
    });

    expect(next).toHaveLength(0);
  });
});
