import Link from 'next/link'
import { Hero } from '@/components/Hero'
import { AtelierSticky } from '@/components/AtelierSticky'
import { Reveal } from '@/components/Reveal'
import { Photo } from '@/components/Photo'
import { Counter } from '@/components/Counter'
import { Drift } from '@/components/Drift'
import { siteConfig } from '@/site.config'

const MARQUEE = [
  'Bintje', 'Charlotte', 'Agata', 'Oignon jaune', 'Oignon rouge',
  'Caisse 2,5 kg', 'Sac 5 kg', 'Big bag 25 kg', 'Palette Europe',
]

export default function HomePage() {
  return (
    <>
      <Hero />

      {/* ── Bandeau défilant : le vocabulaire de la maison ─────────────── */}
      <div className="overflow-hidden border-y border-bone bg-paper py-4">
        <div className="marquee-track flex w-max gap-10 whitespace-nowrap">
          {[...MARQUEE, ...MARQUEE].map((word, i) => (
            <span
              key={`${word}-${i}`}
              className="flex items-center gap-10 text-[11px] font-medium uppercase tracking-label text-ink/45"
            >
              {word}
              <span aria-hidden className="size-1 rounded-full bg-field/60" />
            </span>
          ))}
        </div>
      </div>

      {/* ── L'origine ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal variant="rise" className="lg:col-span-5">
            <p className="text-[11px] font-medium uppercase tracking-label text-field">
              Notre origine
            </p>
            <h2 className="mt-4 font-display text-[clamp(2rem,5vw,3.75rem)] font-black uppercase leading-[0.92] tracking-tightest">
              Ça a commencé
              <br />
              par du chicon
            </h2>
          </Reveal>

          <div className="flex flex-col gap-6 lg:col-span-6 lg:col-start-7">
            <Reveal delay={80}>
              <p className="max-w-measure text-[17px] leading-relaxed">
                Dans le Cambrésis, la famille Chopin a d&apos;abord cultivé l&apos;endive.
                Le geste s&apos;est transmis, l&apos;exploitation s&apos;est agrandie, et le
                bâtiment qui accueillait les bacs de forçage abrite aujourd&apos;hui
                une ligne de conditionnement.
              </p>
            </Reveal>
            <Reveal delay={160}>
              <p className="max-w-measure text-[15px] leading-relaxed text-ink/65">
                On n&apos;a rien renié : la même exigence sur le tri, la même
                impatience à voir partir un lot propre. Simplement, on la met
                désormais au service de la pomme de terre et de l&apos;oignon, pour
                des distributeurs, des grossistes et des commerces de proximité.
              </p>
            </Reveal>

            <Reveal delay={240} className="mt-2">
              <Link
                href="/histoire"
                className="inline-flex items-center gap-2 border-b border-field pb-1 text-[11px] font-semibold uppercase tracking-label text-field"
              >
                Notre histoire
                <span aria-hidden>→</span>
              </Link>
            </Reveal>
          </div>
        </div>

        <Reveal variant="image" delay={120} className="mt-14 block overflow-hidden lg:mt-20">
          <Drift speed={0.05} className="block">
            <Photo
              src="/images/photos/endives.jpg"
              alt="Cueillette d'endives sur les bacs de forçage"
              brief="La cueillette d'endives, polo vert, bacs empilés"
              className="aspect-[21/9] w-full scale-[1.12]"
            />
          </Drift>
        </Reveal>

        {/* Chiffres — alignés à gauche, pas de tuiles décoratives. */}
        <div className="mt-14 grid gap-8 border-t border-bone pt-10 sm:grid-cols-3 lg:mt-20">
          {siteConfig.figures.map((figure, i) => (
            <Reveal key={figure.label} delay={i * 90} className="flex flex-col gap-1">
              <span className="font-display text-[clamp(2.5rem,6vw,4rem)] font-black leading-none tracking-tightest text-field">
                <Counter to={figure.value} format={figure.value > 1900 ? 'year' : 'plain'} />
              </span>
              <span className="text-[13px] text-ink/60">{figure.label}</span>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── L'atelier, en épinglé ──────────────────────────────────────── */}
      <AtelierSticky />

      {/* ── Produits ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
        <Reveal variant="rise">
          <p className="text-[11px] font-medium uppercase tracking-label text-field">
            Ce que nous travaillons
          </p>
          <h2 className="mt-4 max-w-[14ch] font-display text-[clamp(2rem,5vw,3.75rem)] font-black uppercase leading-[0.92] tracking-tightest">
            Ce qui sort de la ligne
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3 lg:gap-12">
          {siteConfig.products.map((produit, i) => (
            <Reveal key={produit.slug} delay={i * 120} className="flex flex-col">
              <Drift speed={0.03} tilt={[-1.6, 1.1, -0.8][i % 3]} className="block">
                <Photo
                  src={produit.photo}
                  alt={produit.alt}
                  brief={produit.brief}
                  className="aspect-[4/3] w-full shadow-[0_10px_30px_-18px_rgba(31,26,17,.5)]"
                />
              </Drift>
              <h3 className="mt-7 font-display text-2xl font-bold uppercase tracking-tight">
                {produit.name}
              </h3>
              <p className="mt-3 max-w-measure text-[15px] leading-relaxed text-ink/65">
                {produit.lead}
              </p>
              <Link
                href={`/produits#${produit.slug}`}
                className="mt-4 self-start border-b border-field pb-0.5 text-[11px] font-semibold uppercase tracking-label text-field"
              >
                Calibres et contenants
              </Link>
            </Reveal>
          ))}
        </div>

        <Reveal delay={200} className="mt-12 block">
          <Link
            href="/produits"
            className="inline-flex h-12 items-center bg-ink px-7 text-[11px] font-semibold uppercase tracking-label text-paper transition-colors hover:bg-field"
          >
            Tous nos conditionnements
          </Link>
        </Reveal>
      </section>

      {/* ── Certifications — n'apparaît que si la liste est renseignée ─── */}
      {siteConfig.certifications.length > 0 && (
        <section className="border-y border-bone bg-bone/40 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-[11px] font-medium uppercase tracking-label text-field">
              Nos certifications
            </p>
            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {siteConfig.certifications.map((cert, i) => (
                <Reveal key={cert.name} delay={i * 80} className="flex flex-col gap-1">
                  <span className="font-display text-lg font-bold uppercase tracking-tight">
                    {cert.name}
                  </span>
                  <span className="text-[13px] text-ink/60">{cert.detail}</span>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Contact ────────────────────────────────────────────────────── */}
      <section className="bg-field py-20 text-paper lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-12">
            <Reveal variant="rise" className="lg:col-span-7">
              <h2 className="max-w-[13ch] font-display text-[clamp(2rem,5.5vw,4rem)] font-black uppercase leading-[0.92] tracking-tightest">
                Parlons de vos volumes
              </h2>
            </Reveal>

            <Reveal delay={120} className="flex flex-col gap-6 lg:col-span-5">
              <p className="max-w-measure text-[15px] leading-relaxed text-paper/85">
                Distributeur, grossiste, commerce de proximité : dites-nous vos
                calibres, vos contenants et vos cadences. On vous répond avec un
                prix, pas avec une brochure.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/acces"
                  className="inline-flex h-12 items-center bg-paper px-7 text-[11px] font-semibold uppercase tracking-label text-ink transition-colors hover:bg-paper/90"
                >
                  Demander un accès
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex h-12 items-center border border-paper/40 px-7 text-[11px] font-semibold uppercase tracking-label text-paper transition-colors hover:border-paper"
                >
                  Nous contacter
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}
