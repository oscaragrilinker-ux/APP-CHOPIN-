import type { InvoiceStatus } from '@/types'

const CONFIG: Record<InvoiceStatus, { label: string; cls: string }> = {
  draft:           { label: 'Brouillon',         cls: 'bg-muted text-muted-foreground' },
  issued:          { label: 'Émise',             cls: 'bg-blue-100 text-blue-700' },
  paid:            { label: 'Payée',             cls: 'bg-emerald-100 text-emerald-700' },
  partially_paid:  { label: 'Partiel.',          cls: 'bg-amber-100 text-amber-700' },
  overdue:         { label: 'En retard',         cls: 'bg-red-100 text-red-700' },
  cancelled:       { label: 'Annulée',           cls: 'bg-muted text-muted-foreground line-through' },
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, cls } = CONFIG[status] ?? CONFIG.draft
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  )
}
