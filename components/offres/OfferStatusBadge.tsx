import type { OfferStatus } from '@/types'

const CONFIG: Record<OfferStatus, { label: string; className: string }> = {
  pending:          { label: 'En attente', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  counter_proposed: { label: 'Contre-proposée', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  accepted:         { label: 'Acceptée', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  refused:          { label: 'Refusée', className: 'bg-red-50 text-red-700 border-red-200' },
  cancelled:        { label: 'Annulée', className: 'bg-gray-50 text-gray-500 border-gray-200' },
}

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  const { label, className } = CONFIG[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {label}
    </span>
  )
}
