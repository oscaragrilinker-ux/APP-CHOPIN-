import { Skeleton } from '@/components/ui/skeleton'

export default function OffresLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  )
}
