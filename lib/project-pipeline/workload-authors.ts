import { ALLOWED_EMAIL_DOMAINS } from '@/lib/auth-helpers';
import { buildManagedUserDisplayName } from '@/lib/managed-users/display-name';
import { extractNameAliases, fieldMatchesNameAliases } from '@/lib/project-pipeline/name-aliases';
import type { PipelineWorkloadPersonRow } from '@/lib/project-pipeline/workload';

export type WorkloadAuthorInput = {
  displayName: string;
  email?: string | null;
  division?: string | null;
};

/** People excluded from workload assignment views (admin / non-author accounts). */
export const HIDDEN_WORKLOAD_PEOPLE = [
  'Nick Harsell',
  'Sage Admin',
  'Heilala',
  'Multiple',
  'Wendy / Shari',
  'Frantz',
] as const;

export type ManagedUserWorkloadAuthorRow = {
  email: string;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  division?: string | null;
};

function normalizePersonName(value: string): string {
  return value.trim().toLowerCase();
}

function managedUserNameKey(firstName: string | null | undefined, lastName: string | null | undefined) {
  const first = firstName?.trim().toLowerCase();
  const last = lastName?.trim().toLowerCase();
  if (!first || !last) return null;
  return `${first}\0${last}`;
}

function emailDomain(email: string): string {
  return email.split('@')[1]?.trim().toLowerCase() ?? '';
}

function isAllowedSageDomain(domain: string): boolean {
  return (ALLOWED_EMAIL_DOMAINS as readonly string[]).includes(domain);
}

export function resolveManagedUserPipelineDisplayName(input: {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
}): string {
  return (
    input.display_name?.trim() ||
    buildManagedUserDisplayName(input.first_name, input.last_name) ||
    input.email
  );
}

export function isHiddenWorkloadManagedUser(name: string | null | undefined): boolean {
  const normalized = normalizePersonName(name ?? '');
  if (!normalized) return false;

  return HIDDEN_WORKLOAD_PEOPLE.some(
    (hidden) => normalizePersonName(hidden) === normalized
  );
}

/** Whether a sheet appraiser/consultant cell belongs to a hidden non-author account. */
export function jobMatchesHiddenWorkloadAuthor(
  appraiserConsultant: string | null | undefined,
  hiddenDisplayName: string
): boolean {
  const field = appraiserConsultant?.trim();
  if (!field) return false;

  if (normalizePersonName(hiddenDisplayName) === normalizePersonName(field)) {
    return true;
  }

  // Combined sheet labels (e.g. "Wendy / Shari") must match exactly.
  if (hiddenDisplayName.includes('/')) {
    return false;
  }

  // Bare "Nick" in the sheet is Nick Cipriano — only hide explicit Harsell variants.
  if (normalizePersonName(hiddenDisplayName) === 'nick harsell') {
    return normalizePersonName(field).includes('harsell');
  }

  return (
    fieldMatchesNameAliases(field, extractNameAliases(hiddenDisplayName)) ||
    fieldMatchesNameAliases(hiddenDisplayName, extractNameAliases(field))
  );
}

export function isHiddenWorkloadSheetConsultant(fieldValue: string | null | undefined): boolean {
  const normalized = fieldValue?.trim();
  if (!normalized) return false;

  return HIDDEN_WORKLOAD_PEOPLE.some((hidden) =>
    jobMatchesHiddenWorkloadAuthor(normalized, hidden)
  );
}

/** @deprecated Prefer isHiddenWorkloadManagedUser or isHiddenWorkloadSheetConsultant. */
export function isHiddenWorkloadPerson(name: string | null | undefined): boolean {
  return isHiddenWorkloadManagedUser(name) || isHiddenWorkloadSheetConsultant(name);
}

export function filterHiddenWorkloadPersonRows(
  rows: readonly PipelineWorkloadPersonRow[]
): PipelineWorkloadPersonRow[] {
  return rows.filter((row) => !isHiddenWorkloadSheetConsultant(row.name));
}

function pickPreferredEmail(emails: readonly string[]): string {
  const outdoor = emails.find((email) => emailDomain(email) === 'sageoutdooradvisory.com');
  return outdoor ?? emails[0] ?? '';
}

function pickPreferredDivision(rows: readonly ManagedUserWorkloadAuthorRow[]): string | null {
  for (const row of rows) {
    if (row.division?.trim()) return row.division.trim();
  }
  return null;
}

function toAuthorInput(row: ManagedUserWorkloadAuthorRow): WorkloadAuthorInput {
  return {
    displayName: resolveManagedUserPipelineDisplayName(row),
    email: row.email,
    division: row.division ?? null,
  };
}

function shouldMergeCrossDomainGroup(rows: readonly ManagedUserWorkloadAuthorRow[]): boolean {
  if (rows.length < 2) return false;

  const domains = new Set(rows.map((row) => emailDomain(row.email)).filter(isAllowedSageDomain));
  return (
    domains.has('sageoutdooradvisory.com') && domains.has('sagecommercialadvisory.com')
  );
}

function mergeAuthorInputGroup(
  rows: readonly ManagedUserWorkloadAuthorRow[]
): WorkloadAuthorInput {
  const displayName =
    rows
      .map((row) => resolveManagedUserPipelineDisplayName(row))
      .find((name) => name.trim()) ?? rows[0].email;

  return {
    displayName,
    email: pickPreferredEmail(rows.map((row) => row.email)),
    division: pickPreferredDivision(rows),
  };
}

function dedupeAuthorInputsByDisplayName(
  authors: readonly WorkloadAuthorInput[]
): WorkloadAuthorInput[] {
  const byName = new Map<string, WorkloadAuthorInput>();

  for (const author of authors) {
    const displayName = author.displayName.trim();
    if (!displayName) continue;

    const key = normalizePersonName(displayName);
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, { ...author, displayName });
      continue;
    }

    byName.set(key, {
      displayName,
      email: existing.email ?? author.email ?? null,
      division: existing.division ?? author.division ?? null,
    });
  }

  return [...byName.values()];
}

/**
 * Merges managed-user rows that represent the same person across Sage domains
 * (outdoor + commercial) with identical first and last names.
 */
export function preparePipelineWorkloadAuthors(
  rows: readonly ManagedUserWorkloadAuthorRow[]
): WorkloadAuthorInput[] {
  const groupedByName = new Map<string, ManagedUserWorkloadAuthorRow[]>();
  const withoutNameKey: ManagedUserWorkloadAuthorRow[] = [];

  for (const row of rows) {
    const key = managedUserNameKey(row.first_name, row.last_name);
    if (!key) {
      withoutNameKey.push(row);
      continue;
    }

    const bucket = groupedByName.get(key) ?? [];
    bucket.push(row);
    groupedByName.set(key, bucket);
  }

  const prepared: WorkloadAuthorInput[] = [];

  for (const group of groupedByName.values()) {
    if (shouldMergeCrossDomainGroup(group)) {
      prepared.push(mergeAuthorInputGroup(group));
    } else {
      prepared.push(...group.map(toAuthorInput));
    }
  }

  prepared.push(...withoutNameKey.map(toAuthorInput));

  return dedupeAuthorInputsByDisplayName(prepared).filter(
    (author) => !isHiddenWorkloadManagedUser(author.displayName)
  );
}
