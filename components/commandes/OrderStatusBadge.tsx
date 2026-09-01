import type { OrderStatus } from '@/types'

const CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  accepted:       { label: 'Acceptée', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_preparation: { label: 'En préparation', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  ready:          { label: 'Prête', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  shipped:        { label: 'Expédiée', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  delivered:      { label: 'Livrée', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled:      { label: 'Annulée', className: 'bg-gray-50 text-gray-500 border-gray-200' },
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, className } = CONFIG[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {label}
    </span>
  )
}
