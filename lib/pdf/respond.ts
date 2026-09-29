import type React from 'react'
import { renderToStream } from '@react-pdf/renderer'
import { Readable } from 'stream'

/**
 * Transforme un document @react-pdf en réponse HTTP diffusée en continu.
 *
 * `inline` : le navigateur ouvre le PDF dans l'onglet ; le nom de fichier
 * sert quand l'utilisateur l'enregistre. Aucun cache : un document se
 * régénère à chaque demande depuis les données du moment.
 */
export async function pdfResponse(element: React.ReactElement, filename: string): Promise<Response> {
  const stream = await renderToStream(element)
  const safe = filename.replace(/[^\w.\-]+/g, '_')
  return new Response(Readable.toWeb(stream as Readable) as ReadableStream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${safe}"`,
      'Cache-Control': 'no-store',
    },
  })
}

/** Réponse texte pour les refus, cohérente entre toutes les routes de documents. */
export function refuse(message: string, status: 400 | 401 | 403 | 404 = 404): Response {
  return new Response(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
