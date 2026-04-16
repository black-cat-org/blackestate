import "server-only"
import { getSupabaseAdmin } from "./server"
import { BUCKET_CONFIG, type Bucket } from "./config"

export type { Bucket }

// Matches URL.pathname (no query string or fragment — URL splits those into
// `.search` / `.hash`). Captures: 1 = bucket, 2 = object path.
const PUBLIC_URL_PATTERN = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/

/**
 * Derive MIME type from the file extension using the bucket's whitelist.
 *
 * `File.type` cannot be trusted across the Server Action boundary — Next.js
 * reconstructs File instances server-side and the `.type` property may be
 * empty depending on the browser/OS that produced the upload. When empty,
 * `@supabase/supabase-js` sends an empty `Content-Type` header, which the
 * Storage API coerces to `application/octet-stream` — rejected by buckets
 * with `allowed_mime_types` set (400).
 *
 * Deriving from the extension keeps us aligned with the bucket whitelist and
 * makes the failure mode explicit (throws with a clear message) rather than
 * silently passing through unknown MIME types.
 */
function deriveContentType(bucket: Bucket, filename: string): {
  ext: string
  contentType: string
} {
  const dotIndex = filename.lastIndexOf(".")
  if (dotIndex === -1 || dotIndex === filename.length - 1) {
    throw new Error(`File has no extension: ${filename}`)
  }
  const ext = filename.slice(dotIndex + 1).toLowerCase()
  const contentType = BUCKET_CONFIG[bucket].extensions[ext]
  if (!contentType) {
    throw new Error(
      `Extension .${ext} not allowed in bucket ${bucket}. ` +
        `Allowed: ${Object.keys(BUCKET_CONFIG[bucket].extensions).join(", ")}.`,
    )
  }
  return { ext, contentType }
}

function assertSize(bucket: Bucket, file: File): void {
  const { maxBytes } = BUCKET_CONFIG[bucket]
  if (file.size > maxBytes) {
    const maxMB = Math.round((maxBytes / (1024 * 1024)) * 10) / 10
    throw new Error(`File exceeds ${maxMB}MB limit for bucket ${bucket}.`)
  }
}

function buildObjectPath(orgId: string, entityId: string, ext: string): string {
  // Web Crypto API — available on globalThis in Node 18+ (required by Next.js 16).
  return `${orgId}/${entityId}/${crypto.randomUUID()}.${ext}`
}

/**
 * Upload a single file to Supabase Storage.
 *
 * Returns the public URL for public buckets, or the storage path for private
 * buckets (use `createSignedUrl` to generate a time-bound URL).
 *
 * Path format: `{orgId}/{entityId}/{uuid}.{ext}`. The first segment is the
 * organization id, which matches the Storage RLS policies' `foldername[1]`
 * check — kept consistent even though `service_role` bypasses RLS, so that
 * future non-admin clients can use the same helpers without re-pathing.
 */
export async function uploadFile(
  bucket: Bucket,
  orgId: string,
  entityId: string,
  file: File,
): Promise<string> {
  assertSize(bucket, file)
  const { ext, contentType } = deriveContentType(bucket, file.name)

  const supabase = getSupabaseAdmin()
  const path = buildObjectPath(orgId, entityId, ext)
  // `cacheControl` here is the numeric `max-age` seconds as a string (Supabase
  // builds the full `Cache-Control: max-age=<n>` header server-side). Do not
  // prefix with `max-age=`.
  const cacheControl = String(BUCKET_CONFIG[bucket].cacheControlSeconds)

  // `@supabase/storage-js` builds a multipart body from File/Blob inputs and
  // reads the part's Content-Type from the Blob's `.type` — the `contentType`
  // option is ignored for File/Blob bodies and only applied to raw binary.
  // `File.type` is unreliable across the Server Action boundary (often empty
  // after FormData serialization), so we always re-wrap in a fresh Blob with
  // the extension-derived MIME.
  const body = new Blob([await file.arrayBuffer()], { type: contentType })

  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType,
    cacheControl,
    upsert: false,
  })

  if (error) {
    throw new Error(`[storage] upload to ${bucket} failed: ${error.message}`)
  }

  if (!BUCKET_CONFIG[bucket].public) {
    return path
  }

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

/**
 * Upload multiple files in parallel. If any upload rejects, this function
 * rejects with the first error; other in-flight uploads still complete but
 * their returned URLs are discarded. Objects already uploaded are NOT
 * rolled back — the caller is responsible for cleaning up orphaned objects
 * on partial failure.
 */
export async function uploadFiles(
  bucket: Bucket,
  orgId: string,
  entityId: string,
  files: File[],
): Promise<string[]> {
  if (files.length === 0) return []
  return Promise.all(files.map((file) => uploadFile(bucket, orgId, entityId, file)))
}

/**
 * Delete a single object by its storage path (not public URL).
 * Use `extractStoragePath` when starting from a public URL.
 */
export async function deleteFile(bucket: Bucket, path: string): Promise<void> {
  if (!path) return
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) {
    throw new Error(`[storage] delete from ${bucket} failed: ${error.message}`)
  }
}

/**
 * Delete multiple objects by their storage paths (not public URLs).
 */
export async function deleteFiles(bucket: Bucket, paths: string[]): Promise<void> {
  const cleaned = paths.filter(Boolean)
  if (cleaned.length === 0) return
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage.from(bucket).remove(cleaned)
  if (error) {
    throw new Error(`[storage] bulk delete from ${bucket} failed: ${error.message}`)
  }
}

/**
 * Create a signed URL for a private object (e.g. brochures).
 * Defaults to 1 hour expiry.
 */
export async function getSignedUrl(
  bucket: Bucket,
  path: string,
  expiresIn: number = 3600,
): Promise<string> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error || !data?.signedUrl) {
    throw new Error(
      `[storage] signed URL failed for ${bucket}/${path}: ${error?.message ?? "unknown"}`,
    )
  }
  return data.signedUrl
}

/**
 * Extract the storage object path from a Supabase public URL.
 *
 * Returns `null` if the URL does not belong to the given bucket or is not a
 * Supabase public object URL — callers decide whether that is an error or a
 * no-op.
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
