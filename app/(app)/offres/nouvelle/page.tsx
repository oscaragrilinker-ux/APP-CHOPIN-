import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { OfferWizard } from '@/components/offres/OfferWizard'
import { BRAND } from '@/lib/brand'

export const metadata = { title: `Nouvelle offre — ${BRAND.name}` }

export default async function NouvelleOffrePage({
  searchParams,
}: {
  searchParams: { v?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'client_pro') redirect('/offres')

  const varietyId = searchParams.v

  if (!varietyId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Nouvelle offre</h1>
        </div>
        <div className="rounded-2xl border border-dashed border-border/60 p-16 text-center">
          <p className="font-serif text-2xl text-muted-foreground mb-3">
            Choisissez une variété dans le catalogue
          </p>
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowLeft size={14} />
            Voir le catalogue
          </Link>
        </div>
      </div>
    )
  }

  // Fetch variety + formats
  const { data: variety, error } = await supabase
    .from('varieties')
    .select(`
      *,
      product:products ( id, name, image_url, season ),
      variety_formats (
        format_id,
        format:formats ( id, name, weight_kg, packaging_type, is_active )
      )
    `)
    .eq('id', varietyId)
    .eq('is_active', true)
    .single()

  if (error || !variety) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Nouvelle offre</h1>
        </div>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive">Variété introuvable ou indisponible.</p>
          <Link href="/catalogue" className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <ArrowLeft size={14} />
            Retour au catalogue
          </Link>
        </div>
      </div>
    )
  }

  const product = variety.product as { id: string; name: string; image_url: string | null; season: string | null }

  const formats = variety.variety_formats
    .map((vf: { format: { id: string; name: string; weight_kg: number | null; packaging_type: string | null; is_active: boolean } | null }) => vf.format)
    .filter((f: { is_active: boolean } | null): f is NonNullable<typeof f> => f !== null && f.is_active)
    .sort((a: { weight_kg: number | null; name: string }, b: { weight_kg: number | null; name: string }) => {
      const wA = a.weight_kg ?? Infinity
      const wB = b.weight_kg ?? Infinity
      if (wA !== wB) return wA - wB
      return a.name.localeCompare(b.name)
    })

  if (!formats.length) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Nouvelle offre</h1>
        </div>
        <div className="rounded-xl border border-border/60 bg-secondary/30 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Aucun contenant disponible pour cette variété. Contactez {BRAND.name}.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/catalogue" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="font-serif text-3xl text-foreground">Nouvelle offre</h1>
          <p className="text-sm text-muted-foreground mt-0.5 uppercase tracking-[0.1em]">
            Proposition d&apos;achat · {BRAND.name}
          </p>
        </div>
      </div>

      <OfferWizard
        product={product}
        variety={variety as never}
        formats={formats}
      />
    </div>
  )
}
