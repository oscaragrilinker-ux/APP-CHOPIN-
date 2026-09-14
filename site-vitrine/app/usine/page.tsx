import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/PageHero'
import { AtelierSticky } from '@/components/AtelierSticky'
import { Reveal } from '@/components/Reveal'
import { Photo } from '@/components/Photo'

export const metadata: Metadata = {
  title: "L'atelier",
  description:
    'Réception, tri, calibrage, mise au froid et expédition : la ligne de conditionnement de pommes de terre et oignons à Beaumetz-lès-Cambrai.',
}

const MOYENS = [
  {
    title: 'Une ligne, pas un entrepôt',
    body:
      "Réception, déterrage, brossage, calibrage et mise en contenant s'enchaînent sans rupture. Le lot ne stationne pas entre deux opérations.",
  },
  {
    title: 'Le calibre est un engagement',
    body:
      "Ce qui part en caisse correspond à ce qui a été commandé. Les écarts sortent de la ligne plutôt que de finir dans le fond d'une palette.",
  },
  {
    title: 'Froid immédiat',
    body:
      "Chambres froides sur place : le produit est refroidi dès la sortie de ligne, ce qui lui donne sa tenue en rayon.",
  },
  {
    title: 'Traçable au lot',
    body:
      "Chaque palette porte son numéro de lot et sa variété. On sait de quelle parcelle elle vient et quel jour elle est sortie.",
  },
]

export default function UsinePage() {
  return (
    <>
      <PageHero
        eyebrow="L'atelier"
        title="Là où le lot devient une palette"
        lede="Réception, tri, calibrage, froid, expédition. Cinq opérations, un seul bâtiment, à quelques centaines de mètres des parcelles."
        photo={{
          src: '/images/photos/calibrage.jpg',
          alt: 'Ligne de calibrage en fonctionnement',
          brief: 'La ligne de calibrage, oignons en cascade, opérateur en bonnet',
        }}
      />

      <AtelierSticky />

      {/* ── Ce que ça change pour l'acheteur ───────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <Reveal>
          <p className="text-[11px] font-medium uppercase tracking-label text-field">
            Ce que ça change pour vous
          </p>
          <h2 className="mt-4 max-w-[15ch] font-display text-[clamp(1.85rem,4.5vw,3.25rem)] font-black uppercase leading-[0.92] tracking-tightest">
            Quatre choses qu&apos;on ne négocie pas
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-px border border-bone bg-bone sm:grid-cols-2 lg:mt-16">
          {MOYENS.map((moyen, i) => (
            <Reveal
              key={moyen.title}
              delay={i * 80}
              className="flex flex-col gap-3 bg-paper p-8"
            >
              <h3 className="font-display text-xl font-bold uppercase tracking-tight">
                {moyen.title}
              </h3>
              <p className="max-w-measure text-[14px] leading-relaxed text-ink/65">
                {moyen.body}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Réception ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-5">
            <Reveal>
              <p className="text-[11px] font-medium uppercase tracking-label text-field">
                À la réception
              </p>
              <h2 className="mt-4 max-w-[14ch] font-display text-[clamp(1.85rem,4.5vw,3.25rem)] font-black uppercase leading-[0.92] tracking-tightest">
                La benne se vide, la ligne démarre
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="max-w-measure text-[15px] leading-relaxed text-ink/65">
                Le lot est pesé et identifié à l&apos;entrée, puis versé sur la trémie
                d&apos;alimentation. À partir de là, tout est suivi : ce qui entre sous un
                numéro ressort sous le même numéro, avec son tonnage réel et son nombre de
                contenants.
              </p>
            </Reveal>
            <Reveal delay={180}>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 border-b border-field pb-1 text-[11px] font-semibold uppercase tracking-label text-field"
              >
                Organiser un enlèvement
                <span aria-hidden>→</span>
              </Link>
            </Reveal>
          </div>

          <Reveal variant="image" delay={80}>
            <Photo
              src="/images/photos/reception.jpg"
              alt="Réception des oignons sur la trémie d'alimentation"
              brief="La réception des oignons, machine rouge CASA à l'intérieur"
              className="aspect-[4/3] w-full"
            />
          </Reveal>
        </div>
      </section>
    </>
  )
}
