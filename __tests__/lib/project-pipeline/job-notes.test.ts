import {
  appendProjectPipelineJobNote,
  parseProjectPipelineJobNotes,
  resolveProjectPipelineJobNotes,
} from '@/lib/project-pipeline/job-notes';

describe('project pipeline job notes', () => {
  it('parses valid note entries', () => {
    const notes = parseProjectPipelineJobNotes([
      {
        id: '1',
        note: '  First note  ',
        createdAt: '2026-06-26T12:00:00.000Z',
        createdByEmail: 'user@example.com',
        createdByDisplayName: 'User',
      },
    ]);

    expect(notes).toEqual([
      {
        id: '1',
        note: 'First note',
        createdAt: '2026-06-26T12:00:00.000Z',
        createdByEmail: 'user@example.com',
        createdByDisplayName: 'User',
      },
    ]);
  });

  it('falls back to legacy text notes when job_notes is empty', () => {
    const notes = resolveProjectPipelineJobNotes([], 'Legacy single note');

    expect(notes).toHaveLength(1);
    expect(notes[0]?.note).toBe('Legacy single note');
    expect(notes[0]?.createdByDisplayName).toBe('Imported');
  });

  it('appends a new note with author metadata', () => {
    const existing = resolveProjectPipelineJobNotes([], 'Legacy note');
    const updated = appendProjectPipelineJobNote(existing, {
      note: 'Follow-up note',
      createdByEmail: 'pm@example.com',
      createdByDisplayName: 'Project Manager',
      createdAt: '2026-06-27T10:00:00.000Z',
    });

    expect(updated).toHaveLength(2);
    expect(updated[1]).toMatchObject({
      note: 'Follow-up note',
      createdByEmail: 'pm@example.com',
      createdByDisplayName: 'Project Manager',
      createdAt: '2026-06-27T10:00:00.000Z',
    });
    expect(updated[1]?.id).toEqual(expect.any(String));
  });

  it('ignores empty append payloads', () => {
    const existing = parseProjectPipelineJobNotes([]);
    expect(
      appendProjectPipelineJobNote(existing, {
        note: '   ',
        createdByEmail: 'pm@example.com',
        createdByDisplayName: 'PM',
      })
    ).toEqual([]);
  });
});
