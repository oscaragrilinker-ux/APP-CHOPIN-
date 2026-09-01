import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ArrowLeft, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { InvoiceStatusBadge } from '@/components/facturation/InvoiceStatusBadge'
import { RecordPaymentForm } from '@/components/facturation/RecordPaymentForm'
import { CancelInvoiceButton } from '@/components/facturation/CancelInvoiceButton'
import { formatEuro } from '@/lib/utils/price'
import type { Role, InvoiceStatus } from '@/types'

export const dynamic = 'force-dynamic'

type Payment = {
  id: string
  amount: number
  method: string
  paid_at: string
  reference: string | null
  notes: string | null
  created_at: string
}

export default async function FactureDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const role = profile.role as Role
  const isAdmin = ['admin', 'super_admin'].includes(role)
  const canRecord = ['admin', 'secretaire', 'super_admin'].includes(role)

  if (!canRecord) redirect('/dashboard')

  // Facture + paiements
  const [{ data: invoice, error }, { data: payments }] = await Promise.all([
    supabase
      .from('invoices')
      .select(`
        id, invoice_number, status, issued_at, due_date,
        subtotal, tax_rate, tax_amount, total, amount_paid, notes,
        company:companies ( id, name, address_line1, postal_code, city, payment_terms ),
        order:orders ( id, product_name, variety_name, format_name, quantity )
      `)
      .eq('id', params.id)
      .single(),
    supabase
      .from('payments')
      .select('id, amount, method, paid_at, reference, notes, created_at')
      .eq('invoice_id', params.id)
      .order('paid_at', { ascending: false }),
  ])

  if (error || !invoice) notFound()

  const company = invoice.company as unknown as {
    id: string; name: string; address_line1: string | null
    postal_code: string | null; city: string | null; payment_terms: number
  } | null
  const order = invoice.order as unknown as {
    id: string; product_name: string; variety_name: string | null
    format_name: string | null; quantity: number
  } | null

  const status = invoice.status as InvoiceStatus
  const remaining = Math.max(0, Number(invoice.total) - Number(invoice.amount_paid))
  const canRecordPayment = canRecord && !['paid', 'cancelled'].includes(status)
  const canCancel = isAdmin && !['paid', 'cancelled'].includes(status)

  const methodLabel: Record<string, string> = {
    virement: 'Virement',
    cheque: 'Chèque',
    especes: 'Espèces',
    autre: 'Autre',
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/facturation" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-mono text-2xl text-foreground">{invoice.invoice_number}</h1>
            <InvoiceStatusBadge status={status} />
          </div>
          {company && (
            <p className="text-sm text-muted-foreground mt-0.5">{company.name}</p>
          )}
        </div>
      </div>

      {/* Récap commande */}
      {order && (
        <div className="rounded-2xl border border-border/60 bg-secondary/20 px-4 py-3 flex items-center gap-3">
          <Package size={16} className="text-muted-foreground shrink-0" />
          <div className="text-sm">
            <span className="font-medium text-foreground">{order.product_name}</span>
            {order.variety_name && <span className="text-muted-foreground"> · {order.variety_name}</span>}
            {order.format_name && <span className="text-muted-foreground"> · {order.format_name}</span>}
            <span className="text-muted-foreground ml-2">× {order.quantity}</span>
          </div>
          <Link
            href={`/commandes/${order.id}`}
            className="ml-auto text-xs text-primary hover:underline shrink-0"
          >
            Voir commande
          </Link>
        </div>
      )}

      {/* Montants */}
      <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/50">
        <div className="grid grid-cols-3 divide-x divide-border/50">
          <Cell label="Sous-total HT" value={formatEuro(Number(invoice.subtotal))} />
          <Cell label={`TVA ${invoice.tax_rate}%`} value={formatEuro(Number(invoice.tax_amount))} />
          <Cell label="Total TTC" value={formatEuro(Number(invoice.total))} highlight />
        </div>

        <div className="grid grid-cols-3 divide-x divide-border/50">
          <Cell label="Déjà réglé" value={formatEuro(Number(invoice.amount_paid))} />
          <Cell
            label="Reste dû"
            value={remaining > 0 ? formatEuro(remaining) : '—'}
            highlight={remaining > 0}
          />
          <Cell
            label="Délai client"
            value={company?.payment_terms ? `${company.payment_terms} jours` : '30 jours'}
          />
        </div>

        {invoice.issued_at && (
          <div className="px-4 py-3 flex gap-8 text-sm text-muted-foreground">
            <span>
              Émise le{' '}
              <strong className="text-foreground">
                {format(new Date(invoice.issued_at), 'd MMMM yyyy', { locale: fr })}
              </strong>
            </span>
            {invoice.due_date && (
              <span>
                Échéance{' '}
                <strong className={`${status === 'overdue' ? 'text-red-600' : 'text-foreground'}`}>
                  {format(new Date(invoice.due_date), 'd MMMM yyyy', { locale: fr })}
                </strong>
              </span>
            )}
          </div>
        )}

        {invoice.notes && (
          <div className="px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-1">Notes</p>
            <p className="text-sm text-foreground">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Paiements enregistrés */}
      {(payments ?? []).length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-3">
            Paiements reçus · {(payments ?? []).length}
          </p>
          <div className="rounded-2xl border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/30">
                  <th className="text-left px-4 py-2.5 text-xs font-normal text-muted-foreground uppercase tracking-[0.08em]">Date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-normal text-muted-foreground uppercase tracking-[0.08em]">Mode</th>
                  <th className="text-left px-4 py-2.5 text-xs font-normal text-muted-foreground uppercase tracking-[0.08em] hidden sm:table-cell">Référence</th>
                  <th className="text-right px-4 py-2.5 text-xs font-normal text-muted-foreground uppercase tracking-[0.08em]">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {(payments as Payment[]).map(p => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(p.paid_at), 'd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="px-4 py-3 text-foreground">{methodLabel[p.method] ?? p.method}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {p.reference ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-700">
                      {formatEuro(Number(p.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Formulaire paiement */}
      {canRecordPayment && (
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <RecordPaymentForm invoiceId={invoice.id} remaining={remaining} />
        </div>
      )}

      {/* Annuler */}
      {canCancel && (
        <div className="pt-2">
          <CancelInvoiceButton invoiceId={invoice.id} />
        </div>
      )}
    </div>
  )
}

function Cell({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className={`mt-0.5 ${highlight ? 'font-serif text-xl text-foreground' : 'text-sm font-medium text-foreground'}`}>
        {value}
      </p>
    </div>
  )
}
