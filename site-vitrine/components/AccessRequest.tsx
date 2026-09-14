'use client'

import { useState, type FormEvent } from 'react'
import { createClient } from '@supabase/supabase-js'

/**
 * Demande d'accès à l'espace commande.
 *
 * Le site est public, l'application ne l'est pas. Ce formulaire est le sas :
 * un prospect laisse son adresse et ses vœux de commande, et c'est
 * l'exploitation qui décide de l'inviter. Aucun compte ne se crée ici.
 *
 * Le dépôt passe par la clé publique Supabase, dont le seul droit sur cette
 * table est l'insertion d'une demande vierge (migration 00021). Rien ne peut
 * être relu ni modifié depuis le navigateur.
 */

type Etat = 'saisie' | 'envoi' | 'envoye' | 'erreur'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  { auth: { persistSession: false } },
)

const champ =
  'w-full border border-bone bg-paper px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-field'
const etiquette = 'block text-[10px] font-semibold uppercase tracking-label text-ink/55'

export function AccessRequest() {
  const [etat, setEtat] = useState<Etat>('saisie')
  const [erreur, setErreur] = useState<string | null>(null)

  async function envoyer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const donnees = new FormData(form)

    // Pot de miel : un humain ne voit pas ce champ, un robot le remplit.
    if (String(donnees.get('site') ?? '').length > 0) {
      setEtat('envoye')
      return
    }

    setEtat('envoi')
    setErreur(null)

    const { error } = await supabase.from('access_requests').insert({
      email:        String(donnees.get('email') ?? ''),
      company_name: String(donnees.get('company') ?? ''),
      contact_name: String(donnees.get('contact') ?? '') || null,
      phone:        String(donnees.get('phone') ?? '') || null,
      wishes:       String(donnees.get('wishes') ?? '') || null,
    })

    if (error) {
      setEtat('erreur')
      setErreur(
        error.code === '23505'
          ? "Une demande est déjà en cours pour cette adresse. Nous revenons vers vous rapidement."
          : error.code === '22023'
            ? "L'adresse e-mail n'a pas l'air valide."
            : "L'envoi a échoué. Réessayez, ou écrivez-nous directement.",
      )
      return
    }

    form.reset()
    setEtat('envoye')
  }

  if (etat === 'envoye') {
    return (
      <div className="border border-field bg-field/10 p-7" role="status">
        <p className="font-display text-2xl uppercase text-ink">Demande reçue</p>
        <p className="mt-3 max-w-measure text-[15px] leading-relaxed text-ink/75">
          Nous la lisons nous-mêmes, pas un automate. Si votre activité correspond
          à ce que nous faisons, vous recevrez un lien d&apos;invitation pour créer
          votre compte — généralement sous deux jours ouvrés.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-5" noValidate>
      {/* Pot de miel — hors écran et hors tabulation, jamais annoncé. */}
      <div aria-hidden className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
        <label>
          Votre site
          <input type="text" name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="ar-company" className={etiquette}>Entreprise *</label>
          <input id="ar-company" name="company" required minLength={2} maxLength={160}
                 autoComplete="organization" className={champ} placeholder="Primeurs Martin" />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="ar-email" className={etiquette}>E-mail professionnel *</label>
          <input id="ar-email" name="email" type="email" required maxLength={254}
                 autoComplete="email" className={champ} placeholder="achats@votre-entreprise.fr" />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="ar-contact" className={etiquette}>Votre nom</label>
          <input id="ar-contact" name="contact" maxLength={120}
                 autoComplete="name" className={champ} placeholder="Prénom et nom" />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="ar-phone" className={etiquette}>Téléphone</label>
          <input id="ar-phone" name="phone" type="tel" maxLength={30}
                 autoComplete="tel" className={champ} placeholder="06 12 34 56 78" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="ar-wishes" className={etiquette}>Vos vœux de commande</label>
        <textarea id="ar-wishes" name="wishes" rows={4} maxLength={2000}
                  className={`${champ} resize-y`}
                  placeholder="Produits, calibres, contenants, volumes et cadence de livraison. Plus c'est précis, plus la réponse l'est." />
      </div>

      {erreur && (
        <p role="alert" className="border-l-2 border-rust bg-rust/10 px-4 py-3 text-[14px] text-ink">
          {erreur}
        </p>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[46ch] text-[12px] leading-relaxed text-ink/55">
          Réservé aux professionnels. Vos coordonnées ne servent qu&apos;à traiter
          cette demande.
        </p>
        <button
          type="submit"
          disabled={etat === 'envoi'}
          className="inline-flex h-12 shrink-0 items-center bg-field px-7 text-[11px] font-semibold uppercase tracking-label text-paper transition-colors hover:bg-ink disabled:opacity-60"
        >
          {etat === 'envoi' ? 'Envoi…' : "Demander un accès"}
        </button>
      </div>
    </form>
  )
}
