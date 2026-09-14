import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CatalogueShell } from '@/components/catalogue/CatalogueShell'
import type { ProductWithTree, FormatFull, Role } from '@/types'
import { BRAND } from '@/lib/brand'

export const metadata = { title: `Catalogue — ${BRAND.name}` }

export default async function CataloguePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')

  const role = profile.role as Role
  const isAdmin = role === 'admin' || role === 'super_admin'

  // Parc de formats global (indépendant des produits)
  const formatsPromise = supabase
    .from('formats')
    .select('*')
    .order('weight_kg', { ascending: true, nullsFirst: false })
    .order('name')

  // Arbre produits → variétés → formats cochés
  const productsQuery = supabase
    .from('products')
    .select(
      `*, varieties(
        *,
        variety_formats(
          format_id,
          format:formats ( id, name, weight_kg, packaging_type, is_active )
        )
      )`,
    )
    .order('name')

  if (!isAdmin) {
    productsQuery.eq('is_active', true)
  }

  const [{ data: allFormats, error: formatsError }, { data: products, error: productsError }] =
    await Promise.all([formatsPromise, productsQuery])

  if (formatsError || productsError) {
    const msg = formatsError?.message ?? productsError?.message
    console.error('[catalogue] fetch error', msg)
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <p className="text-sm text-destructive">Impossible de charger le catalogue.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Catalogue</h1>
        <p className="text-sm text-muted-foreground mt-1 uppercase tracking-[0.1em]">
          Parc de formats · Produits · Variétés
        </p>
      </div>
      <CatalogueShell
        products={(products ?? []) as unknown as ProductWithTree[]}
        allFormats={(allFormats ?? []) as FormatFull[]}
        role={role}
      />
    </div>
  )
}
