import { Skeleton } from "@/components/ui/skeleton"

export default function TrashLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="h-9 w-72" />
      </div>

      <div className="rounded-md border">
        <div className="border-b p-3">
          <div className="grid grid-cols-7 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, row) => (
          <div key={row} className="border-b p-3 last:border-b-0">
            <div className="grid grid-cols-7 gap-4">
              {Array.from({ length: 7 }).map((_, col) => (
                <Skeleton key={col} className="h-5 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
