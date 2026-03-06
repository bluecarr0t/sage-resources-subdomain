/**
 * Sanitize client-provided filenames for safe use in storage paths.
 * Prevents path traversal (../) and other unsafe characters.
 */

const MAX_FILENAME_LENGTH = 255;
const UNSAFE_PATTERN = /[<>"|?*\x00-\x1f\\/]/g;
const TEMP_UPLOAD_PATH_REGEX = /^temp-uploads\/[a-f0-9-]{36}\/[^/]+$/;

/**
 * Sanitize a filename for safe use in storage paths.
 * - Strips path components (e.g. "../../evil" -> "evil")
 * - Removes path separators and unsafe chars
 * - Limits length
 * - Returns "unnamed" if result would be empty
 */
export function sanitizeFilename(name: string | null | undefined): string {
  if (name == null || typeof name !== 'string') {
    return 'unnamed';
  }
  // Strip any path components - use only the basename
  const basename = name.replace(/^.*[\\/]/, '').trim();
  if (!basename) return 'unnamed';
  // Remove path traversal attempts and unsafe characters
  const sanitized = basename
    .replace(/\.\./g, '')
    .replace(UNSAFE_PATTERN, '_')
    .replace(/^\.+/, '') // leading dots
    .trim();
  if (!sanitized) return 'unnamed';
  return sanitized.slice(0, MAX_FILENAME_LENGTH);
}

/**
 * Validate a storage path from client (e.g. from presign-upload response).
 * Only allows temp-uploads/{uuid}/{filename} format. Rejects path traversal.
 */
export function isValidTempUploadPath(path: string | null | undefined): boolean {
  if (path == null || typeof path !== 'string') return false;
  if (path.includes('..') || path.startsWith('/')) return false;
  return TEMP_UPLOAD_PATH_REGEX.test(path);
}
