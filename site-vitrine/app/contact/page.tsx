import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/PageHero'
import { Reveal } from '@/components/Reveal'
import { ContactForm } from '@/components/ContactForm'
import { siteConfig } from '@/site.config'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    "Nous joindre à Beaumetz-lès-Cambrai : téléphone, e-mail et formulaire. Réponse avec un prix, pas avec une brochure.",
}

const mapsEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
  siteConfig.mapsQuery
)}&output=embed`

export default function ContactPage() {
  const tel = siteConfig.contactPhone.replace(/\s/g, '')

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Dites-nous ce qu'il vous faut"
        lede="Calibres, contenants, volumes, cadence de livraison. Plus c'est précis, plus la réponse l'est."
        photo={{
          src: '/images/photos/stockage.jpg',
          alt: 'Halle de stockage, caisses palettes prêtes au départ',
          brief: 'La halle de stockage, caisses bois empilées et chariot',
        }}
      />

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">

          {/* ── Coordonnées ──────────────────────────────────────────── */}
          <div className="flex flex-col gap-10 lg:col-span-5">
            <Reveal>
              <p className="text-[11px] font-medium uppercase tracking-label text-field">
                Nous joindre
              </p>
              <h2 className="mt-4 font-display text-[clamp(1.85rem,4.5vw,3rem)] font-black uppercase leading-[0.92] tracking-tightest">
                {siteConfig.legalName}
              </h2>
            </Reveal>

            <Reveal delay={80} className="flex flex-col gap-5 border-t border-bone pt-8">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-label text-ink/45">
                  Adresse
                </span>
                <address className="not-italic text-[15px] leading-relaxed">
                  {siteConfig.address.street}
                  <br />
                  {siteConfig.address.zip} {siteConfig.address.city}
                  <br />
                  {siteConfig.address.region}
                </address>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-label text-ink/45">
                  Téléphone
                </span>
                <a href={`tel:${tel}`} className="w-fit text-[15px] hover:text-field">
                  {siteConfig.contactPhone}
                </a>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-label text-ink/45">
                  E-mail
                </span>
                <a
                  href={`mailto:${siteConfig.contactEmail}`}
                  className="w-fit text-[15px] hover:text-field"
                >
                  {siteConfig.contactEmail}
                </a>
              </div>
            </Reveal>

            <Reveal delay={160}>
              <div className="aspect-[4/3] w-full overflow-hidden border border-bone">
                <iframe
                  src={mapsEmbedUrl}
                  title={`Localisation ${siteConfig.legalName}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="size-full"
                />
              </div>
            </Reveal>

            <Reveal delay={220} className="border-t border-bone pt-8">
              <p className="max-w-measure text-[14px] leading-relaxed text-ink/65">
                Déjà client ? Vos offres, vos commandes et vos factures sont dans
                l&apos;espace professionnel.
              </p>
              <Link
                href={siteConfig.orderAppUrl}
                className="mt-4 inline-flex h-11 items-center border border-ink/25 px-6 text-[11px] font-semibold uppercase tracking-label transition-colors hover:border-ink"
              >
                Espace commande
              </Link>
            </Reveal>
          </div>

          {/* ── Formulaire ───────────────────────────────────────────── */}
          <div className="lg:col-span-6 lg:col-start-7">
            <Reveal>
              <p className="text-[11px] font-medium uppercase tracking-label text-field">
                Formulaire
              </p>
              <h2 className="mt-4 font-display text-[clamp(1.85rem,4.5vw,3rem)] font-black uppercase leading-[0.92] tracking-tightest">
                Écrivez-nous
              </h2>
            </Reveal>

            <Reveal delay={100} className="mt-8 block">
              <ContactForm />
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}
