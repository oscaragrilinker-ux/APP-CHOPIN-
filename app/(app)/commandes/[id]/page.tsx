import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Download } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { OrderTimeline } from '@/components/commandes/OrderTimeline'
import { OrderStatusBadge } from '@/components/commandes/OrderStatusBadge'
import { OrderActions } from './OrderActions'
import { CreateInvoiceButton } from '@/components/facturation/CreateInvoiceButton'
import { TransportPanel } from '@/components/commandes/TransportPanel'
import { DocumentsPanel } from '@/components/commandes/DocumentsPanel'
import { formatEuro, formatTonnage, priceBasisLabel } from '@/lib/utils/price'
import { hasPermission, type PermissionOverrides } from '@/lib/permissions'
import { ATELIER_ROLES, type Role, type OrderStatus, type PriceBasis, type Carrier, type PalletSheet } from '@/types'

export const dynamic = 'force-dynamic'

type OrderRow = {
  id: string
  product_name: string
  variety_name: string
  format_name: string
  quantity: number
  status: string
  delivery_date: string | null
  notes: string | null
  created_at: string
  company_name?: string
  company?: {
    id: string
    name: string
    address_line1?: string | null
    postal_code?: string | null
    city?: string | null
  } | null
  unit_price?: number
  total_price?: number
  price_basis?: string | null
  tva_rate?: number | null
  offer?: { id: string; price_basis: string } | null
  // Logistique (absente de la vue conditionnement, d'où l'optionnalité)
  carrier_id?: string | null
  pickup_location?: string | null
  delivery_location?: string | null
  delivery_time?: string | null
  transport_notes?: string | null
  format?: { weight_kg: number | null } | null
}

export default async function CommandeDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, permission_overrides')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')

  const role = profile.role as Role
  const isAdmin = ['admin', 'secretaire', 'super_admin'].includes(role)
  const isConditionnement = ATELIER_ROLES.includes(role)

  const overrides = (profile.permission_overrides ?? {}) as PermissionOverrides
  const canOrganizeTransport = hasPermission(role, 'orders:organize_transport', overrides)

  let o: OrderRow | null = null

  if (isConditionnement) {
    // Vue sans prix pour conditionnement
    const { data, error } = await supabase
      .from('orders_for_conditionnement' as unknown as 'orders')
      .select('id, product_name, variety_name, format_name, quantity, status, delivery_date, notes, created_at, company_name')
      .eq('id', params.id)
      .single()

    if (error || !data) notFound()
    o = data as unknown as OrderRow
  } else {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, product_name, variety_name, format_name, quantity, unit_price, total_price,
        price_basis, tva_rate,
        status, delivery_date, delivery_time, notes, created_at,
        carrier_id, pickup_location, delivery_location, transport_notes,
        company:companies ( id, name, address_line1, postal_code, city ),
        offer:offers ( id, price_basis ),
        format:formats ( weight_kg )
      `)
      .eq('id', params.id)
      .single()

    if (error || !data) notFound()
    o = data as unknown as OrderRow
  }

  const company = o.company as { id: string; name: string } | null
  const companyName = company?.name ?? o.company_name ?? '—'

  // Fiches palette : elles alimentent le récapitulatif transporteur
  // (nombre réel de palettes et de colis, poids pesé).
  const { data: palletRows } = await supabase
    .from('pallet_sheets')
    .select('*')
    .eq('order_id', params.id)
  const pallets = (palletRows ?? []) as PalletSheet[]

  // Facture existante : l'atelier ne la voit jamais (RLS), les autres ont le lien direct.
  const { data: invoiceRow } = isConditionnement
    ? { data: null }
    : await supabase.from('invoices').select('id, invoice_number').eq('order_id', params.id).maybeSingle()
  const canIssueBl = hasPermission(role, 'pallet_sheet:create', overrides)

  const carriers = canOrganizeTransport
    ? ((await supabase.from('carriers').select('*').eq('is_active', true).order('name')).data ?? [])
    : []
  const priceBasis = (
    o.price_basis ?? (o.offer as { price_basis: string } | null)?.price_basis
  ) as PriceBasis | undefined
  const status = o.status as OrderStatus

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/commandes" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-serif text-2xl text-foreground">
              {o.product_name}
              {o.variety_name && <span className="text-muted-foreground"> · {o.variety_name}</span>}
            </h1>
            <OrderStatusBadge status={status} />
          </div>
          {(isAdmin || isConditionnement) && (
            <p className="text-sm text-muted-foreground mt-0.5">{companyName}</p>
          )}
        </div>
      </div>

      {/* Timeline */}
      {status !== 'cancelled' && (
        <div className="px-1">
          <OrderTimeline status={status} />
        </div>
      )}

      {/* Fiche */}
      <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/50">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-border/50">
          <Cell label="Contenant" value={o.format_name || '—'} />
          <Cell label="Quantité" value={`${o.quantity} unité${o.quantity > 1 ? 's' : ''}`} />
          <Cell label="Tonnage" value={formatTonnage(o.quantity, null)} />
          <Cell label="Base de prix" value={priceBasis ? priceBasisLabel(priceBasis) : '—'} />
        </div>

        {!isConditionnement && o.unit_price !== undefined && (
          <div className="grid grid-cols-2 divide-x divide-border/50">
            <Cell label="Prix unitaire" value={formatEuro(o.unit_price)} />
            <Cell label="Total" value={formatEuro(o.total_price ?? 0)} highlight />
          </div>
        )}

        {o.delivery_date && (
          <div className="px-4 py-3 text-sm text-muted-foreground">
            Date de livraison :{' '}
            <strong className="text-foreground">
              {format(new Date(o.delivery_date), 'd MMMM yyyy', { locale: fr })}
            </strong>
          </div>
        )}

        {o.notes && (
          <div className="px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-1">Notes</p>
            <p className="text-sm text-foreground">{o.notes}</p>
          </div>
        )}

        <div className="px-4 py-3 text-xs text-muted-foreground">
          Créée le {format(new Date(o.created_at), 'd MMMM yyyy', { locale: fr })}
        </div>
      </div>

      {/* Palettes préparées */}
      {pallets.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/50">
          <p className="px-4 pt-4 pb-2 text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground">
            Palettes préparées
          </p>
          {pallets.map(p => (
            <div key={p.id} className="px-4 py-3 flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm text-foreground tabular-nums">
                  {p.pallet_count} palette{p.pallet_count > 1 ? 's' : ''}
                  {p.parcel_count ? ` · ${p.parcel_count} colis` : ''}
                  {p.net_weight_kg ? ` · ${Number(p.net_weight_kg).toLocaleString('fr-FR')} kg` : ''}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Lot {p.lot_number}
                  {p.operator_name && ` · préparé par ${p.operator_name}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {p.bl_number && (
                  <span className="font-mono text-xs text-primary">{p.bl_number}</span>
                )}
                <a
                  href={`/api/pdf/pallet-sheet?id=${p.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Download size={12} />
                  Fiche palette
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transport */}
      {!isConditionnement && (
        <TransportPanel
          orderId={o.id}
          carriers={carriers as Carrier[]}
          canEdit={canOrganizeTransport}
          current={{
            carrier_id:        (o.carrier_id as string | null) ?? null,
            pickup_location:   (o.pickup_location as string | null) ?? null,
            delivery_location: (o.delivery_location as string | null) ?? null,
            delivery_date:     (o.delivery_date as string | null) ?? null,
            delivery_time:     (o.delivery_time as string | null) ?? null,
            transport_notes:   (o.transport_notes as string | null) ?? null,
          }}
          shipment={{
            companyName,
            companyAddress: company
              ? [
                  (company as { address_line1?: string }).address_line1,
                  [(company as { postal_code?: string }).postal_code,
                   (company as { city?: string }).city].filter(Boolean).join(' '),
                ].filter(Boolean).join(', ') || null
              : null,
            productLabel: [o.product_name, o.variety_name].filter(Boolean).join(' · '),
            quantity: o.quantity,
            formatName: o.format_name ?? null,
            palletCount: pallets.reduce((s, p) => s + p.pallet_count, 0) || null,
            parcelCount: pallets.reduce((s, p) => s + (p.parcel_count ?? 0), 0) || null,
            weightKg:
              pallets.reduce((s, p) => s + Number(p.net_weight_kg ?? 0), 0) ||
              ((o.format as { weight_kg: number | null } | null)?.weight_kg
                ? o.quantity * Number((o.format as { weight_kg: number }).weight_kg)
                : null),
          }}
        />
      )}

      {/* Documents de la commande */}
      <DocumentsPanel
        orderId={o.id}
        offerId={isConditionnement ? null : ((o.offer as { id: string } | null)?.id ?? null)}
        invoice={invoiceRow ? { id: invoiceRow.id as string, number: invoiceRow.invoice_number as string } : null}
        sheetCount={pallets.length}
        issuedCount={pallets.filter(p => !!p.bl_number).length}
        atelier={isConditionnement}
        canIssue={canIssueBl}
      />

      {/* Lien offre source */}
      {!isConditionnement && (o.offer as { id: string } | null)?.id && (
        <Link
          href={`/offres/${(o.offer as { id: string }).id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <FileText size={14} />
          Voir la négociation source
        </Link>
      )}

      {/* Émettre facture (commande livrée + admin) */}
      {isAdmin && status === 'delivered' && !isConditionnement && (
        <FactureSection orderId={o.id} />
      )}

      {/* Actions */}
      {(isAdmin || isConditionnement) && !['delivered', 'cancelled'].includes(status) && (
        <OrderActions orderId={o.id} currentStatus={status} role={role} />
      )}
    </div>
  )
}

async function FactureSection({ orderId }: { orderId: string }) {
  const supabase = await (await import('@/lib/supabase/server')).createClient()
  const { data: existing } = await supabase
    .from('invoices')
    .select('id, invoice_number')
    .eq('order_id', orderId)
    .maybeSingle()

  if (existing) {
    return (
      <Link
        href={`/facturation/${existing.id}`}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-emerald-200 bg-emerald-50/50 text-sm text-emerald-700 hover:bg-emerald-100/50 transition-colors"
      >
        <FileText size={14} />
        Voir facture {existing.invoice_number}
      </Link>
    )
  }

  return <CreateInvoiceButton orderId={orderId} />
}

function Cell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className={`mt-0.5 ${highlight ? 'font-serif text-xl text-foreground' : 'text-sm font-medium text-foreground'}`}>
        {value}
      </p>
    </div>
  )
}
