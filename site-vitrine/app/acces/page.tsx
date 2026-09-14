import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/PageHero'
import { Reveal } from '@/components/Reveal'
import { AccessRequest } from '@/components/AccessRequest'
import { siteConfig } from '@/site.config'

export const metadata: Metadata = {
  title: "Demander un accès",
  description:
    "L'espace commande est réservé aux professionnels autorisés. Laissez-nous votre adresse et vos vœux de commande : nous vous invitons si votre activité correspond.",
}

const ETAPES = [
  {
    n: '01',
    title: 'Vous déposez une demande',
    body: "Entreprise, adresse e-mail, et ce que vous souhaitez commander. Deux minutes.",
  },
  {
    n: '02',
    title: 'Nous la lisons',
    body: "Quelqu'un de l'exploitation, pas un automate. Nous vérifions que votre activité correspond à la nôtre.",
  },
  {
    n: '03',
    title: 'Vous recevez votre lien',
    body: "Une invitation à usage unique, valable quatorze jours, pour créer votre compte et accéder au catalogue et aux prix.",
  },
]

export default function AccesPage() {
  return (
    <>
      <PageHero
        eyebrow="Espace commande"
        title="Demander un accès"
        lede="Le catalogue, les prix et les commandes sont réservés aux professionnels que nous avons autorisés. C'est ici que ça commence."
        photo={{
          src: '/images/photos/stockage.jpg',
          alt: 'Halle de stockage, caisses palettes prêtes au départ',
          brief: 'La halle de stockage, caisses bois empilées et chariot',
        }}
      />

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">

          {/* ── Le formulaire ─────────────────────────────────────────── */}
          <div className="lg:col-span-7">
            <Reveal variant="rise">
              <p className="text-[11px] font-medium uppercase tracking-label text-field">
                Votre demande
              </p>
              <h2 className="mt-4 font-display text-[clamp(1.85rem,4.5vw,3rem)] uppercase leading-[0.95] text-ink">
                Dites-nous qui vous êtes
              </h2>
            </Reveal>
            <Reveal delay={100} className="relative mt-8 block">
              <AccessRequest />
            </Reveal>
          </div>

          {/* ── Comment ça se passe — une vraie séquence, d'où la numérotation */}
          <div className="flex flex-col gap-8 lg:col-span-4 lg:col-start-9">
            <Reveal>
              <p className="text-[11px] font-medium uppercase tracking-label text-field">
                Ensuite
              </p>
            </Reveal>
            <ol className="flex flex-col divide-y divide-bone border-y border-bone">
              {ETAPES.map((e, i) => (
                <Reveal key={e.n} as="li" delay={i * 90} className="flex gap-4 py-5">
                  <span className="font-display text-xl text-field">{e.n}</span>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="font-display text-lg uppercase leading-none text-ink">{e.title}</h3>
                    <p className="text-[14px] leading-relaxed text-ink/65">{e.body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>

            <Reveal delay={300} className="border-t border-bone pt-6">
              <p className="text-[14px] leading-relaxed text-ink/65">
                Déjà client ? Votre espace vous attend.
              </p>
              <Link
                href={siteConfig.orderAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 border-b border-field pb-1 text-[11px] font-semibold uppercase tracking-label text-field"
              >
                Se connecter
                <span aria-hidden>→</span>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}
