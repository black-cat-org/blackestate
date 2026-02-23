import { Skeleton } from "@/components/ui/skeleton"

export default function PropertyLoading() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <Skeleton className="h-6 w-32" />
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Header skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-5 w-1/2" />
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-8">
            {/* Gallery skeleton */}
            <Skeleton className="aspect-[4/3] w-full rounded-lg" />

            {/* Description skeleton */}
            <div className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            {/* Characteristics skeleton */}
            <div className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar skeleton */}
          <div className="hidden lg:block">
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </main>
    </div>
  )
}
