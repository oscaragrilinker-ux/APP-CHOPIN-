'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateDocumentSettings, type DocumentSettingsInput } from '@/lib/actions/documents'
import type { DocumentSettings } from '@/lib/documents/settings'

/**
 * Tout ce qui s'imprime sur les devis, factures et bons — modifiable sans
 * toucher au code. Les champs juridiques sont regroupés en tête : c'est ce
 * qu'un comptable vérifie en premier.
 */
export function DocumentSettingsForm({ initial }: { initial: DocumentSettings }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [f, setF] = useState<DocumentSettingsInput>({
    legal_name: initial.legal_name,
    legal_form: initial.legal_form ?? '',
    siret: initial.siret ?? '',
    vat_number: initial.vat_number ?? '',
    address_line1: initial.address_line1,
    postal_code: initial.postal_code,
    city: initial.city,
    phone: initial.phone ?? '',
    email: initial.email ?? '',
    iban: initial.iban ?? '',
    bic: initial.bic ?? '',
    bank_name: initial.bank_name ?? '',
    quote_validity_days: initial.quote_validity_days,
    payment_terms_text: initial.payment_terms_text,
    late_penalty_text: initial.late_penalty_text,
    invoice_footer: initial.invoice_footer ?? '',
    quote_footer: initial.quote_footer ?? '',
    delivery_footer: initial.delivery_footer ?? '',
  })
  const set = (k: keyof DocumentSettingsInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await updateDocumentSettings(f)
      if ('error' in res) { toast.error('Non enregistré', { description: res.error }); return }
      toast.success('Mentions enregistrées. Les prochains documents les reprennent.')
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Section title="Identité légale" hint="Figure sur chaque facture et bon de livraison. À vérifier sur un Kbis.">
        <Field label="Forme juridique" id="legal_form"><Input id="legal_form" placeholder="SCEA, EARL, SAS…" value={f.legal_form ?? ''} onChange={set('legal_form')} /></Field>
        <Field label="Raison sociale" id="legal_name" span><Input id="legal_name" required value={f.legal_name} onChange={set('legal_name')} /></Field>
        <Field label="SIRET" id="siret"><Input id="siret" inputMode="numeric" placeholder="14 chiffres" value={f.siret ?? ''} onChange={set('siret')} /></Field>
        <Field label="TVA intracommunautaire" id="vat_number"><Input id="vat_number" placeholder="FR12345678901" value={f.vat_number ?? ''} onChange={set('vat_number')} /></Field>
      </Section>

      <Section title="Coordonnées">
        <Field label="Adresse" id="address_line1" span><Input id="address_line1" required value={f.address_line1} onChange={set('address_line1')} /></Field>
        <Field label="Code postal" id="postal_code"><Input id="postal_code" required value={f.postal_code} onChange={set('postal_code')} /></Field>
        <Field label="Ville" id="city"><Input id="city" required value={f.city} onChange={set('city')} /></Field>
        <Field label="Téléphone" id="phone"><Input id="phone" value={f.phone ?? ''} onChange={set('phone')} /></Field>
        <Field label="E-mail" id="email"><Input id="email" type="email" value={f.email ?? ''} onChange={set('email')} /></Field>
      </Section>

      <Section title="Règlement" hint="Les coordonnées bancaires apparaissent sur la facture dès qu'elles sont renseignées.">
        <Field label="Banque" id="bank_name"><Input id="bank_name" value={f.bank_name ?? ''} onChange={set('bank_name')} /></Field>
        <Field label="BIC" id="bic"><Input id="bic" value={f.bic ?? ''} onChange={set('bic')} /></Field>
        <Field label="IBAN" id="iban" span><Input id="iban" className="font-mono" value={f.iban ?? ''} onChange={set('iban')} /></Field>
        <Field label="Conditions de paiement" id="payment_terms_text" span><Textarea id="payment_terms_text" rows={2} value={f.payment_terms_text} onChange={set('payment_terms_text')} /></Field>
        <Field label="Mention pénalités de retard" id="late_penalty_text" span><Textarea id="late_penalty_text" rows={3} value={f.late_penalty_text} onChange={set('late_penalty_text')} /></Field>
      </Section>

      <Section title="Devis">
        <Field label="Validité (jours)" id="quote_validity_days"><Input id="quote_validity_days" type="number" min={1} max={365} value={f.quote_validity_days} onChange={set('quote_validity_days')} /></Field>
        <Field label="Mention en bas de devis" id="quote_footer" span><Textarea id="quote_footer" rows={2} value={f.quote_footer ?? ''} onChange={set('quote_footer')} /></Field>
      </Section>

      <Section title="Mentions libres">
        <Field label="Bas de facture" id="invoice_footer" span><Textarea id="invoice_footer" rows={2} placeholder="Ex. : TVA non applicable… / Escompte pour paiement anticipé : néant." value={f.invoice_footer ?? ''} onChange={set('invoice_footer')} /></Field>
        <Field label="Bas de bon de livraison" id="delivery_footer" span><Textarea id="delivery_footer" rows={2} value={f.delivery_footer ?? ''} onChange={set('delivery_footer')} /></Field>
      </Section>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 size={15} className="mr-2 animate-spin" /> : <Save size={15} className="mr-2" />}
          Enregistrer les mentions
        </Button>
      </div>
    </form>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{title}</p>
      {hint && <p className="text-xs text-muted-foreground/80 mt-1">{hint}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

function Field({ label, id, span, children }: { label: string; id: string; span?: boolean; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${span ? 'sm:col-span-2' : ''}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}
