import type { Bucket } from "./config"

// Matches URL.pathname (no query string or fragment — URL splits those into
// `.search` / `.hash`). Captures: 1 = bucket, 2 = object path.
const PUBLIC_URL_PATTERN = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/

/**
 * Extract the storage object path from a Supabase public URL.
 *
 * Returns `null` if the URL does not belong to the given bucket or is not a
 * Supabase public object URL — callers decide whether that is an error or a
 * no-op.
 *
 * This is a pure function with no server dependencies. Safe to import from
 * client components, test utilities, and server code alike.
 *
 * Example:
 *   https://xxx.supabase.co/storage/v1/object/public/avatars/org-1/u-2/f.jpg
 *   → "org-1/u-2/f.jpg" (when bucket === "avatars")
 */
export function extractStoragePath(bucket: Bucket, publicUrl: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(publicUrl)
  } catch {
    return null
  }
  const match = parsed.pathname.match(PUBLIC_URL_PATTERN)
  if (!match) return null
  const [, urlBucket, path] = match
  if (urlBucket !== bucket) return null
  return path
}
