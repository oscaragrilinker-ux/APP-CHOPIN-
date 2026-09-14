import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { InvoiceStatusBadge } from '@/components/facturation/InvoiceStatusBadge'
import { MarkOverdueButton } from '@/components/relances/MarkOverdueButton'
import { formatEuro } from '@/lib/utils/price'
import type { Role, InvoiceStatus } from '@/types'
import { BRAND } from '@/lib/brand'

export const metadata = { title: `Relances — ${BRAND.name}` }
export const dynamic = 'force-dynamic'

export default async function RelancesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const role = profile.role as Role
  if (!['admin', 'secretaire', 'super_admin'].includes(role)) redirect('/dashboard')

  const today = new Date().toISOString().split('T')[0]

  // Factures impayées (émises ou partielles) dont l'échéance est passée ou proche
  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, status, due_date, total, amount_paid,
      company:companies ( id, name, email, phone )
    `)
    .in('status', ['issued', 'partially_paid', 'overdue'])
    .order('due_date', { ascending: true })

  // Séparer : en retard vs à venir (< 7 jours)
  const rawInvoices = (invoices ?? []) as unknown as InvoiceRow[]

  const overdue = rawInvoices.filter(i =>
    !i.due_date || i.due_date < today || i.status === 'overdue'
  )
  const upcoming = rawInvoices.filter(i =>
    i.due_date && i.due_date >= today && i.status !== 'overdue'
  )

  // Combien de factures pourraient passer en retard (dues passées mais pas encore marquées)
  const toMarkOverdue = rawInvoices.filter(
    i => i.due_date && i.due_date < today && i.status !== 'overdue'
  ).length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Relances</h1>
          <p className="text-sm text-muted-foreground mt-1 uppercase tracking-[0.1em]">
            Suivi des impayés · Rappels
          </p>
        </div>
        {toMarkOverdue > 0 && (
          <MarkOverdueButton count={toMarkOverdue} />
        )}
      </div>

      {/* Vide */}
      {!overdue.length && !upcoming.length && (
        <div className="rounded-2xl border border-dashed border-border/60 p-16 text-center">
          <p className="font-serif text-2xl text-muted-foreground">Aucun impayé en cours</p>
          <p className="text-sm text-muted-foreground mt-2">Toutes les factures sont à jour.</p>
          <Link href="/facturation" className="text-sm text-primary hover:underline mt-3 inline-block">
            Voir toute la facturation →
          </Link>
        </div>
      )}

      {/* Factures en retard */}
      {overdue.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} className="text-red-500" />
            <p className="text-sm font-medium text-red-700">
              {overdue.length} facture{overdue.length > 1 ? 's' : ''} en retard
            </p>
          </div>
          <InvoiceTable invoices={overdue} today={today} />
        </section>
      )}

      {/* Échéances à venir */}
      {upcoming.length > 0 && (
        <section>
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-3">
            Échéances à venir (≤ 30 jours)
          </p>
          <InvoiceTable invoices={upcoming} today={today} />
        </section>
      )}
    </div>
  )
}

type InvoiceRow = {
  id: string
  invoice_number: string
  status: string
  due_date: string | null
  total: number
  amount_paid: number
  company: { id: string; name: string; email: string | null; phone: string | null } | null
}

function InvoiceTable({ invoices, today }: { invoices: InvoiceRow[]; today: string }) {
  return (
    <div className="rounded-2xl border border-border/60 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-secondary/30">
            <th className="text-left px-4 py-3 text-xs font-normal uppercase tracking-[0.08em] text-muted-foreground">N° facture</th>
            <th className="text-left px-4 py-3 text-xs font-normal uppercase tracking-[0.08em] text-muted-foreground">Client</th>
            <th className="text-left px-4 py-3 text-xs font-normal uppercase tracking-[0.08em] text-muted-foreground hidden md:table-cell">Échéance</th>
            <th className="text-left px-4 py-3 text-xs font-normal uppercase tracking-[0.08em] text-muted-foreground hidden sm:table-cell">Retard</th>
            <th className="text-right px-4 py-3 text-xs font-normal uppercase tracking-[0.08em] text-muted-foreground">Reste dû</th>
            <th className="text-left px-4 py-3 text-xs font-normal uppercase tracking-[0.08em] text-muted-foreground">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {invoices.map(inv => {
            const company = inv.company as InvoiceRow['company']
            const remaining = Math.max(0, Number(inv.total) - Number(inv.amount_paid))
            const daysLate = inv.due_date
              ? differenceInDays(new Date(today), new Date(inv.due_date))
              : null

            return (
              <tr key={inv.id} className={`hover:bg-secondary/30 transition-colors ${daysLate !== null && daysLate > 0 ? 'bg-red-50/30' : ''}`}>
                <td className="px-4 py-3">
                  <Link
                    href={`/facturation/${inv.id}`}
                    className="font-mono text-primary hover:underline"
                  >
                    {inv.invoice_number}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{company?.name ?? '—'}</p>
                  {company?.email && (
                    <a
                      href={`mailto:${company.email}`}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {company.email}
                    </a>
                  )}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                  {inv.due_date
                    ? format(new Date(inv.due_date), 'd MMM yyyy', { locale: fr })
                    : '—'}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  {daysLate !== null && daysLate > 0 ? (
                    <span className="text-red-600 font-medium">{daysLate}j</span>
                  ) : daysLate !== null && daysLate <= 0 ? (
                    <span className="text-amber-600">Dans {Math.abs(daysLate)}j</span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  <span className={remaining > 0 ? 'text-red-700' : 'text-emerald-600'}>
                    {remaining > 0 ? formatEuro(remaining) : '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <InvoiceStatusBadge status={inv.status as InvoiceStatus} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
