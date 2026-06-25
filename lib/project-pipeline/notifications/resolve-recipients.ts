import { isJobAuthoredByConsultant } from '@/lib/project-pipeline/name-aliases';
import {
  resolveManagedUserPipelineDisplayName,
  type ManagedUserWorkloadAuthorRow,
} from '@/lib/project-pipeline/workload-authors';

function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? '';
}

function managedUserNameKey(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string | null {
  const first = firstName?.trim().toLowerCase();
  const last = lastName?.trim().toLowerCase();
  if (!first || !last) return null;
  return `${first}\0${last}`;
}

function pickPreferredConsultantEmail(rows: readonly ManagedUserWorkloadAuthorRow[]): string | null {
  const outdoor = rows.find((row) =>
    row.email?.trim().toLowerCase().endsWith('@sageoutdooradvisory.com')
  );
  return (outdoor ?? rows[0])?.email?.trim() ?? null;
}

export function resolveConsultantEmailsForField(
  fieldValue: string | null | undefined,
  managedUsers: readonly ManagedUserWorkloadAuthorRow[]
): string[] {
  const field = fieldValue?.trim();
  if (!field) return [];

  const matchedRows: ManagedUserWorkloadAuthorRow[] = [];
  const withoutNameKey: ManagedUserWorkloadAuthorRow[] = [];

  for (const row of managedUsers) {
    const displayName = resolveManagedUserPipelineDisplayName(row);
    if (!isJobAuthoredByConsultant(field, displayName)) continue;

    const key = managedUserNameKey(row.first_name, row.last_name);
    if (key) {
      matchedRows.push(row);
    } else {
      withoutNameKey.push(row);
    }
  }

  const groupedByName = new Map<string, ManagedUserWorkloadAuthorRow[]>();
  for (const row of matchedRows) {
    const key = managedUserNameKey(row.first_name, row.last_name)!;
    const bucket = groupedByName.get(key) ?? [];
    bucket.push(row);
    groupedByName.set(key, bucket);
  }

  const emails = new Set<string>();
  for (const group of groupedByName.values()) {
    const email = pickPreferredConsultantEmail(group);
    if (email) emails.add(email);
  }

  for (const row of withoutNameKey) {
    const email = row.email?.trim();
    if (email) emails.add(email);
  }

  return [...emails];
}

export function resolvePipelineJobConsultantRecipients(input: {
  appraiserConsultant: string | null | undefined;
  managedUsers: readonly ManagedUserWorkloadAuthorRow[];
  actorEmail?: string | null;
}): string[] {
  const actor = normalizeEmail(input.actorEmail);
  const emails = resolveConsultantEmailsForField(
    input.appraiserConsultant,
    input.managedUsers
  );

  return emails.filter((email) => normalizeEmail(email) !== actor);
}
