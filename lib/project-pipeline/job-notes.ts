import { randomUUID } from 'crypto';

export type ProjectPipelineJobNote = {
  id: string;
  note: string;
  createdAt: string;
  createdByEmail: string;
  createdByDisplayName: string;
};

export function parseProjectPipelineJobNotes(value: unknown): ProjectPipelineJobNote[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry): entry is ProjectPipelineJobNote => {
      if (!entry || typeof entry !== 'object') return false;
      const note = entry as ProjectPipelineJobNote;
      return (
        typeof note.id === 'string' &&
        typeof note.note === 'string' &&
        typeof note.createdAt === 'string' &&
        typeof note.createdByEmail === 'string' &&
        typeof note.createdByDisplayName === 'string'
      );
    })
    .map((entry) => ({
      ...entry,
      note: entry.note.trim(),
    }))
    .filter((entry) => entry.note.length > 0);
}

export function resolveProjectPipelineJobNotes(
  jobNotes: unknown,
  legacyNotesText?: string | null
): ProjectPipelineJobNote[] {
  const parsed = parseProjectPipelineJobNotes(jobNotes);
  if (parsed.length > 0) return parsed;

  const legacy = legacyNotesText?.trim();
  if (!legacy) return [];

  return [
    {
      id: 'legacy',
      note: legacy,
      createdAt: new Date(0).toISOString(),
      createdByEmail: '',
      createdByDisplayName: 'Imported',
    },
  ];
}

export function appendProjectPipelineJobNote(
  existing: readonly ProjectPipelineJobNote[],
  input: {
    note: string;
    createdByEmail: string;
    createdByDisplayName: string;
    createdAt?: string;
  }
): ProjectPipelineJobNote[] {
  const trimmed = input.note.trim();
  if (!trimmed) return [...existing];

  return [
    ...existing,
    {
      id: randomUUID(),
      note: trimmed,
      createdAt: input.createdAt ?? new Date().toISOString(),
      createdByEmail: input.createdByEmail.trim(),
      createdByDisplayName:
        input.createdByDisplayName.trim() || input.createdByEmail.trim() || 'Unknown',
    },
  ];
}

export function serializeProjectPipelineJobNotes(
  notes: readonly ProjectPipelineJobNote[]
): ProjectPipelineJobNote[] {
  return parseProjectPipelineJobNotes(notes);
}
