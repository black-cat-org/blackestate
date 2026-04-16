import { getSupabaseAdmin } from "./server"

type Bucket = "property-media" | "avatars" | "brochures"

/**
 * Upload a file to Supabase Storage.
 *
 * Path format: {orgId}/{entityId}/{filename}
 * Uses service_role key — server-side only, bypasses storage RLS.
 *
 * Returns the public URL for public buckets, or the storage path for private buckets.
 */
export async function uploadFile(
  bucket: Bucket,
  orgId: string,
  entityId: string,
  file: File,
): Promise<string> {
  const supabase = getSupabaseAdmin()

  const ext = file.name.split(".").pop() ?? "bin"
  const filename = `${crypto.randomUUID()}.${ext}`
  const path = `${orgId}/${entityId}/${filename}`

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`)
  }

  if (bucket === "brochures") {
    return path
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Upload multiple files to Supabase Storage.
 * Returns array of public URLs (or paths for private buckets).
 */
export async function uploadFiles(
  bucket: Bucket,
  orgId: string,
  entityId: string,
  files: File[],
): Promise<string[]> {
  const results = await Promise.all(
    files.map((file) => uploadFile(bucket, orgId, entityId, file)),
  )
  return results
}

/**
 * Delete a file from Supabase Storage by its full path.
 */
export async function deleteFile(bucket: Bucket, path: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) {
    throw new Error(`Storage delete failed: ${error.message}`)
  }
}

/**
 * Delete multiple files from Supabase Storage.
 */
export async function deleteFiles(bucket: Bucket, paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage.from(bucket).remove(paths)
  if (error) {
    throw new Error(`Storage bulk delete failed: ${error.message}`)
  }
}

/**
 * Create a signed URL for a private file (brochures).
 * Expires in 1 hour by default.
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
    throw new Error(`Failed to create signed URL: ${error?.message}`)
  }
  return data.signedUrl
}
