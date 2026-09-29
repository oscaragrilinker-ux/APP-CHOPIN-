import { createServiceClient } from '@/lib/supabase/service'
import { BRAND } from '@/lib/brand'

/**
 * Mentions portées par les documents (devis, factures, bons).
 *
 * Une seule ligne en base (`document_settings`, migration 00022), modifiable
 * par un admin dans Paramètres. Ce qui engage juridiquement — raison sociale,
 * SIRET, TVA, conditions de règlement — ne doit jamais vivre dans le code.
 */
export type DocumentSettings = {
  legal_name: string
  legal_form: string | null
  siret: string | null
  vat_number: string | null
  address_line1: string
  postal_code: string
  city: string
  phone: string | null
  email: string | null
  iban: string | null
  bic: string | null
  bank_name: string | null
  quote_validity_days: number
  payment_terms_text: string
  late_penalty_text: string
  invoice_footer: string | null
  quote_footer: string | null
  delivery_footer: string | null
}

const FALLBACK: DocumentSettings = {
  legal_name: BRAND.legalName,
  legal_form: null,
  siret: null,
  vat_number: null,
  address_line1: BRAND.address.street,
  postal_code: BRAND.address.zip,
  city: BRAND.address.city,
  phone: null,
  email: BRAND.contactEmail,
  iban: null,
  bic: null,
  bank_name: null,
  quote_validity_days: 30,
  payment_terms_text: 'Paiement à 30 jours date de facture, par virement bancaire.',
  late_penalty_text:
    "En cas de retard de paiement, pénalités au taux de 3 fois le taux d'intérêt légal et indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 du Code de commerce).",
  invoice_footer: null,
  quote_footer: null,
  delivery_footer: null,
}

/**
 * Lecture avec le client service : les PDF sont produits côté serveur pour
 * des rôles qui n'ont pas tous le droit de lire la table (un client pro
 * télécharge sa facture sans voir les paramètres de l'exploitation).
 */
export async function getDocumentSettings(): Promise<DocumentSettings> {
  const service = createServiceClient()
  const { data } = await service
    .from('document_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()
  if (!data) return FALLBACK
  const row = data as unknown as Partial<DocumentSettings>
  return { ...FALLBACK, ...row }
}

/** Ligne d'identité imprimée en pied de chaque document. */
export function legalLine(s: DocumentSettings): string {
  return [
    [s.legal_form, s.legal_name].filter(Boolean).join(' '),
    `${s.address_line1}, ${s.postal_code} ${s.city}`,
    s.siret ? `SIRET ${s.siret}` : null,
    s.vat_number ? `TVA ${s.vat_number}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}
