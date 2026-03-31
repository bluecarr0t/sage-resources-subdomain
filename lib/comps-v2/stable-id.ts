import { createHash } from 'crypto';

export function stableCandidateId(
  sourceTable: string,
  sourceRowId: string | null,
  propertyName: string
): string {
  const raw = `${sourceTable}:${sourceRowId ?? ''}:${propertyName.toLowerCase().trim()}`;
  return createHash('sha256').update(raw).digest('hex').slice(0, 20);
}
