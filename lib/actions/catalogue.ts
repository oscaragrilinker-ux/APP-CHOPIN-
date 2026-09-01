'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ActionResult = { error: string } | { success: true }
type ActionResultWithId = { error: string } | { success: true; id: string }

const ADMIN_ROLES = ['admin', 'super_admin'] as const

const URL_RE = /^https?:\/\/.+/

async function assertAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !ADMIN_ROLES.includes(profile.role as (typeof ADMIN_ROLES)[number])) {
    throw new Error('Accès refusé')
  }

  return supabase
}

function skuConflict(msg: string): boolean {
  // Code Postgres 23505 — violation de contrainte unique
  return msg.includes('23505') || msg.includes('formats_sku_unique')
}

// ── Products ───────────────────────────────────────────────

export async function createProduct(formData: FormData): Promise<ActionResult> {
  const name = formData.get('name')?.toString().trim()
  const description = formData.get('description')?.toString().trim() || null
  const image_url = formData.get('image_url')?.toString().trim() || null
  const season = formData.get('season')?.toString().trim() || null
  const tva_rate_str = formData.get('tva_rate')?.toString().trim()

  if (!name) return { error: 'Le nom du produit est requis.' }
  if (image_url && !URL_RE.test(image_url))
    return { error: "L'URL de l'image doit commencer par http:// ou https://" }
  if (!tva_rate_str) return { error: 'Le taux de TVA est requis.' }
  const tva_rate = parseFloat(tva_rate_str)
  if (isNaN(tva_rate) || tva_rate < 0 || tva_rate > 100)
    return { error: 'Le taux de TVA doit être compris entre 0 et 100.' }

  try {
    const supabase = await assertAdmin()
    const { error } = await supabase
      .from('products')
      .insert({ name, description, image_url, season, tva_rate })
    if (error) return { error: error.message }
    revalidatePath('/catalogue')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function updateProduct(id: string, formData: FormData): Promise<ActionResult> {
  const name = formData.get('name')?.toString().trim()
  const description = formData.get('description')?.toString().trim() || null
  const image_url = formData.get('image_url')?.toString().trim() || null
  const season = formData.get('season')?.toString().trim() || null
  const tva_rate_str = formData.get('tva_rate')?.toString().trim()

  if (!name) return { error: 'Le nom du produit est requis.' }
  if (image_url && !URL_RE.test(image_url))
    return { error: "L'URL de l'image doit commencer par http:// ou https://" }
  if (!tva_rate_str) return { error: 'Le taux de TVA est requis.' }
  const tva_rate = parseFloat(tva_rate_str)
  if (isNaN(tva_rate) || tva_rate < 0 || tva_rate > 100)
    return { error: 'Le taux de TVA doit être compris entre 0 et 100.' }

  try {
    const supabase = await assertAdmin()
    const { error } = await supabase
      .from('products')
      .update({ name, description, image_url, season, tva_rate })
      .eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/catalogue')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function archiveProduct(id: string): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin()
    const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/catalogue')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function restoreProduct(id: string): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin()
    const { error } = await supabase.from('products').update({ is_active: true }).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/catalogue')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

// ── Varieties ──────────────────────────────────────────────

export async function createVariety(productId: string, formData: FormData): Promise<ActionResultWithId> {
  const name = formData.get('name')?.toString().trim()
  const description = formData.get('description')?.toString().trim() || null
  const caliber = formData.get('caliber')?.toString().trim() || null
  const quality_grade = formData.get('quality_grade')?.toString().trim() || null
  const tva_rate_str = formData.get('tva_rate')?.toString().trim() || null
  const tva_rate = tva_rate_str ? parseFloat(tva_rate_str) : null

  if (!name) return { error: 'Le nom de la variété est requis.' }
  if (tva_rate !== null && (isNaN(tva_rate) || tva_rate < 0 || tva_rate > 100))
    return { error: 'Le taux de TVA doit être compris entre 0 et 100.' }

  try {
    const supabase = await assertAdmin()
    const { data, error } = await supabase
      .from('varieties')
      .insert({ product_id: productId, name, description, caliber, quality_grade, tva_rate })
      .select('id')
      .single()
    if (error) return { error: error.message }
    revalidatePath('/catalogue')
    return { success: true, id: data.id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function updateVariety(id: string, formData: FormData): Promise<ActionResult> {
  const name = formData.get('name')?.toString().trim()
  const description = formData.get('description')?.toString().trim() || null
  const caliber = formData.get('caliber')?.toString().trim() || null
  const quality_grade = formData.get('quality_grade')?.toString().trim() || null
  const tva_rate_str = formData.get('tva_rate')?.toString().trim() || null
  const tva_rate = tva_rate_str ? parseFloat(tva_rate_str) : null

  if (!name) return { error: 'Le nom de la variété est requis.' }
  if (tva_rate !== null && (isNaN(tva_rate) || tva_rate < 0 || tva_rate > 100))
    return { error: 'Le taux de TVA doit être compris entre 0 et 100.' }

  try {
    const supabase = await assertAdmin()
    const { error } = await supabase
      .from('varieties')
      .update({ name, description, caliber, quality_grade, tva_rate })
      .eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/catalogue')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function archiveVariety(id: string): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin()
    const { error } = await supabase.from('varieties').update({ is_active: false }).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/catalogue')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function restoreVariety(id: string): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin()
    const { error } = await supabase.from('varieties').update({ is_active: true }).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/catalogue')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

// ── Formats ────────────────────────────────────────────────

export async function createFormat(formData: FormData): Promise<ActionResult> {
  const name = formData.get('name')?.toString().trim()
  const description = formData.get('description')?.toString().trim() || null
  const packaging_type = formData.get('packaging_type')?.toString().trim() || null
  const material = formData.get('material')?.toString().trim() || null
  const dimensions = formData.get('dimensions')?.toString().trim() || null
  const sku = formData.get('sku')?.toString().trim() || null
  const weightRaw = formData.get('weight_kg')?.toString().trim()
  const weight_kg = weightRaw ? parseFloat(weightRaw) : null

  if (!name) return { error: 'Le nom du format est requis.' }
  if (weight_kg !== null && weight_kg <= 0) return { error: 'Le poids doit être supérieur à 0.' }

  try {
    const supabase = await assertAdmin()
    const { error } = await supabase
      .from('formats')
      .insert({ name, description, packaging_type, material, dimensions, sku, weight_kg })
    if (error) {
      if (skuConflict(error.message)) return { error: 'Ce SKU existe déjà — choisissez une référence unique.' }
      return { error: error.message }
    }
    revalidatePath('/catalogue')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function setVarietyFormats(varietyId: string, formatIds: string[]): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin()
    const { error: delError } = await supabase
      .from('variety_formats')
      .delete()
      .eq('variety_id', varietyId)
    if (delError) return { error: delError.message }

    if (formatIds.length > 0) {
      const rows = formatIds.map(format_id => ({ variety_id: varietyId, format_id }))
      const { error: insError } = await supabase.from('variety_formats').insert(rows)
      if (insError) return { error: insError.message }
    }

    revalidatePath('/catalogue')
    revalidatePath('/offres')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function updateFormat(id: string, formData: FormData): Promise<ActionResult> {
  const name = formData.get('name')?.toString().trim()
  const description = formData.get('description')?.toString().trim() || null
  const packaging_type = formData.get('packaging_type')?.toString().trim() || null
  const material = formData.get('material')?.toString().trim() || null
  const dimensions = formData.get('dimensions')?.toString().trim() || null
  const sku = formData.get('sku')?.toString().trim() || null
  const weightRaw = formData.get('weight_kg')?.toString().trim()
  const weight_kg = weightRaw ? parseFloat(weightRaw) : null

  if (!name) return { error: 'Le nom du format est requis.' }
  if (weight_kg !== null && weight_kg <= 0) return { error: 'Le poids doit être supérieur à 0.' }

  try {
    const supabase = await assertAdmin()
    const { error } = await supabase
      .from('formats')
      .update({ name, description, packaging_type, material, dimensions, sku, weight_kg })
      .eq('id', id)
    if (error) {
      if (skuConflict(error.message)) return { error: 'Ce SKU existe déjà — choisissez une référence unique.' }
      return { error: error.message }
    }
    revalidatePath('/catalogue')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function archiveFormat(id: string): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin()
    const { error } = await supabase.from('formats').update({ is_active: false }).eq('id', id)
    if (error) {
      const msg = error.message ?? ''
      const match = msg.match(/Impossible d'archiver[^.]+\./)
      return { error: match ? match[0] : 'Archivage impossible : commandes actives liées à ce format.' }
    }
    revalidatePath('/catalogue')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function restoreFormat(id: string): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin()
    const { error } = await supabase.from('formats').update({ is_active: true }).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/catalogue')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}
