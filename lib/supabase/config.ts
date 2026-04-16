/**
 * Single source of truth for Supabase Storage bucket configuration.
 *
 * Must mirror the actual bucket configuration in Supabase (`storage.buckets`).
 * Any drift between this map and the live bucket will cause uploads to fail
 * with a 400 at the bucket-level validation layer (service_role cannot bypass
 * `allowed_mime_types` or `file_size_limit`).
 *
 * When changing a bucket's config in Supabase, update this file in the same PR.
 */

export const BUCKETS = ["property-media", "avatars", "brochures"] as const
export type Bucket = (typeof BUCKETS)[number]

export interface BucketConfig {
  readonly public: boolean
  readonly maxBytes: number
  readonly cacheControlSeconds: number
  readonly extensions: Readonly<Record<string, string>>
}

const IMAGE_CACHE_SECONDS = 60 * 60 * 24 * 30
const PDF_CACHE_SECONDS = 60 * 60 * 24

export const BUCKET_CONFIG: Readonly<Record<Bucket, BucketConfig>> = {
  "property-media": {
    public: true,
    maxBytes: 10 * 1024 * 1024,
    cacheControlSeconds: IMAGE_CACHE_SECONDS,
    extensions: {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      avif: "image/avif",
    },
  },
  avatars: {
    public: true,
    maxBytes: 2 * 1024 * 1024,
    cacheControlSeconds: IMAGE_CACHE_SECONDS,
    extensions: {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    },
  },
  brochures: {
    public: false,
    maxBytes: 20 * 1024 * 1024,
    cacheControlSeconds: PDF_CACHE_SECONDS,
    extensions: {
      pdf: "application/pdf",
    },
  },
}
