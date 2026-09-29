import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/PageHero'
import { Reveal } from '@/components/Reveal'
import { Photo } from '@/components/Photo'
import { siteConfig } from '@/site.config'

export const metadata: Metadata = {
  title: 'Nos produits',
  description:
    'Pommes de terre et oignons triés et calibrés dans les Hauts-de-France. Caisses 2,5 kg, sacs 5 kg, big bags 25 kg.',
}

export default function ProduitsPage() {
  return (
    <>
      <PageHero
        eyebrow="Nos produits"
        title="Triés, calibrés, prêts à poser en rayon"
        lede="Dites-nous le calibre, le contenant et la cadence. On vous répond avec un prix, pas avec une brochure."
        photo={{
          src: '/images/photos/oignons.jpg',
          alt: "Gros plan d'oignons jaunes",
          brief: "Gros plan d'oignons jaunes, cadrage carré",
        }}
      />

      {/* ── Les produits, un par bande ─────────────────────────────────── */}
      {siteConfig.products.map((produit, i) => (
        <section
          key={produit.slug}
          id={produit.slug}
          className={i % 2 === 1 ? 'border-y border-bone bg-bone/30' : ''}
        >
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div
              className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
                i % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''
              }`}
            >
              <Reveal variant="image">
                <Photo
                  src={produit.photo}
                  alt={produit.alt}
                  brief={produit.brief}
                  className="aspect-square w-full"
                />
              </Reveal>

              <div className="flex flex-col gap-6">
                <Reveal delay={80}>
                  <p className="text-[11px] font-medium uppercase tracking-label text-field">
                    {String(i + 1).padStart(2, '0')} · Produit
                  </p>
                  <h2 className="mt-3 font-display text-[clamp(1.85rem,4.5vw,3.25rem)] font-black uppercase leading-[0.92] tracking-tightest">
                    {produit.name}
                  </h2>
                  <p className="mt-4 max-w-measure text-[15px] leading-relaxed text-ink/70">
                    {produit.lead}
                  </p>
                </Reveal>

                <Reveal delay={160} className="grid gap-6 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-label text-ink/45">
                      Variétés
                    </span>
                    <ul className="flex flex-col gap-1.5">
                      {produit.varieties.map(v => (
                        <li key={v} className="text-[14px] text-ink/75">
                          {v}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-label text-ink/45">
                      Conditionnements
                    </span>
                    <ul className="flex flex-col gap-1.5">
                      {produit.formats.map(f => (
                        <li key={f} className="text-[14px] text-ink/75">
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* ── Sur mesure ─────────────────────────────────────────────────── */}
      <section className="bg-night py-20 text-paper lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-12">
            <Reveal className="lg:col-span-7">
              <p className="text-[11px] font-medium uppercase tracking-label text-field">
                Sur demande
              </p>
              <h2 className="mt-4 max-w-[14ch] font-display text-[clamp(1.85rem,5vw,3.5rem)] font-black uppercase leading-[0.92] tracking-tightest">
                Un calibre qui n&apos;est pas dans la liste ?
              </h2>
            </Reveal>

            <Reveal delay={120} className="flex flex-col gap-6 lg:col-span-5">
              <p className="max-w-measure text-[15px] leading-relaxed text-paper/75">
                La ligne se règle. Contenants à votre marque, calibres particuliers,
                palettisation selon votre plateforme : dites-nous ce dont vous avez besoin et
                on vous dit si on sait le faire.
              </p>
              <div>
                <Link
                  href="/contact"
                  className="inline-flex h-12 items-center bg-field px-7 text-[11px] font-semibold uppercase tracking-label text-paper transition-colors hover:bg-field/85"
                >
                  Nous en parler
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}
