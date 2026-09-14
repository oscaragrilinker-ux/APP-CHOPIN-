import type { Metadata } from 'next'
import { Anton, Archivo, Caveat } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Buttage } from '@/components/Buttage'
import { siteConfig } from '@/site.config'

// Une seule superfamille, du régulier au noir : le contraste de graisse
// porte la hiérarchie, sans second caractère décoratif.
const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-archivo',
  display: 'swap',
})

// Anton : gothique condensée grasse, dessinée pour l'affiche. Même famille
// de formes que les caractères d'enseigne agricole et de caisse pochoirée.
// Les bords sont érodés en CSS (filtre « rugueux »), faute d'une coupe
// distressed libre de droits.
const anton = Anton({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-anton',
  display: 'swap',
})

// Caveat : le manuscrit de contrepoint, employé au compte-gouttes.
const caveat = Caveat({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-caveat',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(`https://${siteConfig.domain}`),
  title: {
    default: 'La Ferme des Chopin — Pommes de terre & oignons | Hauts-de-France',
    template: '%s | La Ferme des Chopin',
  },
  description:
    "Née d'une ferme d'endives du Cambrésis, la maison trie, calibre et conditionne pommes de terre et oignons pour les professionnels des Hauts-de-France.",
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'La Ferme des Chopin',
  },
  other: {
    'application/ld+json': JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: siteConfig.legalName,
      address: {
        '@type': 'PostalAddress',
        streetAddress: siteConfig.address.street,
        postalCode: siteConfig.address.zip,
        addressLocality: siteConfig.address.city,
        addressRegion: siteConfig.address.region,
        addressCountry: siteConfig.address.country,
      },
      telephone: siteConfig.contactPhone,
      email: siteConfig.contactEmail,
    }),
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${archivo.variable} ${anton.variable} ${caveat.variable}`}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>
        {/* Érosion des bords de titre : une turbulence déplace légèrement
            les contours, comme une impression sur papier absorbant. */}
        <svg width="0" height="0" aria-hidden focusable="false" className="absolute">
          <filter id="rugueux" x="-2%" y="-2%" width="104%" height="104%">
            <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="3" seed="7" result="bruit" />
            <feDisplacementMap in="SourceGraphic" in2="bruit" scale="1.7" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>

        <Buttage />
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
