// Wrapper Brevo — e-mail transactionnel et SMS.
//
// Brevo porte les deux canaux sur la même clé, ce que réclame le parcours
// d'invitation : le lien part « par mail ou message » selon le contact.
//
// L'API REST est appelée directement plutôt que via @getbrevo/brevo : le SDK
// expose un typage généré qui cadre mal avec le strict du projet, pour un
// bénéfice nul sur deux endpoints.

import { renderAsync } from '@react-email/render'

const BREVO_API = 'https://api.brevo.com/v3'

type Sender = { email: string; name?: string }

/** Accepte « Nom <adresse@domaine> » aussi bien qu'une adresse nue. */
function parseSender(raw: string): Sender {
  const match = raw.match(/^\s*(.*?)\s*<\s*([^>]+?)\s*>\s*$/)
  if (!match) return { email: raw.trim() }
  const [, name, email] = match
  return name ? { name, email } : { email }
}

function requireEnv(name: 'BREVO_API_KEY' | 'BREVO_FROM_EMAIL'): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} n'est pas renseignée : envoi impossible.`)
  return value
}

type BrevoFailure = { code?: string; message?: string }

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${BREVO_API}${path}`, {
    method: 'POST',
    headers: {
      'api-key': requireEnv('BREVO_API_KEY'),
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
    // Next.js instrumente fetch() et mettrait en cache la réponse : un second
    // envoi identique serait alors silencieusement escamoté.
    cache: 'no-store',
  })

  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as BrevoFailure | null
    const reason = detail?.message ?? `HTTP ${response.status}`
    console.error('[brevo] envoi refusé', {
      path,
      status: response.status,
      code: detail?.code,
      reason,
    })
    throw new Error(`Envoi Brevo échoué : ${reason}`)
  }

  return (await response.json()) as T
}

type SendEmailParams = {
  to: string | string[]
  subject: string
  react: React.ReactElement
}

/**
 * Les templates React Email sont rendus ici en HTML et en texte : Brevo attend
 * du balisage, pas un élément React.
 */
export async function sendEmail({
  to,
  subject,
  react,
}: SendEmailParams): Promise<{ messageId: string }> {
  const [htmlContent, textContent] = await Promise.all([
    renderAsync(react),
    renderAsync(react, { plainText: true }),
  ])

  return post<{ messageId: string }>('/smtp/email', {
    sender: parseSender(requireEnv('BREVO_FROM_EMAIL')),
    to: (Array.isArray(to) ? to : [to]).map(email => ({ email })),
    subject,
    htmlContent,
    textContent,
  })
}

/**
 * Brevo veut un numéro international sans « + » ni séparateur. On tolère les
 * formats saisis à la main côté back-office, France par défaut.
 */
export function normalizePhone(raw: string, countryCode = '33'): string {
  const digits = raw.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return digits.slice(1)
  if (digits.startsWith('00')) return digits.slice(2)
  if (digits.startsWith('0')) return countryCode + digits.slice(1)
  return digits
}

type SendSmsParams = {
  to: string
  content: string
}

/**
 * Le nom d'expéditeur SMS est alphanumérique et limité à 11 caractères par les
 * opérateurs ; il doit être déclaré côté Brevo avant tout envoi.
 */
export async function sendSms({
  to,
  content,
}: SendSmsParams): Promise<{ messageId: number }> {
  return post<{ messageId: number }>('/transactionalSMS/sms', {
    sender: process.env.BREVO_SMS_SENDER || 'FermeChopin',
    recipient: normalizePhone(to),
    content,
    type: 'transactional',
  })
}
