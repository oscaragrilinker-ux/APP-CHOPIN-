import Link from 'next/link'
import { Logo } from './Logo'
import { siteConfig } from '@/site.config'

const navLinks = [
  { href: '/',         label: 'Accueil' },
  { href: '/usine',    label: "L'atelier" },
  { href: '/histoire', label: 'Histoire' },
  { href: '/produits', label: 'Produits' },
  { href: '/contact',  label: 'Contact' },
]

export function Footer() {
  const year = new Date().getFullYear()
  const tel = siteConfig.contactPhone.replace(/\s/g, '')

  return (
    <footer className="bg-night text-paper/70" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">

          {/* Enseigne et adresse */}
          <div className="flex flex-col gap-6 lg:col-span-5">
            <Logo variant="footer" scheme="light" />
            <address className="flex flex-col gap-3 not-italic text-[14px] leading-relaxed">
              <span>
                {siteConfig.address.street}
                <br />
                {siteConfig.address.zip} {siteConfig.address.city}
                <br />
                {siteConfig.address.region}
              </span>
              <a href={`tel:${tel}`} className="w-fit hover:text-paper">
                {siteConfig.contactPhone}
              </a>
              <a href={`mailto:${siteConfig.contactEmail}`} className="w-fit hover:text-paper">
                {siteConfig.contactEmail}
              </a>
            </address>
          </div>

          {/* Navigation */}
          <nav aria-label="Navigation pied de page" className="lg:col-span-3">
            <p className="text-[10px] font-semibold uppercase tracking-label text-field">
              Le site
            </p>
            <ul className="mt-5 flex flex-col gap-2.5">
              {navLinks.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[14px] hover:text-paper">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Produits — remplace les anciens « engagements », qui ne
              disaient rien de vérifiable. */}
          <div className="lg:col-span-4">
            <p className="text-[10px] font-semibold uppercase tracking-label text-field">
              Ce que nous travaillons
            </p>
            <ul className="mt-5 flex flex-col gap-2.5">
              {siteConfig.products.map(produit => (
                <li key={produit.slug}>
                  <Link
                    href={`/produits#${produit.slug}`}
                    className="text-[14px] hover:text-paper"
                  >
                    {produit.name}
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              href={siteConfig.orderAppUrl}
              className="mt-7 inline-flex h-11 items-center border border-paper/30 px-6 text-[11px] font-semibold uppercase tracking-label text-paper transition-colors hover:border-paper"
            >
              Espace commande
            </Link>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-paper/12 pt-6 text-[11px] text-paper/40 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {siteConfig.legalName} — {siteConfig.address.city}
          </p>
          <p>{siteConfig.baseline}</p>
        </div>
      </div>
    </footer>
  )
}
