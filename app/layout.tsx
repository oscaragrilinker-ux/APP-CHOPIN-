import type { Metadata } from 'next'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-cormorant',
  weight: ['500', '600'],
})

export const metadata: Metadata = {
  title: 'Chopin Conditionnement',
  description: 'Gestion des offres, commandes et facturation — SCEA Chopin Conditionnement',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} ${cormorant.variable}`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
