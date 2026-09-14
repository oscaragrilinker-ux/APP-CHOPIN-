import type { Metadata } from 'next'
import { Anton, Archivo, Caveat } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'
import { BRAND } from '@/lib/brand'

// Même trio que le site public : Archivo pour lire, Anton pour titrer,
// Caveat pour la rare note à la main.
const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  weight: ['400', '500', '600', '700'],
})

const anton = Anton({
  subsets: ['latin'],
  variable: '--font-anton',
  weight: ['400'],
})

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
  weight: ['500', '600'],
})

export const metadata: Metadata = {
  title: BRAND.name,
  description: `Gestion des offres, commandes et facturation — ${BRAND.legalName}`,
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${archivo.variable} ${anton.variable} ${caveat.variable}`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
