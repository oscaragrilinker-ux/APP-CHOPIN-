import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/PageHero'
import { Reveal } from '@/components/Reveal'
import { Photo } from '@/components/Photo'

export const metadata: Metadata = {
  title: "Notre histoire",
  description:
    "De la ferme d'endives du Cambrésis à l'atelier de conditionnement : trois générations de la famille Chopin à Beaumetz-lès-Cambrai.",
}

const ETAPES = [
  {
    when: 'Au départ',
    title: "L'endive",
    body:
      "Sur les terres de Beaumetz-lès-Cambrai, la famille cultive le chicon. Un légume qui ne pardonne rien : il se force dans le noir, se cueille à la main, se casse et s'effeuille pièce par pièce.",
  },
  {
    when: 'Puis',
    title: 'Le geste transmis',
    body:
      "Trier, calibrer, conditionner. Ces gestes-là ne s'apprennent pas dans un manuel — ils se prennent en regardant faire, saison après saison, et se corrigent sur le tas.",
  },
  {
    when: 'Ensuite',
    title: 'La pomme de terre et l’oignon',
    body:
      "Le bâtiment de forçage devient un atelier de conditionnement. Le savoir-faire reste, le produit change : deux cultures majeures des Hauts-de-France, travaillées avec la même exigence.",
  },
  {
    when: "Aujourd'hui",
    title: 'Un outil professionnel',
    body:
      "Une ligne de tri et de calibrage, des chambres froides, un quai. Et derrière, toujours la même famille, qui répond au téléphone et connaît chaque parcelle.",
  },
]

export default function HistoirePage() {
  return (
    <>
      <PageHero
        eyebrow="Notre histoire"
        title="Ça a commencé par du chicon"
        lede="De la ferme d'endives du Cambrésis à l'atelier d'aujourd'hui, la même famille et les mêmes exigences."
        photo={{
          src: '/images/photos/endives.jpg',
          alt: "Cueillette d'endives sur les bacs de forçage",
          brief: "La cueillette d'endives, polo vert, bacs empilés",
        }}
      />

      {/* ── Le récit ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-5">
            <p className="text-[11px] font-medium uppercase tracking-label text-field">
              Les racines
            </p>
            <h2 className="mt-4 font-display text-[clamp(1.85rem,4.5vw,3.25rem)] font-black uppercase leading-[0.92] tracking-tightest">
              Une affaire de terre et de patience
            </h2>
          </Reveal>

          <div className="flex flex-col gap-6 lg:col-span-6 lg:col-start-7">
            <Reveal delay={80}>
              <p className="max-w-measure text-[17px] leading-relaxed">
                L&apos;endive, dans le Nord, on l&apos;appelle le chicon. C&apos;est un légume
                exigeant : on le force dans l&apos;obscurité, on le cueille à la main, on
                l&apos;effeuille un par un. Rien ne s&apos;automatise vraiment.
              </p>
            </Reveal>
            <Reveal delay={160}>
              <p className="max-w-measure text-[15px] leading-relaxed text-ink/65">
                C&apos;est là que la maison a appris ce qu&apos;elle sait faire de mieux :
                regarder un produit et décider s&apos;il part ou s&apos;il reste. Cette
                exigence-là s&apos;est simplement déplacée vers la pomme de terre et
                l&apos;oignon, sans rien perdre en route.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Les étapes — une vraie chronologie, d'où la numérotation ───── */}
      <section className="border-y border-bone bg-bone/30 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <p className="text-[11px] font-medium uppercase tracking-label text-field">
              Le chemin
            </p>
            <h2 className="mt-4 max-w-[13ch] font-display text-[clamp(1.85rem,4.5vw,3.25rem)] font-black uppercase leading-[0.92] tracking-tightest">
              Trois générations, un même bâtiment
            </h2>
          </Reveal>

          <ol className="mt-12 grid gap-px bg-bone sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
            {ETAPES.map((etape, i) => (
              <Reveal
                key={etape.title}
                as="li"
                delay={i * 90}
                className="flex flex-col gap-3 bg-paper p-7"
              >
                <span className="text-[11px] font-semibold uppercase tracking-label text-field">
                  {etape.when}
                </span>
                <h3 className="font-display text-xl font-bold uppercase tracking-tight">
                  {etape.title}
                </h3>
                <p className="text-[14px] leading-relaxed text-ink/65">{etape.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── L'ADN ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal variant="image">
            <Photo
              src="/images/photos/aerienne.jpg"
              alt="Vue aérienne de la récolte, le village à l'horizon"
              brief="La vue aérienne au soleil rasant, village à l'horizon"
              className="aspect-[4/5] w-full"
            />
          </Reveal>

          <div className="flex flex-col gap-5">
            <Reveal delay={80}>
              <p className="text-[11px] font-medium uppercase tracking-label text-field">
                Ce qui n&apos;a pas changé
              </p>
              <h2 className="mt-4 max-w-[14ch] font-display text-[clamp(1.85rem,4.5vw,3.25rem)] font-black uppercase leading-[0.92] tracking-tightest">
                Le champ est à côté de l&apos;atelier
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="max-w-measure text-[15px] leading-relaxed text-ink/65">
                Ce n&apos;est pas un argument marketing, c&apos;est une contrainte de terrain
                qu&apos;on a transformée en avantage : moins de route entre l&apos;arrachage et
                le tri, moins de manutention, moins de casse. Un lot qui sort d&apos;ici a
                rarement passé plus d&apos;une journée hors de la terre.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <Link
                href="/usine"
                className="inline-flex items-center gap-2 border-b border-field pb-1 text-[11px] font-semibold uppercase tracking-label text-field"
              >
                Voir l&apos;atelier
                <span aria-hidden>→</span>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}
