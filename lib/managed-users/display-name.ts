export function buildManagedUserDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string | null {
  const name = `${firstName?.trim() ?? ''} ${lastName?.trim() ?? ''}`.trim();
  return name || null;
}
