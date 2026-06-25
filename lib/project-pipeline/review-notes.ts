import { randomUUID } from 'crypto';
import { getReviewStatusDropdownLabel } from './review-status';

export const PROJECT_PIPELINE_REVIEW_NOTE_TYPES = [
  'submit_for_review',
  'resubmit',
  'review_feedback',
] as const;

export type ProjectPipelineReviewNoteType =
  (typeof PROJECT_PIPELINE_REVIEW_NOTE_TYPES)[number];

export type ProjectPipelineReviewNote = {
  id: string;
  type: ProjectPipelineReviewNoteType;
  note: string;
  reviewStatus?: string;
  createdAt: string;
  createdByEmail: string;
  createdByDisplayName: string;
};

export function parseProjectPipelineReviewNotes(
  value: unknown
): ProjectPipelineReviewNote[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry): entry is ProjectPipelineReviewNote => {
      if (!entry || typeof entry !== 'object') return false;
      const note = entry as ProjectPipelineReviewNote;
      return (
        typeof note.id === 'string' &&
        typeof note.type === 'string' &&
        (PROJECT_PIPELINE_REVIEW_NOTE_TYPES as readonly string[]).includes(note.type) &&
        typeof note.note === 'string' &&
        typeof note.createdAt === 'string' &&
        typeof note.createdByEmail === 'string' &&
        typeof note.createdByDisplayName === 'string'
      );
    })
    .map((entry) => ({
      ...entry,
      note: entry.note.trim(),
      reviewStatus: entry.reviewStatus?.trim() || undefined,
    }));
}

export function appendProjectPipelineReviewNote(
  existing: readonly ProjectPipelineReviewNote[],
  input: {
    type: ProjectPipelineReviewNoteType;
    note: string;
    reviewStatus?: string;
    createdByEmail: string;
    createdByDisplayName: string;
    createdAt?: string;
  }
): ProjectPipelineReviewNote[] {
  const trimmed = input.note.trim();
  const reviewStatus = input.reviewStatus?.trim() || undefined;
  const note =
    trimmed ||
    (reviewStatus ? getReviewStatusDropdownLabel(reviewStatus) : '');

  if (!note) return [...existing];

  return [
    ...existing,
    {
      id: randomUUID(),
      type: input.type,
      note,
      reviewStatus: reviewStatus,
      createdAt: input.createdAt ?? new Date().toISOString(),
      createdByEmail: input.createdByEmail.trim(),
      createdByDisplayName: input.createdByDisplayName.trim() || input.createdByEmail.trim(),
    },
  ];
}

export function serializeProjectPipelineReviewNotes(
  notes: readonly ProjectPipelineReviewNote[]
): ProjectPipelineReviewNote[] {
  return parseProjectPipelineReviewNotes(notes);
}
