import { cache as reactCache } from 'react';

/**
 * React `cache()` dedupes per request in RSC/Next. Outside that runtime (CLI scripts),
 * falls back to the identity function so modules can load under tsx/node.
 */
export const requestCache: <T extends (...args: never[]) => unknown>(fn: T) => T =
  typeof reactCache === 'function'
    ? reactCache
    : (<T extends (...args: never[]) => unknown>(fn: T): T => fn);
